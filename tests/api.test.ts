import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test, { type TestContext } from 'node:test';

import { createApp } from '../server';
import {
  createInMemoryPersistence,
  type WorkshopPersistence,
} from '../server/persistence';
import {
  createOperatorAuthenticator,
  OperatorAuthenticationError,
  type OperatorAuthenticator,
} from '../server/operator-auth';
import { createStartupPersistence } from '../server/persistence-selection';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_MECHANICS,
  INITIAL_VEHICLES,
} from '../src/data/presetData';
import type {
  ActivityLog,
  Announcement,
  Mechanic,
  VehicleRecord,
} from '../src/types';

interface AppSnapshot {
  vehicles: VehicleRecord[];
  mechanics: Mechanic[];
  announcements: Announcement[];
  activityLogs: ActivityLog[];
}

interface TestServer {
  baseUrl: string;
  server: Server;
  readers: ReadableStreamDefaultReader<Uint8Array>[];
  abortControllers: AbortController[];
}

const nativeFetch = globalThis.fetch.bind(globalThis);
async function fetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !headers.has('authorization')) {
    headers.set('Authorization', 'Bearer test-admin-token');
  }
  return nativeFetch(input, { ...init, headers });
}

const testAuthenticator: OperatorAuthenticator = async (idToken) => {
  if (idToken === 'test-invalid-token') {
    throw new OperatorAuthenticationError(401, 'Invalid or expired authentication token.');
  }
  if (idToken === 'test-inactive-token') {
    throw new OperatorAuthenticationError(403, 'An active workshop operator account is required.');
  }
  if (idToken === 'test-unavailable-token') {
    throw new OperatorAuthenticationError(503, 'Operator verification is temporarily unavailable.');
  }
  if (idToken === 'test-admin-token') {
    return {
      uid: 'test-admin-uid',
      email: 'admin@example.test',
      name: 'Test Admin',
      role: 'admin',
      active: true,
    };
  }
  if (idToken === 'test-mechanic-token') {
    return {
      uid: 'test-mechanic-uid',
      email: 'mechanic@example.test',
      name: 'Test Mechanic',
      role: 'mechanic',
      active: true,
    };
  }
  throw new OperatorAuthenticationError(401, 'Invalid or expired authentication token.');
};

function createPresetPersistence(options: { initialMechanics?: Mechanic[] } = {}) {
  return createInMemoryPersistence({
    initialVehicles: INITIAL_VEHICLES,
    initialMechanics: options.initialMechanics ?? INITIAL_MECHANICS,
    initialAnnouncements: INITIAL_ANNOUNCEMENTS,
    initialActivityLogs: [
      {
        id: 'fixture-log-1',
        vehicleId: 'v-106',
        plateNumber: 'PNG 883',
        action: 'Status updated to Service Completed',
        previousStatus: 'in_progress',
        newStatus: 'completed',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        operatorName: 'Master Azman',
      },
      {
        id: 'fixture-log-2',
        vehicleId: 'v-107',
        plateNumber: 'ND 5512',
        action: 'Status updated to Service Completed',
        previousStatus: 'in_progress',
        newStatus: 'completed',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        operatorName: 'Technician Hafiz',
      },
    ],
  });
}

interface SseConnection {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
  pending: string;
}

async function createTestServer(
  context: TestContext,
  persistence?: WorkshopPersistence,
  authenticateOperator: OperatorAuthenticator = testAuthenticator
): Promise<TestServer> {
  const server = createServer(createApp(
    persistence ?? createPresetPersistence(),
    authenticateOperator
  ));

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Test server did not bind to a TCP address.');
  }

  const fixture: TestServer = {
    baseUrl: `http://127.0.0.1:${address.port}`,
    server,
    readers: [],
    abortControllers: [],
  };

  context.after(async () => {
    for (const controller of fixture.abortControllers) {
      controller.abort();
    }
    for (const reader of fixture.readers) {
      await reader.cancel().catch(() => undefined);
      try {
        reader.releaseLock();
      } catch {
        // A pending read can keep the lock until cancellation settles.
      }
    }
    if (fixture.server.listening) {
      const closePromise = new Promise<void>((resolve, reject) => {
        fixture.server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      fixture.server.closeAllConnections();
      await closePromise;
    }
  });

  return fixture;
}

async function getSnapshot(baseUrl: string): Promise<AppSnapshot> {
  const response = await fetch(`${baseUrl}/api/vehicles`);
  assert.equal(response.status, 200);

  const body: unknown = await response.json();
  assert.ok(body && typeof body === 'object');
  assert.deepEqual(Object.keys(body).sort(), [
    'activityLogs',
    'announcements',
    'mechanics',
    'vehicles',
  ]);

  const snapshot = body as AppSnapshot;
  assert.ok(Array.isArray(snapshot.vehicles));
  assert.ok(Array.isArray(snapshot.mechanics));
  assert.ok(Array.isArray(snapshot.announcements));
  assert.ok(Array.isArray(snapshot.activityLogs));
  return snapshot;
}

async function getAnnouncements(baseUrl: string): Promise<Announcement[]> {
  const response = await fetch(`${baseUrl}/api/announcements`);
  assert.equal(response.status, 200);

  const body = asRecord(await response.json());
  assert.ok(Array.isArray(body.announcements));
  return body.announcements as Announcement[];
}

async function readSseMessage(
  connection: SseConnection,
  timeoutMs = 3000
): Promise<unknown> {
  const readUntilFrame = async (): Promise<string> => {
    while (true) {
      const frameEnd = connection.pending.indexOf('\n\n');
      if (frameEnd !== -1) {
        const frame = connection.pending.slice(0, frameEnd);
        connection.pending = connection.pending.slice(frameEnd + 2);
        return frame;
      }

      const { value, done } = await connection.reader.read();
      if (done) {
        throw new Error('SSE stream ended before a complete message arrived.');
      }
      connection.pending += connection.decoder.decode(value, { stream: true });
      connection.pending = connection.pending.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
  };

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const frame = await Promise.race([
      readUntilFrame(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Timed out waiting for an SSE message.')),
          timeoutMs
        );
      }),
    ]);

    const data = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');

    assert.notEqual(data, '', 'SSE frame should contain data.');
    return JSON.parse(data);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}

test('startup persistence defaults to isolated in-memory adapters in development and test', async () => {
  const first = createStartupPersistence({ NODE_ENV: 'development' });
  const second = createStartupPersistence({ NODE_ENV: 'test', WORKSHOP_PERSISTENCE: 'memory' });

  await first.createAnnouncement({ text: 'Only in first adapter' });
  const firstAnnouncements = await first.listAnnouncements();
  const secondAnnouncements = await second.listAnnouncements();
  assert.equal(firstAnnouncements.length, secondAnnouncements.length + 1);
  assert.equal(
    secondAnnouncements.some((announcement) => announcement.text === 'ONLY IN FIRST ADAPTER'),
    false
  );
});

test('Firestore startup selection fails closed without Firestore persistence', () => {
  assert.throws(
    () => createStartupPersistence({ WORKSHOP_PERSISTENCE: 'firestore', NODE_ENV: 'test' }),
    /explicit authentication and authorization enablement/
  );
  assert.throws(
    () => createStartupPersistence({
      WORKSHOP_PERSISTENCE: 'firestore',
      NODE_ENV: 'test',
      WORKSHOP_FIRESTORE_AUTHORIZATION: 'disabled',
    }),
    /explicit authentication and authorization enablement/
  );
  assert.throws(
    () => createStartupPersistence({
      WORKSHOP_PERSISTENCE: 'firestore',
      NODE_ENV: 'test',
      WORKSHOP_FIRESTORE_AUTHORIZATION: 'true',
    }),
    /explicit authentication and authorization enablement/
  );
  assert.throws(
    () => createStartupPersistence({
      WORKSHOP_PERSISTENCE: 'firestore',
      WORKSHOP_FIRESTORE_AUTHORIZATION: 'enabled',
    }),
    /requires NODE_ENV/
  );
  assert.throws(
    () => createStartupPersistence({
      WORKSHOP_PERSISTENCE: 'firestore',
      NODE_ENV: 'production',
      WORKSHOP_FIRESTORE_AUTHORIZATION: 'enabled',
    }),
    /Firestore persistence is not implemented/
  );
  assert.throws(
    () => createStartupPersistence({
      WORKSHOP_PERSISTENCE: 'unknown',
      NODE_ENV: 'development',
    }),
    /Unsupported persistence mode/
  );
});

test('production startup requires an explicit supported persistence mode', () => {
  assert.throws(
    () => createStartupPersistence({ NODE_ENV: 'production' }),
    /requires an explicit WORKSHOP_PERSISTENCE/
  );
  for (const mode of ['', 'memory ', 'unknown']) {
    assert.throws(
      () => createStartupPersistence({ NODE_ENV: 'production', WORKSHOP_PERSISTENCE: mode }),
      /Unsupported persistence mode/
    );
  }
  assert.doesNotThrow(
    () => createStartupPersistence({ NODE_ENV: 'production', WORKSHOP_PERSISTENCE: 'memory' })
  );
  assert.throws(
    () => createStartupPersistence({
      NODE_ENV: 'production',
      WORKSHOP_PERSISTENCE: 'firestore',
      WORKSHOP_FIRESTORE_AUTHORIZATION: 'enabled',
    }),
    /Firestore persistence is not implemented/
  );
});

test('startup requires a recognized environment and rejects unknown persistence modes', () => {
  for (const environment of [
    {},
    { WORKSHOP_PERSISTENCE: 'memory' },
    { NODE_ENV: 'staging' },
    { NODE_ENV: 'development', WORKSHOP_PERSISTENCE: 'unknown' },
  ]) {
    assert.throws(
      () => createStartupPersistence(environment),
      /NODE_ENV|Unsupported persistence mode/
    );
  }
});

test('operational startup is empty and the demo reset endpoint is absent', async (context) => {
  const emptySnapshot: AppSnapshot = {
    vehicles: [],
    mechanics: [],
    announcements: [],
    activityLogs: [],
  };
  const startupSnapshot = await createStartupPersistence({ NODE_ENV: 'test' }).getSnapshot();
  assert.deepEqual(startupSnapshot, emptySnapshot);

  const fixture = await createTestServer(context, createInMemoryPersistence());
  const resetResponse = await fetch(`${fixture.baseUrl}/api/reset`, { method: 'POST' });
  assert.equal(resetResponse.status, 404);
  assert.deepEqual(await getSnapshot(fixture.baseUrl), emptySnapshot);
});

test('GET /api/vehicles returns the combined snapshot envelope', async (context) => {
  const fixture = await createTestServer(context);
  const snapshot = await getSnapshot(fixture.baseUrl);

  assert.ok(snapshot.vehicles.length > 0);
  assert.ok(snapshot.mechanics.length > 0);
  assert.ok(snapshot.announcements.length > 0);
  assert.ok(snapshot.activityLogs.length > 0);
});

test('public reads remain available while protected mutations fail closed on authentication errors', async (context) => {
  const fixture = await createTestServer(context);
  assert.equal((await nativeFetch(`${fixture.baseUrl}/api/vehicles`)).status, 200);
  assert.equal((await nativeFetch(`${fixture.baseUrl}/api/announcements`)).status, 200);

  const mutation = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerName: 'Authentication Test',
      plateNumber: 'AUTH 1',
      vehicleMake: 'Test',
    }),
  };
  for (const [authorization, expectedStatus] of [
    ['', 401],
    ['Bearer test-invalid-token', 401],
    ['Bearer test-inactive-token', 403],
    ['Bearer test-unavailable-token', 503],
  ] as const) {
    const response = await nativeFetch(`${fixture.baseUrl}/api/vehicles`, {
      ...mutation,
      headers: { ...mutation.headers, Authorization: authorization },
    });
    assert.equal(response.status, expectedStatus);
  }

  const after = await getSnapshot(fixture.baseUrl);
  assert.equal(after.vehicles.some((vehicle) => vehicle.plateNumber === 'AUTH 1'), false);
});

test('authentication failures return fail-closed HTTP responses without Firebase access', async (context) => {
  const authenticateVerifiedToken = createOperatorAuthenticator({
    async verifyIdToken(idToken) {
      if (idToken === 'invalid') {
        throw Object.assign(new Error('Invalid token'), { code: 'auth/invalid-id-token' });
      }
      if (idToken === 'verifier-error') {
        throw new Error('Token verifier unavailable.');
      }
      return { uid: idToken, email: `${idToken}@example.test` };
    },
    async getOperatorDocument(uid) {
      if (uid === 'missing') return null;
      if (uid === 'inactive') return { active: false, role: 'mechanic' };
      if (uid === 'unsupported') return { active: true, role: 'viewer' };
      return { active: true, role: 'mechanic' };
    },
  });
  const authenticate: OperatorAuthenticator = async (idToken) => {
    if (idToken === 'configuration-error') {
      throw new Error('Firebase Admin configuration is invalid.');
    }
    return authenticateVerifiedToken(idToken);
  };
  const fixture = await createTestServer(context, createPresetPersistence(), authenticate);
  const url = `${fixture.baseUrl}/api/vehicles`;
  const payload = JSON.stringify({
    ownerName: 'Authentication Failure',
    plateNumber: 'AUTH 2',
    vehicleMake: 'Test',
  });
  const cases: Array<{ authorization?: string; status: number }> = [
    { status: 401 },
    { authorization: 'Bearer', status: 401 },
    { authorization: 'Basic invalid', status: 401 },
    { authorization: 'Bearer invalid', status: 401 },
    { authorization: 'Bearer missing', status: 403 },
    { authorization: 'Bearer inactive', status: 403 },
    { authorization: 'Bearer unsupported', status: 403 },
    { authorization: 'Bearer verifier-error', status: 503 },
    { authorization: 'Bearer configuration-error', status: 503 },
  ];

  for (const { authorization, status } of cases) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (authorization !== undefined) headers.set('Authorization', authorization);
    const response = await nativeFetch(url, { method: 'POST', headers, body: payload });
    assert.equal(response.status, status, `Authorization: ${authorization ?? '(missing)'}`);
    assert.ok(typeof asRecord(await response.json()).error === 'string');
  }

  assert.equal(
    (await getSnapshot(fixture.baseUrl)).vehicles.some((vehicle) => vehicle.plateNumber === 'AUTH 2'),
    false
  );
});

test('admin and mechanic roles cover every vehicle and announcement mutation route', async (context) => {
  const fixture = await createTestServer(context);
  const requestAs = (token: string, init: RequestInit = {}): RequestInit => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
  };
  const vehiclePayload = (plateNumber: string) => ({
    ownerName: 'RBAC Matrix',
    plateNumber,
    vehicleMake: 'Test',
  });

  const adminCreate = await fetch(
    `${fixture.baseUrl}/api/vehicles`,
    requestAs('test-admin-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vehiclePayload('RBAC ADMIN'), mechanicId: 'mech-1' }),
    })
  );
  assert.equal(adminCreate.status, 201);
  const adminVehicle = asRecord(asRecord(await adminCreate.json()).vehicle);
  const adminVehicleId = String(adminVehicle.id);
  assert.equal(adminVehicle.mechanicId, 'mech-1');

  const mechanicCreate = await fetch(
    `${fixture.baseUrl}/api/vehicles`,
    requestAs('test-mechanic-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehiclePayload('RBAC MECHANIC')),
    })
  );
  assert.equal(mechanicCreate.status, 201);
  const mechanicVehicle = asRecord(asRecord(await mechanicCreate.json()).vehicle);
  const mechanicVehicleId = String(mechanicVehicle.id);

  const mechanicAssignmentOnCreate = await fetch(
    `${fixture.baseUrl}/api/vehicles`,
    requestAs('test-mechanic-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vehiclePayload('RBAC DENIED'), mechanicId: 'mech-2' }),
    })
  );
  assert.equal(mechanicAssignmentOnCreate.status, 403);

  const mechanicAssignmentOnUpdate = await fetch(
    `${fixture.baseUrl}/api/vehicles/${adminVehicleId}`,
    requestAs('test-mechanic-token', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanicId: 'mech-2' }),
    })
  );
  assert.equal(mechanicAssignmentOnUpdate.status, 403);

  const adminUpdate = await fetch(
    `${fixture.baseUrl}/api/vehicles/${adminVehicleId}`,
    requestAs('test-admin-token', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress', tasks: [{ id: 'admin-task', title: 'Inspect', completed: false }] }),
    })
  );
  assert.equal(adminUpdate.status, 200);

  const mechanicUpdate = await fetch(
    `${fixture.baseUrl}/api/vehicles/${mechanicVehicleId}`,
    requestAs('test-mechanic-token', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'mechanic update', tasks: [{ id: 'mechanic-task', title: 'Inspect', completed: false }] }),
    })
  );
  assert.equal(mechanicUpdate.status, 200);

  const mechanicDelete = await fetch(
    `${fixture.baseUrl}/api/vehicles/${mechanicVehicleId}`,
    requestAs('test-mechanic-token', { method: 'DELETE' })
  );
  assert.equal(mechanicDelete.status, 200);
  const adminDelete = await fetch(
    `${fixture.baseUrl}/api/vehicles/${adminVehicleId}`,
    requestAs('test-admin-token', { method: 'DELETE' })
  );
  assert.equal(adminDelete.status, 200);

  const mechanicAnnouncementCreate = await fetch(
    `${fixture.baseUrl}/api/announcements`,
    requestAs('test-mechanic-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'forbidden mechanic announcement' }),
    })
  );
  assert.equal(mechanicAnnouncementCreate.status, 403);
  const existingAnnouncementId = (await getAnnouncements(fixture.baseUrl))[0].id;
  const mechanicAnnouncementUpdate = await fetch(
    `${fixture.baseUrl}/api/announcements/${existingAnnouncementId}`,
    requestAs('test-mechanic-token', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'forbidden update' }),
    })
  );
  assert.equal(mechanicAnnouncementUpdate.status, 403);
  const mechanicAnnouncementDelete = await fetch(
    `${fixture.baseUrl}/api/announcements/${existingAnnouncementId}`,
    requestAs('test-mechanic-token', { method: 'DELETE' })
  );
  assert.equal(mechanicAnnouncementDelete.status, 403);

  const adminAnnouncementCreate = await fetch(
    `${fixture.baseUrl}/api/announcements`,
    requestAs('test-admin-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'admin announcement' }),
    })
  );
  assert.equal(adminAnnouncementCreate.status, 201);
  const announcement = asRecord(asRecord(await adminAnnouncementCreate.json()).announcement);
  const adminAnnouncementUpdate = await fetch(
    `${fixture.baseUrl}/api/announcements/${announcement.id}`,
    requestAs('test-admin-token', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'updated by admin', active: false }),
    })
  );
  assert.equal(adminAnnouncementUpdate.status, 200);
  const adminAnnouncementDelete = await fetch(
    `${fixture.baseUrl}/api/announcements/${announcement.id}`,
    requestAs('test-admin-token', { method: 'DELETE' })
  );
  assert.equal(adminAnnouncementDelete.status, 200);
});

test('vehicle payloads reject forged fields and derive audit attribution from the verified operator', async (context) => {
  const fixture = await createTestServer(context);
  const requestAsMechanic = (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', 'Bearer test-mechanic-token');
    return fetch(url, { ...init, headers });
  };
  const createPayload = {
    ownerName: 'Attribution Test',
    plateNumber: 'ATTRIB 1',
    vehicleMake: 'Test',
  };

  for (const field of ['id', 'status', 'operatorName', 'operatorUid', 'createdBy']) {
    const response = await requestAsMechanic(`${fixture.baseUrl}/api/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createPayload, [field]: 'forged-value' }),
    });
    assert.equal(response.status, 400, `Create payload should reject ${field}`);
  }

  for (const field of ['id', 'lastUpdated', 'operatorName', 'operatorUid', 'updatedBy']) {
    const response = await requestAsMechanic(`${fixture.baseUrl}/api/vehicles/v-101`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'forged update', [field]: 'forged-value' }),
    });
    assert.equal(response.status, 400, `Update payload should reject ${field}`);
  }

  const createResponse = await requestAsMechanic(`${fixture.baseUrl}/api/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload),
  });
  assert.equal(createResponse.status, 201);
  const created = asRecord(await createResponse.json());
  const vehicle = asRecord(created.vehicle);
  const createLog = asRecord(created.log);
  assert.equal(createLog.operatorName, 'Test Mechanic');

  const updateResponse = await requestAsMechanic(`${fixture.baseUrl}/api/vehicles/${vehicle.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'verified operator update' }),
  });
  assert.equal(updateResponse.status, 200);
  const updateLog = asRecord(asRecord(await updateResponse.json()).log);
  assert.equal(updateLog.operatorName, 'Test Mechanic');

  const deleteResponse = await requestAsMechanic(`${fixture.baseUrl}/api/vehicles/${vehicle.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 200);
  const deletedSnapshot = await getSnapshot(fixture.baseUrl);
  assert.ok(deletedSnapshot.activityLogs.some(
    (log) => log.vehicleId === vehicle.id && log.operatorName === 'Test Mechanic'
  ));
});

test('public snapshot and SSE payloads exclude private operator account data', async (context) => {
  const privateValues = [
    'private-operator-uid-marker',
    'private-operator-email-marker',
    'private-account-token-marker',
    'private-account-secret-marker',
  ];
  const privateMetadata = {
    email: privateValues[1],
    uid: privateValues[0],
    refreshToken: privateValues[2],
    accountSecret: privateValues[3],
  };
  const authenticate: OperatorAuthenticator = async () => ({
    uid: privateMetadata.uid,
    email: privateMetadata.email,
    name: 'Verified Public Audit Name',
    role: 'mechanic',
    active: true,
    ...privateMetadata,
  });
  const fixture = await createTestServer(context, createPresetPersistence(), authenticate);

  const snapshotResponse = await nativeFetch(`${fixture.baseUrl}/api/vehicles`);
  assert.equal(snapshotResponse.status, 200);
  const snapshotText = await snapshotResponse.text();
  for (const privateValue of privateValues) {
    assert.equal(snapshotText.includes(privateValue), false);
  }

  const controller = new AbortController();
  fixture.abortControllers.push(controller);
  const streamResponse = await nativeFetch(`${fixture.baseUrl}/api/events`, {
    signal: controller.signal,
  });
  assert.ok(streamResponse.body);
  const connection: SseConnection = {
    reader: streamResponse.body.getReader(),
    decoder: new TextDecoder(),
    pending: '',
  };
  fixture.readers.push(connection.reader);
  assert.equal(asRecord(await readSseMessage(connection)).type, 'CONNECTED');

  const createResponse = await nativeFetch(`${fixture.baseUrl}/api/vehicles`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer private-test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ownerName: 'Public Payload Test',
      plateNumber: 'PUBLIC 1',
      vehicleMake: 'Test',
    }),
  });
  assert.equal(createResponse.status, 201);
  const eventText = JSON.stringify(await readSseMessage(connection));
  assert.ok(eventText.includes('Verified Public Audit Name'));
  for (const privateValue of privateValues) {
    assert.equal(eventText.includes(privateValue), false);
  }
});

test('admin and mechanic API permissions are enforced for vehicle and announcement mutations', async (context) => {
  const fixture = await createTestServer(context);
  const requestAs = (token: string, init: RequestInit = {}): RequestInit => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
  };
  const vehiclePayload = {
    ownerName: 'RBAC Test',
    plateNumber: 'RBAC 1',
    vehicleMake: 'Test',
  };

  const mechanicCreate = await fetch(
    `${fixture.baseUrl}/api/vehicles`,
    requestAs('test-mechanic-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehiclePayload),
    })
  );
  assert.equal(mechanicCreate.status, 201);
  const mechanicVehicle = asRecord(asRecord(await mechanicCreate.json()).vehicle);
  const mechanicVehicleId = String(mechanicVehicle.id);
  assert.equal(mechanicVehicle.ownerName, 'RBAC Test');

  const mechanicAssignmentOnCreate = await fetch(
    `${fixture.baseUrl}/api/vehicles`,
    requestAs('test-mechanic-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vehiclePayload, plateNumber: 'RBAC 2', mechanicId: 'mech-1' }),
    })
  );
  assert.equal(mechanicAssignmentOnCreate.status, 403);

  const mechanicAssignmentOnUpdate = await fetch(
    `${fixture.baseUrl}/api/vehicles/v-101`,
    requestAs('test-mechanic-token', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanicId: 'mech-2' }),
    })
  );
  assert.equal(mechanicAssignmentOnUpdate.status, 403);

  const mechanicUpdate = await fetch(
    `${fixture.baseUrl}/api/vehicles/${mechanicVehicleId}`,
    requestAs('test-mechanic-token', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'updated by mechanic' }),
    })
  );
  assert.equal(mechanicUpdate.status, 200);

  const mechanicDelete = await fetch(
    `${fixture.baseUrl}/api/vehicles/${mechanicVehicleId}`,
    requestAs('test-mechanic-token', { method: 'DELETE' })
  );
  assert.equal(mechanicDelete.status, 200);
  const deletedVehicle = await getSnapshot(fixture.baseUrl);
  assert.ok(deletedVehicle.activityLogs.some((log) => log.operatorName === 'Test Mechanic'));

  const mechanicAnnouncementCreate = await fetch(
    `${fixture.baseUrl}/api/announcements`,
    requestAs('test-mechanic-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'forbidden' }),
    })
  );
  assert.equal(mechanicAnnouncementCreate.status, 403);
  const existingAnnouncementId = (await getAnnouncements(fixture.baseUrl))[0].id;
  for (const [url, init] of [
    [
      `${fixture.baseUrl}/api/announcements/${existingAnnouncementId}`,
      requestAs('test-mechanic-token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'forbidden update' }),
      }),
    ],
    [
      `${fixture.baseUrl}/api/announcements/${existingAnnouncementId}`,
      requestAs('test-mechanic-token', { method: 'DELETE' }),
    ],
  ] as const) {
    assert.equal((await fetch(url, init)).status, 403);
  }

  const adminAssignment = await fetch(
    `${fixture.baseUrl}/api/vehicles/v-101`,
    requestAs('test-admin-token', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanicId: 'mech-2' }),
    })
  );
  assert.equal(adminAssignment.status, 200);

  const adminAnnouncement = await fetch(
    `${fixture.baseUrl}/api/announcements`,
    requestAs('test-admin-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'admin announcement' }),
    })
  );
  assert.equal(adminAnnouncement.status, 201);
});

test('vehicle validation and CRUD response envelopes', async (context) => {
  const fixture = await createTestServer(context);

  for (const body of [
    { plateNumber: 'TEST 1', vehicleMake: 'Test' },
    { ownerName: 'Test Owner', vehicleMake: 'Test' },
    { ownerName: 'Test Owner', plateNumber: 'TEST 1' },
  ]) {
    const response = await fetch(`${fixture.baseUrl}/api/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'Owner name, plate number, and vehicle make are required.',
    });
  }

  const createPayload = {
    ownerName: 'Test Owner',
    ownerPhone: '555-0100',
    plateNumber: 'test 123',
    vehicleMake: 'Test Make',
    vehicleModel: 'Test Model',
    serviceType: 'Inspection',
    notes: 'Created by characterization test',
    priority: 'express',
  };
  const createResponse = await fetch(`${fixture.baseUrl}/api/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload),
  });
  assert.equal(createResponse.status, 201);
  const createdBody = asRecord(await createResponse.json());
  assert.deepEqual(Object.keys(createdBody).sort(), ['log', 'vehicle']);
  const createdVehicle = asRecord(createdBody.vehicle);
  const createdLog = asRecord(createdBody.log);
  assert.equal(typeof createdVehicle.id, 'string');
  assert.equal(createdVehicle.ownerName, createPayload.ownerName);
  assert.equal(createdVehicle.ownerPhone, createPayload.ownerPhone);
  assert.equal(createdVehicle.plateNumber, 'TEST 123');
  assert.equal(createdVehicle.vehicleMake, createPayload.vehicleMake);
  assert.equal(createdVehicle.vehicleModel, createPayload.vehicleModel);
  assert.equal(createdVehicle.serviceType, createPayload.serviceType);
  assert.equal(createdVehicle.notes, createPayload.notes);
  assert.equal(createdVehicle.priority, createPayload.priority);
  assert.equal(createdVehicle.status, 'incoming');
  assert.equal(createdLog.vehicleId, createdVehicle.id);

  const vehicleId = String(createdVehicle.id);
  const afterCreate = await getSnapshot(fixture.baseUrl);
  const listedCreatedVehicle = afterCreate.vehicles.find((vehicle) => vehicle.id === vehicleId);
  assert.ok(listedCreatedVehicle);
  assert.equal(listedCreatedVehicle.plateNumber, 'TEST 123');
  assert.equal(listedCreatedVehicle.ownerName, createPayload.ownerName);
  assert.equal(listedCreatedVehicle.vehicleModel, createPayload.vehicleModel);
  assert.ok(afterCreate.activityLogs.some((log) => log.id === createdLog.id));

  const updatePayload = {
    notes: 'Updated by characterization test',
    bayNumber: 'Bay 09',
  };
  const updateResponse = await fetch(
    `${fixture.baseUrl}/api/vehicles/${encodeURIComponent(vehicleId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    }
  );
  assert.equal(updateResponse.status, 200);
  const updatedBody = asRecord(await updateResponse.json());
  assert.deepEqual(Object.keys(updatedBody).sort(), ['log', 'vehicle']);
  assert.equal(asRecord(updatedBody.vehicle).notes, updatePayload.notes);
  assert.equal(asRecord(updatedBody.vehicle).bayNumber, updatePayload.bayNumber);
  const afterUpdate = await getSnapshot(fixture.baseUrl);
  const listedUpdatedVehicle = afterUpdate.vehicles.find((vehicle) => vehicle.id === vehicleId);
  assert.ok(listedUpdatedVehicle);
  assert.equal(listedUpdatedVehicle.notes, updatePayload.notes);
  assert.equal(listedUpdatedVehicle.bayNumber, updatePayload.bayNumber);

  const deleteResponse = await fetch(
    `${fixture.baseUrl}/api/vehicles/${encodeURIComponent(vehicleId)}`,
    { method: 'DELETE' }
  );
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    success: true,
    vehicleId,
  });
  const afterDelete = await getSnapshot(fixture.baseUrl);
  assert.equal(afterDelete.vehicles.some((vehicle) => vehicle.id === vehicleId), false);
  assert.ok(afterDelete.activityLogs.some(
    (log) => log.vehicleId === vehicleId && log.action === 'Removed vehicle from active queue'
  ));

  const missingUpdateResponse = await fetch(`${fixture.baseUrl}/api/vehicles/missing-vehicle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'missing' }),
  });
  assert.equal(missingUpdateResponse.status, 404);
  assert.deepEqual(await missingUpdateResponse.json(), { error: 'Vehicle not found.' });
  const missingDeleteResponse = await fetch(`${fixture.baseUrl}/api/vehicles/missing-vehicle`, {
    method: 'DELETE',
  });
  assert.equal(missingDeleteResponse.status, 404);
  assert.deepEqual(await missingDeleteResponse.json(), { error: 'Vehicle record not found.' });
});

test('announcement listing, validation, CRUD response envelopes', async (context) => {
  const fixture = await createTestServer(context);

  assert.ok((await getAnnouncements(fixture.baseUrl)).length > 0);

  const invalidResponse = await fetch(`${fixture.baseUrl}/api/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(invalidResponse.status, 400);
  assert.deepEqual(await invalidResponse.json(), {
    error: 'Announcement text is required.',
  });

  const createResponse = await fetch(`${fixture.baseUrl}/api/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'test announcement', type: 'promo' }),
  });
  assert.equal(createResponse.status, 201);
  const createdBody = asRecord(await createResponse.json());
  assert.deepEqual(Object.keys(createdBody), ['announcement']);
  const announcement = asRecord(createdBody.announcement);
  assert.equal(typeof announcement.id, 'string');
  assert.equal(announcement.text, 'TEST ANNOUNCEMENT');
  assert.equal(announcement.type, 'promo');
  assert.equal(announcement.active, true);
  const announcementId = String(announcement.id);
  const afterCreateAnnouncements = await getAnnouncements(fixture.baseUrl);
  const listedCreatedAnnouncement = afterCreateAnnouncements.find((item) => item.id === announcementId);
  assert.ok(listedCreatedAnnouncement);
  assert.equal(listedCreatedAnnouncement.text, 'TEST ANNOUNCEMENT');
  assert.equal(listedCreatedAnnouncement.type, 'promo');
  assert.equal(listedCreatedAnnouncement.active, true);

  const updateResponse = await fetch(
    `${fixture.baseUrl}/api/announcements/${encodeURIComponent(announcementId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'updated announcement', type: 'alert', active: false }),
    }
  );
  assert.equal(updateResponse.status, 200);
  const updatedBody = asRecord(await updateResponse.json());
  assert.deepEqual(Object.keys(updatedBody), ['announcement']);
  const updatedAnnouncement = asRecord(updatedBody.announcement);
  assert.equal(updatedAnnouncement.text, 'UPDATED ANNOUNCEMENT');
  assert.equal(updatedAnnouncement.type, 'alert');
  assert.equal(updatedAnnouncement.active, false);
  const afterUpdateAnnouncements = await getAnnouncements(fixture.baseUrl);
  const listedUpdatedAnnouncement = afterUpdateAnnouncements.find((item) => item.id === announcementId);
  assert.ok(listedUpdatedAnnouncement);
  assert.equal(listedUpdatedAnnouncement.text, 'UPDATED ANNOUNCEMENT');
  assert.equal(listedUpdatedAnnouncement.type, 'alert');
  assert.equal(listedUpdatedAnnouncement.active, false);

  const deleteResponse = await fetch(
    `${fixture.baseUrl}/api/announcements/${encodeURIComponent(announcementId)}`,
    { method: 'DELETE' }
  );
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    success: true,
    announcementId,
  });
  assert.equal(
    (await getAnnouncements(fixture.baseUrl)).some((item) => item.id === announcementId),
    false
  );

  const missingDeleteResponse = await fetch(
    `${fixture.baseUrl}/api/announcements/${encodeURIComponent(announcementId)}`,
    { method: 'DELETE' }
  );
  assert.equal(missingDeleteResponse.status, 404);
  assert.deepEqual(await missingDeleteResponse.json(), { error: 'Announcement not found.' });
  const missingUpdateResponse = await fetch(
    `${fixture.baseUrl}/api/announcements/missing-announcement`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'missing' }),
    }
  );
  assert.equal(missingUpdateResponse.status, 404);
  assert.deepEqual(await missingUpdateResponse.json(), { error: 'Announcement not found.' });
});

test('announcement mutations return their full SSE snapshot without a follow-up list read', async (context) => {
  const basePersistence = createPresetPersistence();
  let rejectListRead = false;
  const persistence: WorkshopPersistence = {
    ...basePersistence,
    async listAnnouncements() {
      if (rejectListRead) throw new Error('Unexpected announcement list read.');
      return basePersistence.listAnnouncements();
    },
    async createAnnouncement(input) {
      const result = await basePersistence.createAnnouncement(input);
      rejectListRead = true;
      return result;
    },
    async updateAnnouncement(id, updates) {
      const result = await basePersistence.updateAnnouncement(id, updates);
      rejectListRead = true;
      return result;
    },
    async deleteAnnouncement(id) {
      const result = await basePersistence.deleteAnnouncement(id);
      rejectListRead = true;
      return result;
    },
  };
  const fixture = await createTestServer(context, persistence);
  const controller = new AbortController();
  fixture.abortControllers.push(controller);

  const response = await fetch(`${fixture.baseUrl}/api/events`, {
    signal: controller.signal,
  });
  assert.ok(response.body);
  const connection: SseConnection = {
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    pending: '',
  };
  fixture.readers.push(connection.reader);
  assert.equal(asRecord(await readSseMessage(connection)).type, 'CONNECTED');

  const initialAnnouncements = (await getSnapshot(fixture.baseUrl)).announcements;
  const createResponse = await fetch(`${fixture.baseUrl}/api/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'sse announcement', type: 'promo' }),
  });
  assert.equal(createResponse.status, 201);
  const createdBody = asRecord(await createResponse.json());
  const createdAnnouncement = asRecord(createdBody.announcement);
  assert.deepEqual(Object.keys(createdBody), ['announcement']);
  assert.equal(createdAnnouncement.text, 'SSE ANNOUNCEMENT');
  let snapshot = await getSnapshot(fixture.baseUrl);
  assert.equal(snapshot.announcements.length, initialAnnouncements.length + 1);
  let event = asRecord(await readSseMessage(connection));
  assert.equal(event.type, 'ANNOUNCEMENTS_UPDATED');
  let eventData = asRecord(event.data);
  assert.deepEqual(Object.keys(eventData), ['announcements']);
  assert.deepEqual(eventData.announcements, snapshot.announcements);

  const announcementId = String(createdAnnouncement.id);
  const updateResponse = await fetch(
    `${fixture.baseUrl}/api/announcements/${encodeURIComponent(announcementId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'updated sse announcement', active: false }),
    }
  );
  assert.equal(updateResponse.status, 200);
  const updatedBody = asRecord(await updateResponse.json());
  assert.deepEqual(Object.keys(updatedBody), ['announcement']);
  assert.equal(asRecord(updatedBody.announcement).text, 'UPDATED SSE ANNOUNCEMENT');
  snapshot = await getSnapshot(fixture.baseUrl);
  assert.equal(snapshot.announcements.find((item) => item.id === announcementId)?.active, false);
  event = asRecord(await readSseMessage(connection));
  assert.equal(event.type, 'ANNOUNCEMENTS_UPDATED');
  eventData = asRecord(event.data);
  assert.deepEqual(eventData.announcements, snapshot.announcements);

  const deleteResponse = await fetch(
    `${fixture.baseUrl}/api/announcements/${encodeURIComponent(announcementId)}`,
    { method: 'DELETE' }
  );
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    success: true,
    announcementId,
  });
  snapshot = await getSnapshot(fixture.baseUrl);
  assert.equal(snapshot.announcements.some((item) => item.id === announcementId), false);
  event = asRecord(await readSseMessage(connection));
  assert.equal(event.type, 'ANNOUNCEMENTS_UPDATED');
  eventData = asRecord(event.data);
  assert.deepEqual(eventData.announcements, snapshot.announcements);

  const missingDeleteResponse = await fetch(
    `${fixture.baseUrl}/api/announcements/${encodeURIComponent(announcementId)}`,
    { method: 'DELETE' }
  );
  assert.equal(missingDeleteResponse.status, 404);
  assert.deepEqual(await missingDeleteResponse.json(), { error: 'Announcement not found.' });
  await assert.rejects(
    readSseMessage(connection, 100),
    /Timed out waiting for an SSE message/
  );
});

test('failed announcement mutations do not change state or broadcast', async (context) => {
  const basePersistence = createPresetPersistence();
  const persistence: WorkshopPersistence = {
    ...basePersistence,
    async createAnnouncement() {
      throw new Error('Announcement create failed.');
    },
    async updateAnnouncement() {
      throw new Error('Announcement update failed.');
    },
    async deleteAnnouncement() {
      throw new Error('Announcement delete failed.');
    },
  };
  const fixture = await createTestServer(context, persistence);
  const controller = new AbortController();
  fixture.abortControllers.push(controller);

  const response = await fetch(`${fixture.baseUrl}/api/events`, {
    signal: controller.signal,
  });
  assert.ok(response.body);
  const connection: SseConnection = {
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    pending: '',
  };
  fixture.readers.push(connection.reader);
  assert.equal(asRecord(await readSseMessage(connection)).type, 'CONNECTED');
  const initial = await getSnapshot(fixture.baseUrl);
  const announcementId = initial.announcements[0].id;

  const createResponse = await fetch(`${fixture.baseUrl}/api/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'failed create' }),
  });
  assert.equal(createResponse.status, 500);
  const updateResponse = await fetch(`${fixture.baseUrl}/api/announcements/${announcementId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'failed update' }),
  });
  assert.equal(updateResponse.status, 500);
  const deleteResponse = await fetch(`${fixture.baseUrl}/api/announcements/${announcementId}`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 500);
  assert.deepEqual(await getSnapshot(fixture.baseUrl), initial);
  await assert.rejects(
    readSseMessage(connection, 100),
    /Timed out waiting for an SSE message/
  );
});

test('in-memory adapter derives active-job counts and preserves off-duty mechanics', async () => {
  const persistence = createPresetPersistence();
  const getMechanic = async (id: string) => {
    const snapshot = await persistence.getSnapshot();
    const mechanic = snapshot.mechanics.find((record) => record.id === id);
    assert.ok(mechanic);
    return mechanic;
  };

  assert.equal((await getMechanic('mech-1')).activeJobsCount, 1);
  assert.equal((await getMechanic('mech-4')).activeJobsCount, 0);

  const created = await persistence.createVehicle({
    ownerName: 'Mechanic Test Owner',
    plateNumber: 'MECH 123',
    vehicleMake: 'Test Make',
    mechanicId: 'mech-4',
  });
  assert.equal((await getMechanic('mech-4')).activeJobsCount, 1);
  assert.equal((await getMechanic('mech-4')).status, 'busy');

  await persistence.updateVehicle(created.vehicle.id, { mechanicId: 'mech-1' });
  assert.equal((await getMechanic('mech-4')).activeJobsCount, 0);
  assert.equal((await getMechanic('mech-4')).status, 'available');
  assert.equal((await getMechanic('mech-1')).activeJobsCount, 2);

  await persistence.updateVehicle(created.vehicle.id, { status: 'completed' });
  assert.equal((await getMechanic('mech-1')).activeJobsCount, 1);
  assert.equal((await getMechanic('mech-1')).status, 'busy');
  await persistence.updateVehicle(created.vehicle.id, { status: 'delivered' });
  assert.equal((await getMechanic('mech-1')).activeJobsCount, 1);
  await persistence.deleteVehicle(created.vehicle.id);
  assert.equal((await getMechanic('mech-1')).activeJobsCount, 1);

  const activeVehicle = await persistence.createVehicle({
    ownerName: 'Delete Test Owner',
    plateNumber: 'MECH 456',
    vehicleMake: 'Test Make',
    mechanicId: 'mech-4',
  });
  assert.equal((await getMechanic('mech-4')).activeJobsCount, 1);
  await persistence.deleteVehicle(activeVehicle.vehicle.id);
  assert.equal((await getMechanic('mech-4')).activeJobsCount, 0);
  assert.equal((await getMechanic('mech-4')).status, 'available');

  const offDutyMechanics = INITIAL_MECHANICS.map((mechanic) =>
    mechanic.id === 'mech-4' ? { ...mechanic, status: 'off_duty' as const } : mechanic
  );
  const offDutyPersistence = createPresetPersistence({ initialMechanics: offDutyMechanics });
  const getOffDutyMechanic = async () => {
    const snapshot = await offDutyPersistence.getSnapshot();
    const mechanic = snapshot.mechanics.find((record) => record.id === 'mech-4');
    assert.ok(mechanic);
    return mechanic;
  };
  const offDutyVehicle = await offDutyPersistence.createVehicle({
    ownerName: 'Off Duty Test Owner',
    plateNumber: 'MECH 789',
    vehicleMake: 'Test Make',
    mechanicId: 'mech-4',
  });
  assert.equal((await getOffDutyMechanic()).activeJobsCount, 1);
  assert.equal((await getOffDutyMechanic()).status, 'off_duty');
  await offDutyPersistence.updateVehicle(offDutyVehicle.vehicle.id, { status: 'completed' });
  assert.equal((await getOffDutyMechanic()).activeJobsCount, 0);
  assert.equal((await getOffDutyMechanic()).status, 'off_duty');
});

test('invalid mechanic assignments reject without partial state changes or SSE events', async (context) => {
  const persistence = createPresetPersistence();
  const initial = structuredClone(await persistence.getSnapshot());
  const invalidAssignment = {
    ownerName: 'Invalid Mechanic Owner',
    plateNumber: 'BAD 123',
    vehicleMake: 'Test Make',
    mechanicId: 'missing-mechanic',
  };

  await assert.rejects(
    persistence.createVehicle(invalidAssignment),
    /Mechanic "missing-mechanic" was not found/
  );
  await assert.rejects(
    persistence.updateVehicle('v-101', { mechanicId: 'missing-mechanic' }),
    /Mechanic "missing-mechanic" was not found/
  );
  assert.deepEqual(await persistence.getSnapshot(), initial);

  const fixture = await createTestServer(context, persistence);
  const controller = new AbortController();
  fixture.abortControllers.push(controller);
  const response = await fetch(`${fixture.baseUrl}/api/events`, { signal: controller.signal });
  assert.ok(response.body);
  const connection: SseConnection = {
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    pending: '',
  };
  fixture.readers.push(connection.reader);
  assert.equal(asRecord(await readSseMessage(connection)).type, 'CONNECTED');

  const createResponse = await fetch(`${fixture.baseUrl}/api/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidAssignment),
  });
  assert.equal(createResponse.status, 400);
  assert.deepEqual(await createResponse.json(), {
    error: 'Mechanic "missing-mechanic" was not found.',
  });

  const updateResponse = await fetch(`${fixture.baseUrl}/api/vehicles/v-101`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mechanicId: 'missing-mechanic' }),
  });
  assert.equal(updateResponse.status, 400);
  assert.deepEqual(await updateResponse.json(), {
    error: 'Mechanic "missing-mechanic" was not found.',
  });
  assert.deepEqual(await getSnapshot(fixture.baseUrl), initial);
  await assert.rejects(
    readSseMessage(connection, 100),
    /Timed out waiting for an SSE message/
  );
});

test('in-memory snapshots are detached from persistence state', async () => {
  const persistence = createPresetPersistence();
  const snapshot = await persistence.getSnapshot();
  const original = structuredClone(snapshot);

  assert.ok(snapshot.vehicles[0].tasks?.length);
  snapshot.vehicles[0].tasks?.push({
    id: 'mutated-snapshot-task',
    title: 'Must not persist',
    completed: false,
  });
  snapshot.mechanics[0].status = 'off_duty';
  snapshot.announcements.pop();
  snapshot.activityLogs.length = 0;

  assert.deepEqual(await persistence.getSnapshot(), original);
});

test('in-memory adapter preserves ordering and retains logs', async () => {
  const persistence = createPresetPersistence();
  const waitForNextMillisecond = async () => {
    const currentTime = Date.now();
    while (Date.now() === currentTime) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  };
  let snapshot = await persistence.getSnapshot();
  assert.deepEqual(snapshot.vehicles.map((vehicle) => vehicle.id), INITIAL_VEHICLES.map((vehicle) => vehicle.id));
  assert.deepEqual(snapshot.mechanics.map((mechanic) => mechanic.id), INITIAL_MECHANICS.map((mechanic) => mechanic.id));
  assert.deepEqual(snapshot.announcements.map((announcement) => announcement.id), INITIAL_ANNOUNCEMENTS.map((announcement) => announcement.id));

  const firstVehicle = await persistence.createVehicle({
    ownerName: 'First Vehicle',
    plateNumber: 'ORDER 1',
    vehicleMake: 'First Make',
  });
  await waitForNextMillisecond();
  const secondVehicle = await persistence.createVehicle({
    ownerName: 'Second Vehicle',
    plateNumber: 'ORDER 2',
    vehicleMake: 'Second Make',
  });
  snapshot = await persistence.getSnapshot();
  assert.equal(snapshot.vehicles[0].id, secondVehicle.vehicle.id);
  assert.equal(snapshot.vehicles[1].id, firstVehicle.vehicle.id);
  assert.deepEqual(snapshot.activityLogs.slice(0, 2), [secondVehicle.log, firstVehicle.log]);

  const vehicleOrder = snapshot.vehicles.map((vehicle) => vehicle.id);
  const update = await persistence.updateVehicle(firstVehicle.vehicle.id, { notes: 'Updated in place' });
  assert.ok(update);
  snapshot = await persistence.getSnapshot();
  assert.deepEqual(snapshot.vehicles.map((vehicle) => vehicle.id), vehicleOrder);
  assert.deepEqual(snapshot.activityLogs[0], update.log);

  const firstAnnouncement = await persistence.createAnnouncement({ text: 'First announcement' });
  await waitForNextMillisecond();
  const secondAnnouncement = await persistence.createAnnouncement({ text: 'Second announcement' });
  let announcements = await persistence.listAnnouncements();
  assert.deepEqual(announcements.slice(0, 2), [
    secondAnnouncement.announcement,
    firstAnnouncement.announcement,
  ]);
  await persistence.updateAnnouncement(firstAnnouncement.announcement.id, { active: false });
  announcements = await persistence.listAnnouncements();
  assert.deepEqual(announcements.slice(0, 2).map((announcement) => announcement.id), [
    secondAnnouncement.announcement.id,
    firstAnnouncement.announcement.id,
  ]);

  const initialLogCount = snapshot.activityLogs.length;
  for (let index = 0; index < 1100; index += 1) {
    await persistence.updateVehicle('v-101', { notes: `Retention test ${index}` });
  }
  snapshot = await persistence.getSnapshot();
  assert.equal(snapshot.activityLogs.length, initialLogCount + 1100);

});

test('app instances keep independent records and nested task data', async (context) => {
  const first = await createTestServer(context);
  const second = await createTestServer(context);
  const secondBefore = await getSnapshot(second.baseUrl);
  const secondVehicleBefore = secondBefore.vehicles.find((vehicle) => vehicle.id === 'v-101');
  assert.ok(secondVehicleBefore?.tasks?.length);
  const originalTaskTitle = secondVehicleBefore.tasks[0].title;

  const firstVehicle = await fetch(`${first.baseUrl}/api/vehicles`);
  const firstSnapshot = (await firstVehicle.json()) as AppSnapshot;
  const firstVehicleRecord = firstSnapshot.vehicles.find((vehicle) => vehicle.id === 'v-101');
  assert.ok(firstVehicleRecord?.tasks?.length);
  const updatedTasks = firstVehicleRecord.tasks.map((task, index) =>
    index === 0 ? { ...task, title: 'Changed in first app instance' } : task
  );

  const updateResponse = await fetch(`${first.baseUrl}/api/vehicles/v-101`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks: updatedTasks }),
  });
  assert.equal(updateResponse.status, 200);

  const firstAfter = await getSnapshot(first.baseUrl);
  const secondAfter = await getSnapshot(second.baseUrl);
  assert.equal(
    firstAfter.vehicles.find((vehicle) => vehicle.id === 'v-101')?.tasks?.[0].title,
    'Changed in first app instance'
  );
  assert.equal(
    secondAfter.vehicles.find((vehicle) => vehicle.id === 'v-101')?.tasks?.[0].title,
    originalTaskTitle
  );
  assert.equal(secondAfter.vehicles.length, secondBefore.vehicles.length);

  const announcementResponse = await fetch(`${first.baseUrl}/api/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Only in first app' }),
  });
  assert.equal(announcementResponse.status, 201);
  const createdAnnouncement = asRecord(await announcementResponse.json());
  const firstAnnouncementId = String(asRecord(createdAnnouncement.announcement).id);

  const firstAfterAnnouncement = await getSnapshot(first.baseUrl);
  const secondAfterAnnouncement = await getSnapshot(second.baseUrl);
  assert.ok(firstAfterAnnouncement.announcements.some((item) => item.id === firstAnnouncementId));
  assert.equal(
    secondAfterAnnouncement.announcements.some((item) => item.id === firstAnnouncementId),
    false
  );
});

test('SSE sends the connection message and a vehicle-created event', async (context) => {
  const fixture = await createTestServer(context);
  const controller = new AbortController();
  fixture.abortControllers.push(controller);

  const response = await fetch(`${fixture.baseUrl}/api/events`, {
    signal: controller.signal,
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  assert.ok(response.body);

  const connection: SseConnection = {
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    pending: '',
  };
  fixture.readers.push(connection.reader);

  const connected = asRecord(await readSseMessage(connection));
  assert.equal(connected.type, 'CONNECTED');
  assert.equal(typeof connected.clientId, 'string');

  const createResponse = await fetch(`${fixture.baseUrl}/api/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerName: 'SSE Test Owner',
      plateNumber: 'SSE 123',
      vehicleMake: 'Test Make',
    }),
  });
  assert.equal(createResponse.status, 201);
  const createBody = asRecord(await createResponse.json());
  const createdVehicle = asRecord(createBody.vehicle);
  const createdLog = asRecord(createBody.log);

  const event = asRecord(await readSseMessage(connection));
  assert.equal(event.type, 'VEHICLE_CREATED');
  const data = asRecord(event.data);
  const eventVehicle = asRecord(data.vehicle);
  const eventLog = asRecord(data.log);
  assert.equal(eventVehicle.id, createdVehicle.id);
  assert.equal(eventVehicle.plateNumber, createdVehicle.plateNumber);
  assert.equal(eventLog.id, createdLog.id);
  assert.equal(eventLog.vehicleId, createdVehicle.id);
  assert.equal(typeof event.timestamp, 'string');
});

test('vehicle persistence failure returns an error without broadcasting SSE', async (context) => {
  const inMemoryPersistence = createPresetPersistence();
  const failingPersistence: WorkshopPersistence = {
    ...inMemoryPersistence,
    async createVehicle() {
      throw new Error('Persistence failed.');
    },
  };
  const fixture = await createTestServer(context, failingPersistence);
  const controller = new AbortController();
  fixture.abortControllers.push(controller);

  const response = await fetch(`${fixture.baseUrl}/api/events`, {
    signal: controller.signal,
  });
  assert.ok(response.body);

  const connection: SseConnection = {
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    pending: '',
  };
  fixture.readers.push(connection.reader);

  const connected = asRecord(await readSseMessage(connection));
  assert.equal(connected.type, 'CONNECTED');

  const createResponse = await fetch(`${fixture.baseUrl}/api/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerName: 'Failure Test Owner',
      plateNumber: 'FAIL 123',
      vehicleMake: 'Test Make',
    }),
  });
  assert.equal(createResponse.status, 500);
  await assert.rejects(
    readSseMessage(connection, 100),
    /Timed out waiting for an SSE message/
  );
});

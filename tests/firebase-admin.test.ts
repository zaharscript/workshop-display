import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  createFirebaseAdminInitializer,
  initializeFirebaseAdmin,
  parseFirebaseAdminConfiguration,
  type FirebaseAdminConfiguration,
  type FirebaseAdminDependencies,
} from '../server/firebase-admin';
import * as persistenceSelection from '../server/persistence-selection';

interface FakeAdminApp {
  name: string;
  options: { projectId?: string };
}

interface FakeFirestore {
  projectId: string;
  mode: FirebaseAdminConfiguration['mode'];
}

const emulatorEnvironment = {
  WORKSHOP_FIREBASE_MODE: 'emulator',
  WORKSHOP_FIREBASE_PROJECT_ID: 'demo-workshop-display',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
};

function createFakeDependencies(
  initialApps: FakeAdminApp[] = []
): {
  dependencies: FirebaseAdminDependencies<FakeAdminApp, FakeFirestore>;
  calls: { initialized: number; firestore: number };
} {
  const apps = initialApps;
  const calls = { initialized: 0, firestore: 0 };
  return {
    calls,
    dependencies: {
      getApps: () => apps,
      getAppProjectId: (app) => app.options.projectId,
      initializeApp(configuration, name) {
        calls.initialized += 1;
        const app = { name, options: { projectId: configuration.projectId } };
        apps.push(app);
        return app;
      },
      getFirestore(app, configuration) {
        calls.firestore += 1;
        assert.equal(app.options.projectId, configuration.projectId);
        return { projectId: configuration.projectId, mode: configuration.mode };
      },
    },
  };
}

test('importing the bootstrap and parsing cloud configuration do not load Admin runtime modules', () => {
  const loader = `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('firebase-admin/') || specifier.startsWith('@google-cloud/firestore')) {
        throw new Error('Admin runtime import was attempted');
      }
      return nextResolve(specifier, context);
    }
  `;
  const script = `
    import { register } from 'node:module';
    import { pathToFileURL } from 'node:url';
    register('data:text/javascript,' + encodeURIComponent(${JSON.stringify(loader)}), import.meta.url);
    const bootstrap = await import(pathToFileURL(process.cwd() + '\\\\server\\\\firebase-admin.ts'));
    const configuration = bootstrap.parseFirebaseAdminConfiguration({
      WORKSHOP_FIREBASE_MODE: 'cloud',
      WORKSHOP_FIREBASE_PROJECT_ID: 'valid-cloud-project',
    });
    if (configuration.mode !== 'cloud') throw new Error('Expected cloud configuration');
    process.stdout.write('bootstrap-imported-cloud-parsed');
  `;
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', script],
    { cwd: process.cwd(), encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'bootstrap-imported-cloud-parsed');
});

test('cloud Admin configuration initializes through the existing injected bootstrap', () => {
  const { dependencies, calls } = createFakeDependencies();
  const initialize = createFirebaseAdminInitializer(dependencies);
  const previousHost = process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  try {
    const connection = initialize({
      WORKSHOP_FIREBASE_MODE: 'cloud',
      WORKSHOP_FIREBASE_PROJECT_ID: 'valid-cloud-project',
    });
    assert.equal(connection.app.options.projectId, 'valid-cloud-project');
    assert.deepEqual(calls, { initialized: 1, firestore: 1 });
    assert.throws(
      () => persistenceSelection.createStartupPersistence({
        NODE_ENV: 'test',
        WORKSHOP_PERSISTENCE: 'firestore',
        WORKSHOP_FIRESTORE_AUTHORIZATION: 'enabled',
      }),
      /Firestore persistence is not implemented/
    );
  } finally {
    if (previousHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = previousHost;
  }
});

test('cloud Admin initialization rejects ambient emulator configuration before dependencies', () => {
  const { dependencies, calls } = createFakeDependencies();
  const initialize = createFirebaseAdminInitializer(dependencies);
  const previousHost = process.env.FIRESTORE_EMULATOR_HOST;
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  try {
    assert.throws(
      () => initialize({
        WORKSHOP_FIREBASE_MODE: 'cloud',
        WORKSHOP_FIREBASE_PROJECT_ID: 'valid-cloud-project',
      }),
      /FIRESTORE_EMULATOR_HOST is set/
    );
    assert.deepEqual(calls, { initialized: 0, firestore: 0 });
  } finally {
    if (previousHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = previousHost;
  }
});

test('cloud Admin initialization reuses the same app even with an unrelated extra argument', () => {
  const { dependencies, calls } = createFakeDependencies();
  const initialize = createFirebaseAdminInitializer(dependencies);
  const previousHost = process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  try {
    const connection = Reflect.apply(initialize, undefined, [
          {
            WORKSHOP_FIREBASE_MODE: 'cloud',
            WORKSHOP_FIREBASE_PROJECT_ID: 'valid-cloud-project',
          },
          { authorized: true, issueCapability: () => true },
        ]) as ReturnType<typeof initialize>;
    assert.equal(connection.app.options.projectId, 'valid-cloud-project');
    assert.deepEqual(calls, { initialized: 1, firestore: 1 });
  } finally {
    if (previousHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = previousHost;
  }
});

test('Admin configuration requires an explicit supported mode and valid project ID', () => {
  for (const environment of [
    {},
    { WORKSHOP_FIREBASE_MODE: 'unknown', WORKSHOP_FIREBASE_PROJECT_ID: 'valid-project-id' },
    { WORKSHOP_FIREBASE_MODE: 'cloud' },
    { WORKSHOP_FIREBASE_MODE: 'cloud', WORKSHOP_FIREBASE_PROJECT_ID: 'Invalid_Project' },
    { WORKSHOP_FIREBASE_MODE: 'cloud', WORKSHOP_FIREBASE_PROJECT_ID: 'short' },
  ]) {
    assert.throws(() => parseFirebaseAdminConfiguration(environment));
  }
});

test('emulator configuration requires the exact local host and synthetic project', () => {
  for (const host of [
    undefined,
    '',
    'localhost:8080',
    '127.0.0.1:8081',
    '192.168.1.10:8080',
    'firestore.googleapis.com:443',
    'http://127.0.0.1:8080',
  ]) {
    assert.throws(() => parseFirebaseAdminConfiguration({
      ...emulatorEnvironment,
      FIRESTORE_EMULATOR_HOST: host,
    }));
  }

  for (const projectId of [
    'workshop-display-dev',
    'workshop-display',
    'valid-cloud-project',
  ]) {
    assert.throws(() => parseFirebaseAdminConfiguration({
      ...emulatorEnvironment,
      WORKSHOP_FIREBASE_PROJECT_ID: projectId,
    }));
  }

  assert.deepEqual(parseFirebaseAdminConfiguration(emulatorEnvironment), {
    mode: 'emulator',
    projectId: 'demo-workshop-display',
    emulatorHost: '127.0.0.1:8080',
  });
  assert.deepEqual(
    parseFirebaseAdminConfiguration({
      WORKSHOP_FIREBASE_MODE: 'cloud',
      WORKSHOP_FIREBASE_PROJECT_ID: 'workshop-display-dev',
    }),
    { mode: 'cloud', projectId: 'workshop-display-dev' }
  );
});

test('cloud configuration requires a valid explicit non-emulator project ID', () => {
  assert.deepEqual(parseFirebaseAdminConfiguration({
    WORKSHOP_FIREBASE_MODE: 'cloud',
    WORKSHOP_FIREBASE_PROJECT_ID: 'valid-cloud-project',
  }), {
    mode: 'cloud',
    projectId: 'valid-cloud-project',
  });
  assert.throws(() => parseFirebaseAdminConfiguration({
    WORKSHOP_FIREBASE_MODE: 'cloud',
    WORKSHOP_FIREBASE_PROJECT_ID: 'valid-cloud-project',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  }));
  assert.throws(() => parseFirebaseAdminConfiguration({
    WORKSHOP_FIREBASE_MODE: 'cloud',
    WORKSHOP_FIREBASE_PROJECT_ID: 'demo-workshop-display',
  }));
  assert.throws(() => parseFirebaseAdminConfiguration({
    WORKSHOP_FIREBASE_MODE: 'cloud',
    WORKSHOP_FIREBASE_PROJECT_ID: 'valid-cloud-project',
    GOOGLE_APPLICATION_CREDENTIALS: 'configured',
  }));
  assert.throws(() => parseFirebaseAdminConfiguration({
    ...emulatorEnvironment,
    GOOGLE_APPLICATION_CREDENTIALS: 'configured',
  }));
});

test('injected initializer creates once and reuses only its matching app configuration', () => {
  const { dependencies, calls } = createFakeDependencies();
  const initialize = createFirebaseAdminInitializer(dependencies);
  const first = initialize(emulatorEnvironment);
  const second = initialize(emulatorEnvironment);

  assert.equal(first.app, second.app);
  assert.equal(first.firestore, second.firestore);
  assert.deepEqual(calls, { initialized: 1, firestore: 1 });
});

test('emulator host is scoped to synchronous Firestore client creation and restored', () => {
  const previousHost = process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  const apps: FakeAdminApp[] = [];
  const dependencies: FirebaseAdminDependencies<FakeAdminApp, FakeFirestore> = {
    getApps: () => apps,
    getAppProjectId: (app) => app.options.projectId,
    initializeApp(configuration, name) {
      const app = { name, options: { projectId: configuration.projectId } };
      apps.push(app);
      return app;
    },
    getFirestore(_app, configuration) {
      assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
      return { projectId: configuration.projectId, mode: configuration.mode };
    },
  };

  try {
    createFirebaseAdminInitializer(dependencies)(emulatorEnvironment);
    assert.equal(process.env.FIRESTORE_EMULATOR_HOST, undefined);
  } finally {
    if (previousHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = previousHost;
  }
});

test('initializer rejects existing default or ambiguous Admin apps without reusing them', () => {
  for (const initialApps of [
    [{ name: '[DEFAULT]', options: { projectId: 'demo-workshop-display' } }],
    [
      { name: 'workshop-display-admin', options: { projectId: 'demo-workshop-display' } },
      { name: '[DEFAULT]', options: { projectId: 'demo-workshop-display' } },
    ],
  ]) {
    const { dependencies, calls } = createFakeDependencies(initialApps);
    const initialize = createFirebaseAdminInitializer(dependencies);
    assert.throws(() => initialize(emulatorEnvironment), /conflicting or ambiguous/);
    assert.deepEqual(calls, { initialized: 0, firestore: 0 });
  }
});

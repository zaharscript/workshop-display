import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOperatorAuthenticator,
  OperatorAuthenticationError,
} from '../server/operator-auth';

test('operator authenticator rejects malformed, expired, revoked, and invalid ID tokens with 401', async () => {
  let documentLookups = 0;
  const invalidCodes = [
    'auth/argument-error',
    'auth/id-token-expired',
    'auth/id-token-revoked',
    'auth/invalid-id-token',
  ];

  for (const code of invalidCodes) {
    const authenticate = createOperatorAuthenticator({
      async verifyIdToken() {
        throw Object.assign(new Error('Invalid token'), { code });
      },
      async getOperatorDocument() {
        documentLookups += 1;
        return null;
      },
    });

    await assert.rejects(
      authenticate('invalid-token'),
      (error: unknown) =>
        error instanceof OperatorAuthenticationError && error.status === 401
    );
  }
  assert.equal(documentLookups, 0);
});

test('operator authenticator rejects missing, inactive, and unsupported operator records', async () => {
  const authenticate = createOperatorAuthenticator({
    async verifyIdToken(idToken) {
      if (!idToken) throw Object.assign(new Error('Missing token'), { code: 'auth/argument-error' });
      return { uid: idToken, email: `${idToken}@example.test` };
    },
    async getOperatorDocument(uid) {
      if (uid === 'missing') return null;
      if (uid === 'inactive') return { active: false, role: 'mechanic' };
      return { active: true, role: 'viewer' };
    },
  });

  for (const id of ['missing', 'inactive', 'unsupported']) {
    await assert.rejects(
      authenticate(id),
      (error: unknown) =>
        error instanceof OperatorAuthenticationError && error.status === 403
    );
  }
});

test('operator authenticator accepts exactly active admin and mechanic documents', async () => {
  const authenticate = createOperatorAuthenticator({
    async verifyIdToken(uid) {
      return { uid, email: `${uid}@example.test` };
    },
    async getOperatorDocument(uid) {
      return { active: true, role: uid, name: `Name ${uid}` };
    },
  });

  for (const role of ['admin', 'mechanic'] as const) {
    const operator = await authenticate(role);
    assert.equal(operator.uid, role);
    assert.equal(operator.role, role);
    assert.equal(operator.active, true);
  }
});

test('operator document lookup failures fail closed with 503', async () => {
  const authenticate = createOperatorAuthenticator({
    async verifyIdToken(uid) {
      return { uid };
    },
    async getOperatorDocument() {
      throw new Error('Firestore unavailable');
    },
  });

  await assert.rejects(
    authenticate('admin'),
    (error: unknown) =>
      error instanceof OperatorAuthenticationError && error.status === 503
  );
});

test('unexpected verifier failures fail closed with 503', async () => {
  const authenticate = createOperatorAuthenticator({
    async verifyIdToken() {
      throw new Error('Verifier configuration is unavailable.');
    },
    async getOperatorDocument() {
      throw new Error('Should not read operator data after verifier failure.');
    },
  });

  await assert.rejects(
    authenticate('test-token'),
    (error: unknown) =>
      error instanceof OperatorAuthenticationError && error.status === 503
  );
});

test('operator authenticator rejects a verified token without a UID with 401', async () => {
  const authenticate = createOperatorAuthenticator({
    async verifyIdToken() {
      return { uid: '' };
    },
    async getOperatorDocument() {
      throw new Error('Should not read operator data without a UID.');
    },
  });

  await assert.rejects(
    authenticate('test-token'),
    (error: unknown) =>
      error instanceof OperatorAuthenticationError && error.status === 401
  );
});

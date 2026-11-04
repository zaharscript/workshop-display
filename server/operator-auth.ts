import type { Request, RequestHandler } from 'express';
import {
  hasOperatorPermission,
  validateOperatorDocument,
  type OperatorPermission,
  type OperatorRecord,
} from '../src/lib/operatorAccess';
import {
  initializeFirebaseAdmin,
  readFirebaseAdminEnvironment,
} from './firebase-admin';

export class OperatorAuthenticationError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    message: string
  ) {
    super(message);
    this.name = 'OperatorAuthenticationError';
  }
}

export type OperatorAuthenticator = (idToken: string) => Promise<OperatorRecord>;

interface OperatorAuthenticationDependencies {
  verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }>;
  getOperatorDocument(uid: string): Promise<Record<string, unknown> | null>;
}

const invalidTokenCodes = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-id-token',
]);

export function createOperatorAuthenticator(
  dependencies: OperatorAuthenticationDependencies
): OperatorAuthenticator {
  return async (idToken) => {
    let decodedToken: { uid: string; email?: string };
    try {
      decodedToken = await dependencies.verifyIdToken(idToken);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined;
      if (typeof code === 'string' && invalidTokenCodes.has(code)) {
        throw new OperatorAuthenticationError(401, 'Invalid or expired authentication token.');
      }
      console.error('Firebase ID token verification failed:', error);
      throw new OperatorAuthenticationError(503, 'Operator verification is temporarily unavailable.');
    }

    if (!decodedToken.uid) {
      throw new OperatorAuthenticationError(401, 'Invalid authentication token.');
    }

    let operatorData: Record<string, unknown> | null;
    try {
      operatorData = await dependencies.getOperatorDocument(decodedToken.uid);
    } catch (error) {
      console.error('Failed to load Firebase operator document:', error);
      throw new OperatorAuthenticationError(503, 'Operator verification is temporarily unavailable.');
    }

    if (!operatorData) {
      throw new OperatorAuthenticationError(403, 'An active workshop operator account is required.');
    }

    const email = typeof decodedToken.email === 'string'
      ? decodedToken.email
      : typeof operatorData.email === 'string'
        ? operatorData.email
        : '';
    const operator = validateOperatorDocument(decodedToken.uid, email, operatorData);
    if (!operator) {
      throw new OperatorAuthenticationError(403, 'An active workshop operator account is required.');
    }

    return operator;
  };
}

let firebaseOperatorAuthenticator: Promise<OperatorAuthenticator> | undefined;

function getFirebaseOperatorAuthenticator(): Promise<OperatorAuthenticator> {
  if (!firebaseOperatorAuthenticator) {
    firebaseOperatorAuthenticator = (async () => {
      const connection = await initializeFirebaseAdmin(readFirebaseAdminEnvironment());
      const { getAuth } = await import('firebase-admin/auth');
      const firebaseAuth = getAuth(connection.app);
      return createOperatorAuthenticator({
        verifyIdToken: async (token) => {
          const decoded = await firebaseAuth.verifyIdToken(token, true);
          return { uid: decoded.uid, email: decoded.email };
        },
        getOperatorDocument: async (uid) => {
          const snapshot = await connection.firestore.collection('operators').doc(uid).get();
          return snapshot.exists ? snapshot.data() ?? null : null;
        },
      });
    })();
  }
  return firebaseOperatorAuthenticator;
}

async function authenticateWithFirebaseAdmin(idToken: string): Promise<OperatorRecord> {
  const authenticate = await getFirebaseOperatorAuthenticator();
  return authenticate(idToken);
}

declare global {
  namespace Express {
    interface Request {
      operator?: OperatorRecord;
    }
  }
}

export function requireOperatorPermission(
  permission: OperatorPermission,
  authenticate: OperatorAuthenticator = authenticateWithFirebaseAdmin
): RequestHandler {
  return async (request, response, next) => {
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/);
    if (!match) {
      response.status(401).json({ error: 'A Firebase ID token is required.' });
      return;
    }

    try {
      const operator = await authenticate(match[1]);
      if (!hasOperatorPermission(operator.role, permission)) {
        response.status(403).json({ error: 'This operator role cannot perform the requested action.' });
        return;
      }
      request.operator = operator;
      next();
    } catch (error) {
      if (error instanceof OperatorAuthenticationError) {
        response.status(error.status).json({ error: error.message });
        return;
      }
      console.error('Unexpected operator authorization failure:', error);
      response.status(503).json({ error: 'Operator verification is temporarily unavailable.' });
    }
  };
}

export function getOperatorName(request: Request): string {
  return request.operator?.name || request.operator?.email || request.operator?.uid || 'Workshop Operator';
}

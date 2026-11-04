import {
  createInMemoryPersistence,
  type WorkshopPersistence,
} from './persistence';

export interface PersistenceStartupEnvironment {
  NODE_ENV?: string;
  WORKSHOP_PERSISTENCE?: string;
  WORKSHOP_FIRESTORE_AUTHORIZATION?: string;
}

const FIRESTORE_PERSISTENCE_IMPLEMENTED = false;
function assertFirestorePersistenceImplemented(): void {
  if (!FIRESTORE_PERSISTENCE_IMPLEMENTED) {
    throw new Error('Firestore persistence is not implemented.');
  }
}

export function createStartupPersistence(
  environment: PersistenceStartupEnvironment = process.env
): WorkshopPersistence {
  const nodeEnvironment = environment.NODE_ENV;
  if (!['development', 'test', 'production'].includes(nodeEnvironment ?? '')) {
    throw new Error('Persistence startup requires NODE_ENV to be development, test, or production.');
  }

  const configuredMode = environment.WORKSHOP_PERSISTENCE;
  if (configuredMode === undefined && nodeEnvironment === 'production') {
    throw new Error('Production startup requires an explicit WORKSHOP_PERSISTENCE value.');
  }
  const persistenceMode = configuredMode ?? 'memory';

  if (persistenceMode === 'memory') {
    return createInMemoryPersistence();
  }

  if (persistenceMode !== 'firestore') {
    throw new Error(`Unsupported persistence mode "${persistenceMode}".`);
  }

  if (environment.WORKSHOP_FIRESTORE_AUTHORIZATION !== 'enabled') {
    throw new Error('Firestore persistence requires explicit authentication and authorization enablement.');
  }

  assertFirestorePersistenceImplemented();

  throw new Error('Firestore persistence is not implemented.');
}

import type { App, AppOptions } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { generateKeyPairSync } from 'node:crypto';

const ADMIN_APP_NAME = 'workshop-display-admin';
const EMULATOR_PROJECT_ID = 'demo-workshop-display';
const EMULATOR_HOST = '127.0.0.1:8080';
const RESERVED_PROJECT_IDS = new Set([
  'demo-workshop-display',
  'workshop-display',
]);

export interface FirebaseAdminEnvironment {
  WORKSHOP_FIREBASE_MODE?: string;
  WORKSHOP_FIREBASE_PROJECT_ID?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
}

export type FirebaseAdminConfiguration =
  | {
      mode: 'emulator';
      projectId: typeof EMULATOR_PROJECT_ID;
      emulatorHost: typeof EMULATOR_HOST;
    }
  | {
      mode: 'cloud';
      projectId: string;
    };

export interface FirebaseAdminAppLike {
  name: string;
  options: { projectId?: string };
}

export interface FirebaseAdminDependencies<
  TApp extends FirebaseAdminAppLike,
  TFirestore,
> {
  getApps(): readonly TApp[];
  getAppProjectId(app: TApp): string | undefined;
  initializeApp(configuration: FirebaseAdminConfiguration, name: string): TApp;
  getFirestore(app: TApp, configuration: FirebaseAdminConfiguration): TFirestore;
}

export interface FirebaseAdminConnection<TApp, TFirestore> {
  app: TApp;
  firestore: TFirestore;
}

function validateProjectId(projectId: string): boolean {
  return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId);
}

export function parseFirebaseAdminConfiguration(
  environment: FirebaseAdminEnvironment
): FirebaseAdminConfiguration {
  const mode = environment.WORKSHOP_FIREBASE_MODE;
  const projectId = environment.WORKSHOP_FIREBASE_PROJECT_ID;

  if (environment.GOOGLE_APPLICATION_CREDENTIALS !== undefined) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must be unset; credential files are not supported.');
  }
  if (mode !== 'emulator' && mode !== 'cloud') {
    throw new Error('WORKSHOP_FIREBASE_MODE must be explicitly set to emulator or cloud.');
  }
  if (!projectId || !validateProjectId(projectId)) {
    throw new Error('WORKSHOP_FIREBASE_PROJECT_ID must be a valid Firebase project ID.');
  }

  if (mode === 'emulator') {
    if (projectId !== EMULATOR_PROJECT_ID) {
      throw new Error('Emulator mode requires the synthetic project ID demo-workshop-display.');
    }
    if (environment.FIRESTORE_EMULATOR_HOST !== EMULATOR_HOST) {
      throw new Error(`FIRESTORE_EMULATOR_HOST must be exactly ${EMULATOR_HOST} in emulator mode.`);
    }
    return { mode, projectId: EMULATOR_PROJECT_ID, emulatorHost: EMULATOR_HOST };
  }

  if (environment.FIRESTORE_EMULATOR_HOST !== undefined) {
    throw new Error('FIRESTORE_EMULATOR_HOST must be unset in cloud mode.');
  }
  if (RESERVED_PROJECT_IDS.has(projectId)) {
    throw new Error('Cloud mode requires an explicitly configured non-emulator project ID.');
  }
  return { mode, projectId };
}

export function readFirebaseAdminEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): FirebaseAdminEnvironment {
  return {
    WORKSHOP_FIREBASE_MODE: environment.WORKSHOP_FIREBASE_MODE,
    WORKSHOP_FIREBASE_PROJECT_ID: environment.WORKSHOP_FIREBASE_PROJECT_ID,
    FIRESTORE_EMULATOR_HOST: environment.FIRESTORE_EMULATOR_HOST,
    GOOGLE_APPLICATION_CREDENTIALS: environment.GOOGLE_APPLICATION_CREDENTIALS,
  };
}

export function createFirebaseAdminInitializer<
  TApp extends FirebaseAdminAppLike,
  TFirestore,
>(dependencies: FirebaseAdminDependencies<TApp, TFirestore>) {
  const ownedConfigurations = new WeakMap<TApp, string>();
  const firestoreByApp = new WeakMap<TApp, TFirestore>();

  return function initialize(
    environment: FirebaseAdminEnvironment
  ): FirebaseAdminConnection<TApp, TFirestore> {
    const configuration = parseFirebaseAdminConfiguration(environment);
    const ambientEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS !== undefined) {
      throw new Error('Admin initialization is blocked while GOOGLE_APPLICATION_CREDENTIALS is set.');
    }
    if (configuration.mode === 'cloud' && ambientEmulatorHost !== undefined) {
      throw new Error('Cloud Admin initialization is blocked while FIRESTORE_EMULATOR_HOST is set.');
    }
    if (
      configuration.mode === 'emulator' &&
      ambientEmulatorHost !== undefined &&
      ambientEmulatorHost !== configuration.emulatorHost
    ) {
      throw new Error('Emulator Admin initialization conflicts with the ambient emulator host.');
    }

    const configurationKey = JSON.stringify(configuration);
    const existingApps = dependencies.getApps();
    const existingApp = existingApps.find((app) => app.name === ADMIN_APP_NAME);

    if (existingApps.length > 0) {
      if (
        existingApps.length !== 1 ||
        !existingApp ||
        ownedConfigurations.get(existingApp) !== configurationKey ||
        dependencies.getAppProjectId(existingApp) !== configuration.projectId
      ) {
        throw new Error('An existing Firebase Admin app has conflicting or ambiguous configuration.');
      }

      const firestore = firestoreByApp.get(existingApp);
      if (!firestore) {
        throw new Error('The existing Firebase Admin app has no matching initialized Firestore client.');
      }
      return { app: existingApp, firestore };
    }

    const app = dependencies.initializeApp(configuration, ADMIN_APP_NAME);
    ownedConfigurations.set(app, configurationKey);
    const previousEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    let firestore: TFirestore;
    try {
      if (configuration.mode === 'emulator') {
        process.env.FIRESTORE_EMULATOR_HOST = configuration.emulatorHost;
      }
      firestore = dependencies.getFirestore(app, configuration);
    } finally {
      if (previousEmulatorHost === undefined) {
        delete process.env.FIRESTORE_EMULATOR_HOST;
      } else {
        process.env.FIRESTORE_EMULATOR_HOST = previousEmulatorHost;
      }
    }
    firestoreByApp.set(app, firestore);
    return { app, firestore };
  };
}

async function createAdminDependencies(): Promise<
  FirebaseAdminDependencies<App, Firestore>
> {
  const [{ applicationDefault, cert, getApps, initializeApp }, { getFirestore }] =
    await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/firestore'),
    ]);

  return {
    getApps,
    getAppProjectId: (app) => app.options.projectId,
    initializeApp: (configuration, name) => {
      const options: AppOptions = { projectId: configuration.projectId };
      if (configuration.mode === 'emulator') {
        const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
        options.credential = cert({
          projectId: configuration.projectId,
          clientEmail: `firebase-admin-emulator@${configuration.projectId}.iam.gserviceaccount.com`,
          privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        });
      } else {
        options.credential = applicationDefault();
      }
      return initializeApp(options, name);
    },
    getFirestore: (app) => getFirestore(app),
  };
}

let initializeWithAdminSdk:
  | ReturnType<typeof createFirebaseAdminInitializer<App, Firestore>>
  | undefined;

export async function initializeFirebaseAdmin(
  environment: FirebaseAdminEnvironment
): Promise<FirebaseAdminConnection<App, Firestore>> {
  const configuration = parseFirebaseAdminConfiguration(environment);
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS !== undefined) {
    throw new Error('Admin initialization is blocked while GOOGLE_APPLICATION_CREDENTIALS is set.');
  }
  if (configuration.mode === 'cloud' && process.env.FIRESTORE_EMULATOR_HOST !== undefined) {
    throw new Error('Cloud Admin initialization is blocked while FIRESTORE_EMULATOR_HOST is set.');
  }
  if (!initializeWithAdminSdk) {
    const dependencies = await createAdminDependencies();
    initializeWithAdminSdk = createFirebaseAdminInitializer(dependencies);
  }
  return initializeWithAdminSdk(environment);
}

export const firebaseAdminConfiguration = {
  emulatorProjectId: EMULATOR_PROJECT_ID,
  emulatorHost: EMULATOR_HOST,
} as const;

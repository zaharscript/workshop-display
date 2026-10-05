import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const requiredEnvironment = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

const missingEnvironment = Object.entries(requiredEnvironment)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

if (missingEnvironment.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingEnvironment.join(', ')}`
  );
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requiredEnvironment.VITE_FIREBASE_API_KEY,
  authDomain: requiredEnvironment.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: requiredEnvironment.VITE_FIREBASE_PROJECT_ID,
  storageBucket: requiredEnvironment.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: requiredEnvironment.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: requiredEnvironment.VITE_FIREBASE_APP_ID,
};

const existingDefaultApp = getApps().find((existingApp) => existingApp.name === '[DEFAULT]');

export const app = existingDefaultApp ?? initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
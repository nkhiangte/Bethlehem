import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
};

const rawDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId;
const databaseId = (rawDatabaseId && rawDatabaseId !== "(default)") ? rawDatabaseId : undefined;

const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId && firebaseConfig.apiKey !== '';

export const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = isFirebaseConfigured && app ? getAuth(app) : null;

export const db = isFirebaseConfigured && app
  ? (() => {
      try {
        return initializeFirestore(app, {
          localCache: persistentLocalCache(),
          experimentalAutoDetectLongPolling: true,
        }, databaseId);
      } catch (e) {
        return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
      }
    })()
  : null;

export { isFirebaseConfigured };




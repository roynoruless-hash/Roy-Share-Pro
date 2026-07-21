import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
});

let authInstance: Auth | null = null;

export const getFirebaseAuth = (): Auth => {
  if (authInstance) return authInstance;

  const config = getFirebaseConfig();
  if (!config.apiKey) {
    throw new Error('Firebase configuration (VITE_FIREBASE_API_KEY) is missing. Please add it to your environment variables.');
  }

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  authInstance = getAuth(app);
  return authInstance;
};

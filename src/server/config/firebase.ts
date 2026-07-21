import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

let db: Firestore;

export function initializeFirebase() {
  if (getApps().length === 0) {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    
    if (!base64Key) {
      if (process.env.NODE_ENV === 'production') {
        console.error("❌ FATAL: FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is missing in production.");
        process.exit(1);
      } else {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set.");
        console.warn("To connect to Firestore, encode your service account JSON to base64 and set it in your environment variables.");
      }
    } else {
      try {
        let serviceAccount;
        if (base64Key.trim().startsWith('{')) {
          serviceAccount = JSON.parse(base64Key);
        } else {
          serviceAccount = JSON.parse(Buffer.from(base64Key, 'base64').toString('utf-8'));
        }
        
        initializeApp({
          credential: cert(serviceAccount)
        });
        
        console.log("✅ Firebase Admin SDK initialized successfully.");
      } catch (error) {
        console.error("❌ Failed to parse Firebase Service Account from base64 string.", error);
      }
    }
  }
  
  if (getApps().length > 0 && !db) {
     const databaseId = process.env.FIRESTORE_DATABASE_ID;
     if (databaseId) {
       console.log(`🔌 Connecting to explicit Firestore database ID: ${databaseId}`);
       db = getFirestore(databaseId);
     } else {
       console.log(`🔌 Connecting to (default) Firestore database`);
       db = getFirestore();
     }
     // Ensure timestamps are returned correctly
     db.settings({ ignoreUndefinedProperties: true });
  }
}

export function getDb(): Firestore {
  if (!db) {
    throw new Error("Firebase Admin SDK is not fully initialized. Check your FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.");
  }
  return db;
}


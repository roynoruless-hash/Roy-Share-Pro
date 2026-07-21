import { getDb } from '../config/firebase.js';

export function firestoreStorage() {
  return {
    read: async (key: string) => {
      const db = getDb();
      const doc = await db.collection('botSessions').doc(key).get();
      return doc.exists ? doc.data() : undefined;
    },
    write: async (key: string, data: any) => {
      const db = getDb();
      await db.collection('botSessions').doc(key).set(data);
    },
    delete: async (key: string) => {
      const db = getDb();
      await db.collection('botSessions').doc(key).delete();
    },
  };
}

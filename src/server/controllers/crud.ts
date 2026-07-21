import { Request, Response } from 'express';
import { getDb } from '../config/firebase.js';

// Helper to check if the current admin is authorized for a specific botId
const isBotAuthorized = (req: Request, targetBotId: string): boolean => {
  const user = req.adminUser;
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return Array.isArray(user.assignedBots) && user.assignedBots.includes(targetBotId);
};

// Generic CRUD operations handler ensuring botId scoping where applicable

export const createDocument = (collectionName: string) => async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const data = req.body;
    
    // For tenant-scoped collections, enforce botId from the body (admin provides it)
    if (collectionName !== 'bots' && collectionName !== 'admins') {
      if (!data.botId) {
        res.status(400).json({ error: 'botId is required for this collection' });
        return;
      }
      if (!isBotAuthorized(req, data.botId)) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
        return;
      }
    }

    // Add server timestamps
    const docData: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Prevent manual setting of verification status through generic CRUD on create
    if (collectionName === 'users' && docData.hasOwnProperty('isVerified')) {
      if (req.adminUser?.role !== 'superadmin') {
        delete docData.isVerified;
      }
    }

    let docRef;
    if (data.id) {
       docRef = db.collection(collectionName).doc(data.id);
       delete docData.id;
       await docRef.set(docData);
    } else {
       docRef = await db.collection(collectionName).add(docData);
    }
    res.status(201).json({ id: docRef.id, ...docData });
  } catch (error: any) {
    console.error(`Error creating document in ${collectionName}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getDocuments = (collectionName: string) => async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { botId, limit = 50, cursor, searchField, searchValue } = req.query;

    let query: FirebaseFirestore.Query = db.collection(collectionName);

    if (collectionName !== 'bots' && collectionName !== 'admins') {
      if (!botId) {
        res.status(400).json({ error: 'botId query parameter is required' });
        return;
      }
      if (!isBotAuthorized(req, String(botId))) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
        return;
      }
      query = query.where('botId', '==', String(botId));
    } else if (collectionName === 'bots' && req.adminUser?.role !== 'superadmin') {
      const assignedBots = req.adminUser?.assignedBots || [];
      if (assignedBots.length === 0) {
        res.status(200).json({ data: [] });
        return;
      }
      query = query.where('__name__', 'in', assignedBots.slice(0, 10));
    }

    if (searchField && searchValue) {
       const exactMatch = req.query.exactMatch === 'true';
       const isNumeric = req.query.isNumeric === 'true';
       
       let finalSearchValue: any = String(searchValue);
       if (isNumeric) {
         finalSearchValue = Number(searchValue);
       }
       
       if (exactMatch) {
         query = query.where(String(searchField), '==', finalSearchValue);
       } else {
         // Using >= and <= for basic prefix search on strings
         query = query.where(String(searchField), '>=', finalSearchValue)
                      .where(String(searchField), '<=', finalSearchValue + '\uf8ff');
       }
    }

    // Cursor-based pagination
    query = query.limit(Number(limit));

    if (cursor) {
      const cursorDoc = await db.collection(collectionName).doc(String(cursor)).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }
    
    const snapshot = await query.get();
    
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const nextCursor = snapshot.docs.length === Number(limit) ? snapshot.docs[snapshot.docs.length - 1].id : null;
    res.status(200).json({ data: docs, nextCursor });
  } catch (error: any) {
    console.error(`Error fetching documents from ${collectionName}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getDocument = (collectionName: string) => async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const docRef = db.collection(collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const data = doc.data();

    if (collectionName !== 'bots' && collectionName !== 'admins') {
      const docBotId = data?.botId;
      if (!docBotId || !isBotAuthorized(req, docBotId)) {
         res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
         return;
      }
    } else if (collectionName === 'bots' && req.adminUser?.role !== 'superadmin') {
      if (!isBotAuthorized(req, id)) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
        return;
      }
    }

    res.status(200).json({ id: doc.id, ...data });
  } catch (error: any) {
    console.error(`Error fetching document from ${collectionName}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateDocument = (collectionName: string) => async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const updateData = req.body;

    // Prevent updating botId
    delete updateData.botId;
    updateData.updatedAt = new Date();

    // Prevent manual updating of verification status through generic CRUD
    if (collectionName === 'users' && updateData.hasOwnProperty('isVerified')) {
      if (req.adminUser?.role !== 'superadmin') {
        delete updateData.isVerified;
      }
    }

    const docRef = db.collection(collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    if (collectionName !== 'bots' && collectionName !== 'admins') {
      const docBotId = doc.data()?.botId;
      if (!docBotId || !isBotAuthorized(req, docBotId)) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
        return;
      }
    } else if (collectionName === 'bots' && req.adminUser?.role !== 'superadmin') {
      if (!isBotAuthorized(req, id)) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
        return;
      }
    }

    await docRef.update(updateData);
    res.status(200).json({ message: 'Document updated successfully' });
  } catch (error: any) {
    console.error(`Error updating document in ${collectionName}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteDocument = (collectionName: string) => async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const docRef = db.collection(collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    if (collectionName !== 'bots' && collectionName !== 'admins') {
      const docBotId = doc.data()?.botId;
      if (!docBotId || !isBotAuthorized(req, docBotId)) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
        return;
      }
    } else if (collectionName === 'bots' && req.adminUser?.role !== 'superadmin') {
      if (!isBotAuthorized(req, id)) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this bot' });
        return;
      }
    }

    await docRef.delete();
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting document in ${collectionName}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

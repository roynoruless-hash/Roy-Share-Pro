import { Request, Response, NextFunction } from 'express';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDb } from '../config/firebase.js';

// Extend Express Request type to include the verified user
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        uid: string;
        email?: string;
        role?: string;
        assignedBots: string[];
      };
    }
  }
}

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (getApps().length === 0) {
    res.status(500).json({ error: 'Server misconfiguration: Firebase Admin SDK is not initialized.' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if the user exists in the admins collection
    const db = getDb();
    const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();
    
    if (!adminDoc.exists) {
      res.status(403).json({ error: 'Forbidden: User is not an admin' });
      return;
    }

    const adminData = adminDoc.data() || {};

    req.adminUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: adminData.role || 'viewer', // e.g. superadmin, manager, viewer
      assignedBots: adminData.assignedBots || [],
    };

    next();
  } catch (error) {
    console.error('Admin Auth Error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!roles.includes(req.adminUser.role!)) {
      res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }
    
    next();
  };
};

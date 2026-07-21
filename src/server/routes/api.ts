import { Router } from 'express';
import { requireAdmin, requireRole } from '../middleware/auth.js';
import { apiLimiter, strictLimiter } from '../middleware/rateLimit.js';
import { 
  createDocument, 
  getDocuments, 
  getDocument, 
  updateDocument, 
  deleteDocument 
} from '../controllers/crud.js';

const router = Router();

// Apply global API rate limiter to all /api routes
router.use(apiLimiter);

// Factory to create standard CRUD routes for a collection
const generateCrudRoutes = (collectionName: string) => {
  const collRouter = Router();
  
  // All dashboard CRUD endpoints require admin authentication
  collRouter.use(requireAdmin);

  collRouter.post('/', createDocument(collectionName));
  collRouter.get('/', getDocuments(collectionName));
  collRouter.get('/:id', getDocument(collectionName));
  collRouter.put('/:id', updateDocument(collectionName));
  collRouter.delete('/:id', requireRole(['superadmin', 'manager']), deleteDocument(collectionName));

  collRouter.post('/:id/webhook', async (req, res) => {
    try {
      const { getDb } = await import('../config/firebase.js');
      const db = getDb();
      const doc = await db.collection(collectionName).doc(req.params.id).get();
      const botData = doc.data();
      if (!botData) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }
      
      const token = botData.botToken || botData.token;
      let webhookSecret = botData.webhookSecret;
      if (!webhookSecret) {
        webhookSecret = token.replace(/[^a-zA-Z0-9_-]/g, '');
        await doc.ref.update({ webhookSecret });
      }
      
      let appUrl = process.env.APP_URL;
      if (!appUrl) {
         res.status(400).json({ error: 'APP_URL environment variable is missing' });
         return;
      }
      
      // In AI Studio, the dev URL (ais-dev) requires authentication.
      // We must point Telegram to the shared URL (ais-pre) which is public.
      if (appUrl.includes('ais-dev-')) {
        appUrl = appUrl.replace('ais-dev-', 'ais-pre-');
      }
      
      const webhookUrl = `${appUrl}/webhook/${req.params.id}`;
      
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: webhookSecret
        })
      });
      
      const result = await response.json();
      if (!result.ok) {
        res.status(400).json({ error: result.description || 'Failed to set webhook' });
        return;
      }
      
      await doc.ref.update({ webhookConnected: true });
      res.json({ success: true, message: 'Webhook connected successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  return collRouter;
};

// Register collections
const collections = [
  'bots',
  'users',
  'settings',
  'channels',
  'groups'
];

collections.forEach(collection => {
  router.use(`/${collection}`, generateCrudRoutes(collection));
});

// Read-only endpoints for wallets
const walletsRouter = Router();
walletsRouter.use(requireAdmin);
walletsRouter.get('/', getDocuments('wallets'));
walletsRouter.get('/:id', getDocument('wallets'));
router.use('/wallets', walletsRouter);

// Example of a sensitive endpoint using strict rate limiter
router.post('/withdrawals/request', strictLimiter, (req, res) => {
  // Logic for withdrawal request will go here in later steps
  res.status(501).json({ error: 'Not Implemented Yet' });
});

export default router;

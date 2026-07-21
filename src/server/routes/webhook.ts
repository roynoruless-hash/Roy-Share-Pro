import { Router } from 'express';
import { handleWebhook } from '../bot/manager.js';

const router = Router();

router.post('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    await handleWebhook(botId, req, res);
  } catch (error) {
    console.error(`Webhook error for bot ${req.params.botId}:`, error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;

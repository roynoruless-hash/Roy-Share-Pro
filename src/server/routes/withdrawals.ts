import { Router } from 'express';
import { getDocuments, getDocument } from '../controllers/crud.js';
import { getDb } from '../config/firebase.js';

const router = Router();

router.get('/', getDocuments('withdrawals'));
router.get('/:id', getDocument('withdrawals'));

router.post('/:id/approve', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    await db.runTransaction(async (t) => {
      const withdrawalRef = db.collection('withdrawals').doc(id);
      const withdrawalSnap = await t.get(withdrawalRef);
      
      if (!withdrawalSnap.exists) throw new Error("Withdrawal not found");
      const withdrawal = withdrawalSnap.data()!;
      
      if (withdrawal.status !== 'pending') throw new Error("Withdrawal is not pending");
      
      // We must authorize the user for this bot (crud already checks this for GET but we need to do it here manually)
      if (req.adminUser?.role !== 'superadmin' && req.adminUser?.assignedBots?.includes(withdrawal.botId) === false) {
         throw new Error("Forbidden: You do not have access to this bot");
      }
      
      const userSnap = await db.collection('users')
        .where('botId', '==', withdrawal.botId)
        .where('telegramId', '==', withdrawal.telegramId)
        .limit(1).get();
        
      if (userSnap.empty) throw new Error("User not found");
      const user = userSnap.docs[0].data();
      const walletRef = db.collection('wallets').doc(user.walletId);
      const walletSnap = await t.get(walletRef);
      if (!walletSnap.exists) throw new Error("Wallet not found");
      
      const wallet = walletSnap.data()!;
      
      // Update withdrawal status
      t.update(withdrawalRef, { status: 'approved', updatedAt: new Date() });
      
      // Update wallet: permanent deduct from pending, increment withdrawnAmount
      t.update(walletRef, {
        pendingEarnings: (wallet.pendingEarnings || 0) - withdrawal.amount,
        withdrawnAmount: (wallet.withdrawnAmount || 0) + withdrawal.amount,
        updatedAt: new Date()
      });
      
      const txRef = db.collection('transactions').doc();
      t.set(txRef, {
         botId: withdrawal.botId,
         userId: userSnap.docs[0].id,
         telegramId: withdrawal.telegramId,
         type: 'withdrawal_approved',
         amount: -withdrawal.amount,
         status: 'completed',
         detail: `Withdrawal approved via ${withdrawal.method}`,
         createdAt: new Date()
      });
      
      // We also need to notify the user via Telegram here. We'll try dynamic import of bot instance or fetch API
      const botTokenSnap = await db.collection('bots').doc(withdrawal.botId).get();
      if (botTokenSnap.exists) {
         const token = botTokenSnap.data()!.botToken;
         fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               chat_id: withdrawal.telegramId,
               text: `✅ Your withdrawal request for ₹${withdrawal.amount} has been approved and processed successfully.`
            })
         }).catch(e => console.error("Failed to notify user:", e));
      }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) throw new Error("Reason is required for rejection");
    
    await db.runTransaction(async (t) => {
      const withdrawalRef = db.collection('withdrawals').doc(id);
      const withdrawalSnap = await t.get(withdrawalRef);
      
      if (!withdrawalSnap.exists) throw new Error("Withdrawal not found");
      const withdrawal = withdrawalSnap.data()!;
      
      if (withdrawal.status !== 'pending') throw new Error("Withdrawal is not pending");
      
      if (req.adminUser?.role !== 'superadmin' && req.adminUser?.assignedBots?.includes(withdrawal.botId) === false) {
         throw new Error("Forbidden: You do not have access to this bot");
      }
      
      const userSnap = await db.collection('users')
        .where('botId', '==', withdrawal.botId)
        .where('telegramId', '==', withdrawal.telegramId)
        .limit(1).get();
        
      if (userSnap.empty) throw new Error("User not found");
      const user = userSnap.docs[0].data();
      const walletRef = db.collection('wallets').doc(user.walletId);
      const walletSnap = await t.get(walletRef);
      if (!walletSnap.exists) throw new Error("Wallet not found");
      
      const wallet = walletSnap.data()!;
      
      // Update withdrawal status
      t.update(withdrawalRef, { status: 'rejected', reason, updatedAt: new Date() });
      
      // Update wallet: return funds to balance from pending
      t.update(walletRef, {
        pendingEarnings: (wallet.pendingEarnings || 0) - withdrawal.amount,
        balance: (wallet.balance || 0) + withdrawal.amount,
        updatedAt: new Date()
      });
      
      const txRef = db.collection('transactions').doc();
      t.set(txRef, {
         botId: withdrawal.botId,
         userId: userSnap.docs[0].id,
         telegramId: withdrawal.telegramId,
         type: 'withdrawal_rejected',
         amount: withdrawal.amount,
         status: 'completed',
         detail: `Withdrawal rejected: ${reason}`,
         createdAt: new Date()
      });
      
      const botTokenSnap = await db.collection('bots').doc(withdrawal.botId).get();
      if (botTokenSnap.exists) {
         const token = botTokenSnap.data()!.botToken;
         fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               chat_id: withdrawal.telegramId,
               text: `❌ Your withdrawal request for ₹${withdrawal.amount} has been rejected.\nReason: ${reason}\n\nThe amount has been refunded to your wallet balance.`
            })
         }).catch(e => console.error("Failed to notify user:", e));
      }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

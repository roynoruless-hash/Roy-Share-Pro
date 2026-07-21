import re

with open('src/server/routes/withdrawals.ts', 'r') as f:
    content = f.read()

# For approve:
old_approve = """      // Update wallet: permanent deduct from pending, increment withdrawnAmount
      t.update(walletRef, {
        pendingEarnings: (wallet.pendingEarnings || 0) - withdrawal.amount,
        withdrawnAmount: (wallet.withdrawnAmount || 0) + withdrawal.amount,
        updatedAt: new Date()
      });"""

new_approve = """      // Update wallet: permanent deduct from pending, increment withdrawnAmount
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
      });"""

# For reject:
old_reject = """      // Update wallet: return funds to balance from pending
      t.update(walletRef, {
        pendingEarnings: (wallet.pendingEarnings || 0) - withdrawal.amount,
        balance: (wallet.balance || 0) + withdrawal.amount,
        updatedAt: new Date()
      });"""

new_reject = """      // Update wallet: return funds to balance from pending
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
      });"""

content = content.replace(old_approve, new_approve)
content = content.replace(old_reject, new_reject)

with open('src/server/routes/withdrawals.ts', 'w') as f:
    f.write(content)

print("Withdrawals API patched")

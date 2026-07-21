import re

with open('src/server/bot/setup.ts', 'r') as f:
    content = f.read()

old_code = """                if (rewardAmount > 0) {
                   // Update referrer's wallet inside the same transaction batch
                   const { FieldValue } = await import('firebase-admin/firestore');
                   referrerWalletRef = db.collection('wallets').doc(referrer.walletId);
                   batch.update(referrerWalletRef, {
                      balance: FieldValue.increment(rewardAmount),
                      totalEarnings: FieldValue.increment(rewardAmount),
                      updatedAt: new Date()
                   });
                }"""

new_code = """                if (rewardAmount > 0) {
                   // Update referrer's wallet inside the same transaction batch
                   const { FieldValue } = await import('firebase-admin/firestore');
                   referrerWalletRef = db.collection('wallets').doc(referrer.walletId);
                   batch.update(referrerWalletRef, {
                      balance: FieldValue.increment(rewardAmount),
                      totalEarnings: FieldValue.increment(rewardAmount),
                      updatedAt: new Date()
                   });
                   const transactionRef = db.collection('transactions').doc();
                   batch.set(transactionRef, {
                      botId: ctx.botId,
                      userId: referrerSnap.docs[0].id,
                      telegramId: referrer.telegramId,
                      type: 'referral_bonus',
                      amount: rewardAmount,
                      status: 'completed',
                      detail: `Referral bonus for @${ctx.from?.username || ctx.from?.first_name || ctx.from?.id}`,
                      createdAt: new Date()
                   });
                }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/server/bot/setup.ts', 'w') as f:
        f.write(content)
    print("Referral transaction patched")
else:
    print("Could not find referral code block")

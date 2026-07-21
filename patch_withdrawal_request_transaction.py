import re

with open('src/server/bot/setup.ts', 'r') as f:
    content = f.read()

old_code = """              // 5. Create the new withdrawal request
              const withdrawRef = db.collection('withdrawals').doc();
              t.set(withdrawRef, {
                 botId: ctx.botId,
                 userId: userSnap.docs[0].id,
                 telegramId: user.telegramId,
                 fullName: user.fullName,
                 telegramUsername: user.telegramUsername,
                 amount: amount,
                 method: method,
                 methodDetail: method === 'UPI' ? ctx.session.tempUpiId : null,
                 status: 'pending',
                 createdAt: new Date(),
                 updatedAt: new Date()
              });"""

new_code = """              // 5. Create the new withdrawal request
              const withdrawRef = db.collection('withdrawals').doc();
              t.set(withdrawRef, {
                 botId: ctx.botId,
                 userId: userSnap.docs[0].id,
                 telegramId: user.telegramId,
                 fullName: user.fullName,
                 telegramUsername: user.telegramUsername,
                 amount: amount,
                 method: method,
                 methodDetail: method === 'UPI' ? ctx.session.tempUpiId : null,
                 status: 'pending',
                 createdAt: new Date(),
                 updatedAt: new Date()
              });
              
              // 6. Create transaction record
              const txRef = db.collection('transactions').doc();
              t.set(txRef, {
                 botId: ctx.botId,
                 userId: userSnap.docs[0].id,
                 telegramId: user.telegramId,
                 type: 'withdrawal_request',
                 amount: -amount,
                 status: 'pending',
                 detail: `Withdrawal via ${method}`,
                 createdAt: new Date()
              });"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/server/bot/setup.ts', 'w') as f:
        f.write(content)
    print("Withdrawal request transaction patched")
else:
    print("Could not find withdrawal request code block")

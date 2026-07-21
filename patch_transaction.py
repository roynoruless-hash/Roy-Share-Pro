import re

with open('src/server/bot/setup.ts', 'r') as f:
    content = f.read()

# Replace the transaction block with one that checks pending withdrawals
old_tx = """           await db.runTransaction(async (t) => {
              const walletSnap = await t.get(walletRef);
              if (!walletSnap.exists) throw new Error("Wallet not found.");
              const wallet = walletSnap.data()!;
              
              if (wallet.balance < amount) {
                  throw new Error(`Insufficient balance. Your current balance is ${wallet.balance}.`);
              }
              
              // Move balance to pendingEarnings
              t.update(walletRef, {
                 balance: wallet.balance - amount,
                 pendingEarnings: (wallet.pendingEarnings || 0) + amount,
                 updatedAt: new Date()
              });
              
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
           });"""

new_tx = """           await db.runTransaction(async (t) => {
              // 1. Check for any existing pending withdrawals for this user within the transaction
              const pendingQuery = db.collection('withdrawals')
                 .where('botId', '==', ctx.botId)
                 .where('telegramId', '==', user.telegramId)
                 .where('status', '==', 'pending')
                 .limit(1);
                 
              const pendingSnap = await t.get(pendingQuery);
              if (!pendingSnap.empty) {
                 throw new Error("You already have a pending withdrawal. Please wait for it to be processed.");
              }

              // 2. Read the wallet fresh inside the transaction
              const walletSnap = await t.get(walletRef);
              if (!walletSnap.exists) throw new Error("Wallet not found.");
              const wallet = walletSnap.data()!;
              
              // 3. Prevent negative balance
              if (wallet.balance < amount) {
                  throw new Error(`Insufficient balance. Your current balance is ${wallet.balance}.`);
              }
              
              // 4. Safely deduct from balance and move to pendingEarnings
              t.update(walletRef, {
                 balance: wallet.balance - amount,
                 pendingEarnings: (wallet.pendingEarnings || 0) + amount,
                 updatedAt: new Date()
              });
              
              // 5. Create the new withdrawal request
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
           });"""

if old_tx in content:
    content = content.replace(old_tx, new_tx)
    with open('src/server/bot/setup.ts', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find the old transaction block")

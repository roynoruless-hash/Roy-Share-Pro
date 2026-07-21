import re

with open('src/server/bot/setup.ts', 'r') as f:
    content = f.read()

withdraw_callbacks = """
  bot.callbackQuery(['withdraw_upi', 'withdraw_redeem'], async (ctx) => {
    const db = getDb();
    const method = ctx.match === 'withdraw_upi' ? 'UPI' : 'Redeem Code';
    
    // Check pending withdrawals
    const pendingSnap = await db.collection('withdrawals')
      .where('botId', '==', ctx.botId)
      .where('telegramId', '==', ctx.from?.id)
      .where('status', '==', 'pending')
      .limit(1).get();
      
    if (!pendingSnap.empty) {
      await ctx.answerCallbackQuery({ text: "You already have a pending withdrawal.", show_alert: true });
      return;
    }
    
    if (method === 'UPI') {
       ctx.session.state = 'awaiting_withdraw_upi_id';
       await ctx.reply("Please enter your UPI ID:");
    } else {
       ctx.session.state = 'awaiting_withdraw_amount_redeem';
       await ctx.reply("Please enter the amount you want to withdraw for Redeem Code:");
    }
    await ctx.answerCallbackQuery();
  });
"""

content = content.replace("bot.on('message:text', async (ctx) => {", withdraw_callbacks + "\n  bot.on('message:text', async (ctx) => {")

withdraw_state_handling = """
    if (state === 'awaiting_withdraw_upi_id') {
      ctx.session.tempUpiId = text;
      ctx.session.state = 'awaiting_withdraw_amount_upi';
      await ctx.reply("Great! Now enter the amount you want to withdraw:");
      return;
    }

    if (state === 'awaiting_withdraw_amount_upi' || state === 'awaiting_withdraw_amount_redeem') {
       const amount = parseFloat(text);
       if (isNaN(amount) || amount <= 0) {
          await ctx.reply("Please enter a valid amount greater than 0.");
          return;
       }
       
       const method = state === 'awaiting_withdraw_amount_upi' ? 'UPI' : 'Redeem Code';
       
       const settingsSnap = await db.collection('settings').doc(ctx.botId).get();
       const settings = settingsSnap.exists ? settingsSnap.data() : {};
       const minWithdrawal = method === 'UPI' ? (settings?.upiMinWithdrawal || 10) : (settings?.redeemMinWithdrawal || 50);
       
       if (amount < minWithdrawal) {
          await ctx.reply(`Minimum withdrawal for ${method} is ${minWithdrawal}. Please enter a valid amount.`);
          return;
       }
       
       // Verify user & wallet
       const userSnap = await db.collection('users')
         .where('botId', '==', ctx.botId)
         .where('telegramId', '==', ctx.from?.id)
         .limit(1).get();
         
       if (userSnap.empty) return;
       const user = userSnap.docs[0].data();
       
       const walletRef = db.collection('wallets').doc(user.walletId);
       
       try {
           await db.runTransaction(async (t) => {
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
           });
           
           ctx.session.state = 'registered';
           ctx.session.tempUpiId = undefined;
           await ctx.reply(`✅ Withdrawal request for ${amount} via ${method} has been submitted successfully.\nIt will be processed shortly.`);
           const { sendMainMenu } = await import('./menus/main.js');
           await sendMainMenu(ctx);
       } catch (err: any) {
           await ctx.reply(`❌ ${err.message}`);
           ctx.session.state = 'registered';
           ctx.session.tempUpiId = undefined;
       }
       
       return;
    }
"""

content = content.replace("if (state === 'registered') {", withdraw_state_handling + "\n    if (state === 'registered') {")

with open('src/server/bot/setup.ts', 'w') as f:
    f.write(content)


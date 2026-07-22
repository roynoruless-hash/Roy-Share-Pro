import { Bot, session } from 'grammy';
import bcrypt from 'bcryptjs';
import { CustomContext } from './context.js';
import { firestoreStorage } from './session.js';
import { getDb } from '../config/firebase.js';
import { checkMembership, checkMembershipSilent } from './middleware/membership.js';
import { sendMainMenu, handleMenuText, sendHowItWorks } from './menus/main.js';

export function setupBot(bot: Bot<CustomContext>) {
  bot.use(session({
    initial: () => ({}),
    storage: firestoreStorage(),
    getSessionKey: (ctx) => {
      return ctx.chat?.id === undefined ? undefined : `${ctx.botId}_${ctx.chat.id}`;
    }
  }));

  // Global ban check middleware
  bot.use(async (ctx, next) => {
    console.log('--- GLOBAL BAN CHECK ---');
    const telegramId = ctx.from?.id;
    if (telegramId) {
      const db = getDb();
      const userSnap = await db.collection('users')
        .where('botId', '==', ctx.botId)
        .where('telegramId', '==', telegramId)
        .limit(1).get();
        
      if (!userSnap.empty) {
        const user = userSnap.docs[0].data();
        if (user.status === 'banned') {
          if (ctx.callbackQuery) {
            await ctx.answerCallbackQuery({ text: 'Your account has been banned.', show_alert: true }).catch(() => {});
          } else if (ctx.message) {
            await ctx.reply('⛔ Your account has been banned from using this bot.').catch(() => {});
          }
          return; // Stop propagation
        }
      }
    }
    await next();
  });


  bot.command('start', async (ctx) => {
    console.log('--- START COMMAND TRIGGERED ---');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    
    const db = getDb();
    
    const usersSnapshot = await db.collection('users')
      .where('botId', '==', ctx.botId)
      .where('telegramId', '==', telegramId)
      .limit(1).get();
      
    if (!usersSnapshot.empty && usersSnapshot.docs[0].data().isVerified) {
      ctx.session.state = 'registered';
      return sendMainMenu(ctx);
    }

    const payload = ctx.match;
    if (payload && payload.startsWith('ref_')) {
      const referrerIdStr = payload.replace('ref_', '');
      ctx.session.referredBy = referrerIdStr;
      
      const referrerIdNum = Number(referrerIdStr);
      if (!isNaN(referrerIdNum) && referrerIdNum !== telegramId) {
        const existingRef = await db.collection('referrals')
          .where('botId', '==', ctx.botId)
          .where('referrerId', '==', referrerIdNum)
          .where('referredUserId', '==', telegramId)
          .limit(1).get();
          
        if (existingRef.empty) {
          await db.collection('referrals').add({
            botId: ctx.botId,
            referrerId: referrerIdNum,
            referredUserId: telegramId,
            status: 'pending',
            rewardAmount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    const isMember = await checkMembership(ctx);
    if (!isMember) return;
    
    ctx.session.state = 'awaiting_name';
    await ctx.reply("Welcome! Please enter your Full Name to register:");
  });

  bot.callbackQuery('check_joined', async (ctx) => {
    const isMember = await checkMembership(ctx);
    if (isMember) {
      await ctx.answerCallbackQuery("Thanks for joining!");
      
      const db = getDb();
      const usersSnapshot = await db.collection('users')
        .where('botId', '==', ctx.botId)
        .where('telegramId', '==', ctx.from?.id)
        .limit(1).get();
        
      if (!usersSnapshot.empty && usersSnapshot.docs[0].data().isVerified) {
        ctx.session.state = 'registered';
        await sendMainMenu(ctx);
      } else {
        ctx.session.state = 'awaiting_name';
        await ctx.reply("Welcome! Please enter your Full Name to register:");
      }
    } else {
      await ctx.answerCallbackQuery({ text: "You haven't joined all required channels yet.", show_alert: true });
    }
  });

  
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

  bot.on('message:text', async (ctx) => {
    const state = ctx.session.state;
    const text = ctx.message.text.trim();
    const db = getDb();

    if (state === 'awaiting_name') {
      ctx.session.tempName = text;
      ctx.session.state = 'awaiting_phone';
      await ctx.reply("Great! Now, please enter your Mobile Number:");
      return;
    }

    if (state === 'awaiting_phone') {
      if (!/^\+?[0-9]{10,15}$/.test(text)) {
         await ctx.reply("Please enter a valid mobile number.");
         return;
      }

      // Check OTP rate limits (1 per min, max 5 per hour)
      const now = Date.now();
      const oneMinAgo = new Date(now - 60 * 1000);
      const oneHourAgo = new Date(now - 60 * 60 * 1000);

      const allOtpsSnap = await db.collection('otpVerifications')
        .where('botId', '==', ctx.botId)
        .where('telegramId', '==', ctx.from?.id)
        .get();

      let lastMinCount = 0;
      let lastHourCount = 0;

      allOtpsSnap.forEach(doc => {
        const createdAt = doc.data().createdAt.toDate();
        if (createdAt >= oneHourAgo) {
          lastHourCount++;
        }
        if (createdAt >= oneMinAgo) {
          lastMinCount++;
        }
      });

      if (lastMinCount >= 1) {
         await ctx.reply("Please wait at least 1 minute before requesting another OTP.");
         return;
      }
      if (lastHourCount >= 5) {
         await ctx.reply("You have reached the maximum number of OTP requests (5 per hour). Please try again later.");
         return;
      }

      const existing = await db.collection('users')
         .where('botId', '==', ctx.botId)
         .where('mobileNumber', '==', text)
         .where('isVerified', '==', true)
         .limit(1).get();
         
      if (!existing.empty) {
         await ctx.reply("This mobile number is already registered. Please use another one.");
         return;
      }

      ctx.session.tempPhone = text;
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      const hashedOtp = await bcrypt.hash(otp, 10);
      
      const otpRef = db.collection('otpVerifications').doc();
      await otpRef.set({
        botId: ctx.botId,
        telegramId: ctx.from?.id,
        otp: hashedOtp,
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
        verifiedAt: null
      });

      ctx.session.state = 'awaiting_otp';
      await ctx.reply(`Your OTP is: ${otp}\n\nPlease reply with this 6-digit code to verify your account. It expires in 5 minutes.`);
      return;
    }

    if (state === 'awaiting_otp') {
       const allOtpDocs = await db.collection('otpVerifications')
          .where('botId', '==', ctx.botId)
          .where('telegramId', '==', ctx.from?.id)
          .get();

       const pendingOtps = allOtpDocs.docs
          .filter(doc => doc.data().verifiedAt === null)
          .sort((a, b) => b.data().expiresAt.toDate().getTime() - a.data().expiresAt.toDate().getTime());

       if (pendingOtps.length === 0) {
          await ctx.reply("No active OTP request found. Please start over with /start.");
          ctx.session.state = undefined;
          return;
       }

       const otpDoc = pendingOtps[0];
       const otpData = otpDoc.data();

       if (otpData.expiresAt.toDate() < new Date()) {
          await ctx.reply("Your OTP has expired. Please /start again.");
          ctx.session.state = undefined;
          return;
       }

       if (otpData.attempts >= 5) {
          await ctx.reply("Too many failed attempts. Please /start again.");
          ctx.session.state = undefined;
          return;
       }

       const isValid = await bcrypt.compare(text, otpData.otp);
       
       if (!isValid) {
          await otpDoc.ref.update({ attempts: otpData.attempts + 1 });
          await ctx.reply("Invalid OTP. Please try again.");
          return;
       }

       await otpDoc.ref.update({ verifiedAt: new Date() });
       
       // Confirm duplicate Telegram ID isn't already verified
       const existingUserSnap = await db.collection('users')
         .where('botId', '==', ctx.botId)
         .where('telegramId', '==', ctx.from?.id)
         .where('isVerified', '==', true)
         .limit(1).get();
         
       if (!existingUserSnap.empty) {
         await ctx.reply("This Telegram account is already registered.");
         ctx.session.state = 'registered';
         return;
       }

       const userRef = db.collection('users').doc();
       const userId = userRef.id;
       const walletRef = db.collection('wallets').doc();

       let pendingReferralRef: any = null;
       if (ctx.session.referredBy) {
          const referredByNum = Number(ctx.session.referredBy);
          if (!isNaN(referredByNum)) {
             const existingRefSnap = await db.collection('referrals')
                .where('botId', '==', ctx.botId)
                .where('referrerId', '==', referredByNum)
                .where('referredUserId', '==', ctx.from?.id)
                .where('status', '==', 'pending')
                .limit(1).get();
             if (!existingRefSnap.empty) {
                pendingReferralRef = existingRefSnap.docs[0].ref;
             }
          }
       }

       const batch = db.batch();
       
       batch.set(userRef, {
          botId: ctx.botId,
          telegramId: ctx.from?.id,
          telegramUsername: ctx.from?.username || null,
          fullName: ctx.session.tempName,
          mobileNumber: ctx.session.tempPhone,
          isVerified: true,
          walletId: walletRef.id,
          referredBy: ctx.session.referredBy || null,
          status: 'active',
          joinDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
       });

       batch.set(walletRef, {
          botId: ctx.botId,
          userId: userId,
          balance: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
          withdrawnAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
       });

       let referrerId: number | null = null;
       let rewardAmount = 0;
       let referrerWalletRef: any = null;

       if (ctx.session.referredBy) {
          const referredByNum = Number(ctx.session.referredBy);
          
          const referrerSnap = await db.collection('users')
             .where('botId', '==', ctx.botId)
             .where('telegramId', '==', referredByNum)
             .where('isVerified', '==', true)
             .limit(1).get();
             
          if (!referrerSnap.empty) {
             const referrer = referrerSnap.docs[0].data();
             
             // Verify membership right before crediting
             const stillMember = await checkMembershipSilent(ctx);
             
             // Fetch reward amount from settings
             const settingsSnap = await db.collection('settings').doc(ctx.botId).get();
             const configuredReward = settingsSnap.exists ? (settingsSnap.data()?.referralReward || 0) : 0;
             
             if (stillMember) {
                referrerId = referrer.telegramId;
                rewardAmount = configuredReward;
                
                const referralRef = pendingReferralRef || db.collection('referrals').doc();
                batch.set(referralRef, {
                   botId: ctx.botId,
                   referrerId: referrer.telegramId,
                   referredUserId: ctx.from?.id,
                   status: 'completed', // Auto-completed because they verified and are members
                   rewardAmount: rewardAmount,
                   createdAt: new Date(),
                   updatedAt: new Date()
                }, { merge: true });
                
                if (rewardAmount > 0) {
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
                }
             } else {
                // Not a member anymore, keep it as failed/pending and don't credit
                const referralRef = pendingReferralRef || db.collection('referrals').doc();
                batch.set(referralRef, {
                   botId: ctx.botId,
                   referrerId: referrer.telegramId,
                   referredUserId: ctx.from?.id,
                   status: 'failed',
                   rewardAmount: 0,
                   reason: 'User left mandatory channels before completing registration',
                   createdAt: new Date(),
                   updatedAt: new Date()
                }, { merge: true });
             }
          }
       }

       await batch.commit();

       // Asynchronously notify referrer if they got a reward
       if (referrerId && rewardAmount > 0) {
          ctx.api.sendMessage(referrerId, `🎉 Congratulations! Your referral has registered successfully.\nYou have earned ${rewardAmount} as a reward!`).catch(console.error);
       }

       ctx.session.state = 'registered';
       await ctx.reply("Registration successful! 🎉");
       await sendHowItWorks(ctx);
       await sendMainMenu(ctx);
       return;
    }

    
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
              });
           });
           
           ctx.session.state = 'registered';
           ctx.session.tempUpiId = undefined;
           await ctx.reply(`✅ Withdrawal request for ${amount} via ${method} has been submitted successfully.
It will be processed shortly.`);
           
           await sendMainMenu(ctx);
       } catch (err: any) {
           await ctx.reply(`❌ ${err.message}`);
           ctx.session.state = 'registered';
           ctx.session.tempUpiId = undefined;
       }
       
       return;
    }

    if (state === 'registered') {
       return handleMenuText(ctx, text);
    }
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    console.error("Bot Error:", e);
  });
}

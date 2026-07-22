import { Keyboard } from 'grammy';
import { CustomContext } from '../context.js';
import { getDb } from '../../config/firebase.js';

export async function sendMainMenu(ctx: CustomContext) {
  const keyboard = new Keyboard()
    .text('💰 Balance').text('👥 Refer & Earn').row()
    .text('💸 Withdraw').text('🚀 Earn Money').row()
    .text('👤 Profile').text('📊 History').row()
    .text('ℹ️ How it Works').text('📞 Support').row()
    .resized();
    
  await ctx.reply("Main Menu:", { reply_markup: keyboard });
}

export async function sendHowItWorks(ctx: CustomContext) {
  const helpText = `🤖 *Welcome to our Rewards Bot!*

Here is a quick guide on how to use this bot to earn and withdraw funds:

*1. 👥 Refer & Earn*
Share your unique referral link with your friends. When they join using your link, you instantly earn a referral bonus! Check the 'Refer & Earn' menu for your link.

*2. 💰 Balance & 👤 Profile*
Track your current wallet balance, total earnings, pending earnings, and withdrawn amount in the 'Balance' tab. View your account status in 'Profile'.

*3. 💸 Withdraw*
Once you reach the minimum withdrawal amount, you can request a payout. 
• *UPI*: Get funds directly to your bank account.
• *Redeem Code*: Get Play Store / App Store gift cards.

*4. 📊 History*
Keep track of all your earnings, withdrawals, and referral bonuses in the 'History' tab.

*5. 📞 Support*
Need help? Contact our support team via the 'Support' menu.

🚀 *Start earning today by sharing your referral link!*`;

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}

export async function handleMenuText(ctx: CustomContext, text: string) {
  const db = getDb();
  const telegramId = ctx.from?.id;

  if (text === '💰 Balance' || text === '👤 Profile') {
     const userSnap = await db.collection('users')
       .where('botId', '==', ctx.botId)
       .where('telegramId', '==', telegramId)
       .limit(1).get();

     if (userSnap.empty) return;
     const user = userSnap.docs[0].data();

     const walletSnap = await db.collection('wallets').doc(user.walletId).get();
     const wallet = walletSnap.data();

     if (text === '💰 Balance') {
       const balanceText = `💰 *Your Wallet Balance*

💵 Wallet Balance: ${wallet?.balance || 0}
📈 Total Earnings: ${wallet?.totalEarnings || 0}
⏳ Pending Earnings: ${wallet?.pendingEarnings || 0}
💸 Withdrawn Amount: ${wallet?.withdrawnAmount || 0}

👤 Telegram Username: @${user.telegramUsername || 'N/A'}
🆔 Telegram ID: ${user.telegramId}
✅ Account Status: ${user.status}
📅 Join Date: ${user.joinDate.toDate().toLocaleDateString()}`;

       await ctx.reply(balanceText, { parse_mode: 'Markdown' });
     } else if (text === '👤 Profile') {
       const profileText = `👤 *Your Profile*

Name: ${user.fullName}
Mobile: ${user.mobileNumber}
Username: @${user.telegramUsername || 'N/A'}
ID: ${user.telegramId}
Status: ${user.status}`;

       await ctx.reply(profileText, { parse_mode: 'Markdown' });
     }
     return;
  }

  if (text === '👥 Refer & Earn') {
     const settingsSnap = await db.collection('settings').doc(ctx.botId).get();
     const rewardAmount = settingsSnap.exists ? (settingsSnap.data()?.referralReward || 0) : 0;

     const referralsSnap = await db.collection('referrals')
       .where('botId', '==', ctx.botId)
       .where('referrerId', '==', telegramId)
       .get();
     
     let completedCount = 0;
     let pendingCount = 0;
     let totalEarned = 0;

     referralsSnap.docs.forEach(doc => {
       const data = doc.data();
       if (data.status === 'completed') {
         completedCount++;
         totalEarned += (data.rewardAmount || 0);
       } else if (data.status === 'pending') {
         pendingCount++;
       }
     });

     const botUsername = ctx.me.username;
     const referralLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;

     const textMsg = `👥 *Refer & Earn*\n\nShare your unique referral link with your friends and earn *${rewardAmount}* for each successful registration!\n\n🔗 *Your Referral Link:*\n\`${referralLink}\`\n\n📊 *Your Statistics:*\n✅ Total Successful Referrals: ${completedCount}\n⏳ Pending Referrals: ${pendingCount}\n💰 Total Earned from Referrals: ${totalEarned}`;

     await ctx.reply(textMsg, { parse_mode: 'Markdown' });
     return;
  }

  if (text === '💸 Withdraw') {
     const settingsSnap = await db.collection('settings').doc(ctx.botId).get();
     const settings = settingsSnap.exists ? settingsSnap.data() : {};
     
     if (settings?.withdrawalsEnabled === false) {
       await ctx.reply("Withdrawals are currently disabled.");
       return;
     }

     const userSnap = await db.collection('users')
       .where('botId', '==', ctx.botId)
       .where('telegramId', '==', telegramId)
       .limit(1).get();
     
     if (userSnap.empty) return;
     const user = userSnap.docs[0].data();
     const walletSnap = await db.collection('wallets').doc(user.walletId).get();
     const wallet = walletSnap.data();
     
     const upiMin = settings?.upiMinWithdrawal || 10;
     const redeemMin = settings?.redeemMinWithdrawal || 50;

     const textMsg = `💸 *Withdraw Funds*\n\nYour Current Balance: *${wallet?.balance || 0}*\n\nSelect a withdrawal method below:\n- UPI (Min: ${upiMin})\n- Redeem Code (Min: ${redeemMin})`;
     
     const { InlineKeyboard } = await import('grammy');
     const inlineKeyboard = new InlineKeyboard()
       .text('UPI', 'withdraw_upi').row()
       .text('Redeem Code', 'withdraw_redeem');
       
     await ctx.reply(textMsg, { parse_mode: 'Markdown', reply_markup: inlineKeyboard });
     return;
  }


  if (text === '📊 History') {
     let txSnap;
     try {
       txSnap = await db.collection('transactions')
         .where('botId', '==', ctx.botId)
         .where('telegramId', '==', telegramId)
         .orderBy('createdAt', 'desc')
         .limit(15)
         .get();
     } catch (e: any) {
       console.error("History query failed (likely missing index):", e);
       await ctx.reply("Error fetching history. The database is currently optimizing. Please try again later.");
       return;
     }
       
     if (txSnap.empty) {
        await ctx.reply("No transactions found in your history.");
        return;
     }
     
     let historyText = `📊 *Your Transaction History* (Last 15)\n\n`;
     txSnap.docs.forEach((doc, index) => {
        const tx = doc.data();
        const date = tx.createdAt ? new Date(tx.createdAt._seconds ? tx.createdAt._seconds * 1000 : (tx.createdAt.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt)).toLocaleDateString() : 'N/A';
        const sign = tx.amount > 0 ? '+' : '';
        const amountStr = `${sign}${tx.amount}`;
        const typeIcon = tx.type === 'referral_bonus' ? '🎁' : 
                         tx.type === 'withdrawal_request' ? '⏳' :
                         tx.type === 'withdrawal_approved' ? '✅' :
                         tx.type === 'withdrawal_rejected' ? '❌' : '🔹';
                         
        historyText += `${index + 1}. ${typeIcon} *${amountStr}* | ${date}\n`;
        if (tx.detail) {
           historyText += `   └ ${tx.detail}\n`;
        }
     });
     
     await ctx.reply(historyText, { parse_mode: 'Markdown' });
     return;
  }


  if (text === '📞 Support') {
     const settingsSnap = await db.collection('settings').doc(ctx.botId).get();
     let supportUsername = '';
     let supportEmail = '';
     
     if (settingsSnap.exists) {
        const settings = settingsSnap.data()!;
        supportUsername = settings.supportUsername || '';
        supportEmail = settings.supportEmail || '';
     }
     
     if (!supportUsername && !supportEmail) {
        await ctx.reply("📞 Support is currently unavailable. Please check back later.");
        return;
     }
     
     let supportMsg = `📞 Need help? Contact us:\n\n`;
     if (supportUsername) {
        supportMsg += `Username: ${supportUsername}\n`;
     }
     if (supportEmail) {
        supportMsg += `Email: ${supportEmail}\n`;
     }
     
     await ctx.reply(supportMsg);
     return;
  }

  if (text === 'ℹ️ How it Works') {
     await sendHowItWorks(ctx);
     return;
  }

  // Stub other handlers
  const stubs: Record<string, string> = {
    '🚀 Earn Money': 'Earn Money modules coming soon.'
  };

  if (stubs[text]) {
    await ctx.reply(stubs[text]);
  } else {
    // Unknown command, resend menu
    await sendMainMenu(ctx);
  }
}

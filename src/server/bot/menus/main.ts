import { Keyboard } from 'grammy';
import { CustomContext } from '../context.js';
import { getDb } from '../../config/firebase.js';

export async function sendMainMenu(ctx: CustomContext) {
  const keyboard = new Keyboard()
    .text('💰 Balance').text('👥 Refer & Earn').row()
    .text('💸 Withdraw').text('🚀 Earn Money').row()
    .text('👤 Profile').text('📊 History').row()
    .text('📞 Support')
    .resized();
    
  await ctx.reply("Main Menu:", { reply_markup: keyboard });
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

  // Stub other handlers
  const stubs: Record<string, string> = {
    '💸 Withdraw': 'Withdrawal module coming soon.',
    '🚀 Earn Money': 'Earn Money modules coming soon.',
    '📊 History': 'History module coming soon.',
    '📞 Support': 'Support module coming soon.'
  };

  if (stubs[text]) {
    await ctx.reply(stubs[text]);
  } else {
    // Unknown command, resend menu
    await sendMainMenu(ctx);
  }
}

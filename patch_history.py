import re

with open('src/server/bot/menus/main.ts', 'r') as f:
    content = f.read()

history_handler = """
  if (text === '📊 History') {
     const txSnap = await db.collection('transactions')
       .where('botId', '==', ctx.botId)
       .where('telegramId', '==', telegramId)
       .orderBy('createdAt', 'desc')
       .limit(15)
       .get();
       
     if (txSnap.empty) {
        await ctx.reply("No transactions found in your history.");
        return;
     }
     
     let historyText = `📊 *Your Transaction History* (Last 15)\\n\\n`;
     txSnap.docs.forEach((doc, index) => {
        const tx = doc.data();
        const date = tx.createdAt ? new Date(tx.createdAt._seconds ? tx.createdAt._seconds * 1000 : (tx.createdAt.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt)).toLocaleDateString() : 'N/A';
        const sign = tx.amount > 0 ? '+' : '';
        const amountStr = `${sign}${tx.amount}`;
        const typeIcon = tx.type === 'referral_bonus' ? '🎁' : 
                         tx.type === 'withdrawal_request' ? '⏳' :
                         tx.type === 'withdrawal_approved' ? '✅' :
                         tx.type === 'withdrawal_rejected' ? '❌' : '🔹';
                         
        historyText += `${index + 1}. ${typeIcon} *${amountStr}* | ${date}\\n`;
        if (tx.detail) {
           historyText += `   └ ${tx.detail}\\n`;
        }
     });
     
     await ctx.reply(historyText, { parse_mode: 'Markdown' });
     return;
  }
"""

stub_replace = """  // Stub other handlers
  const stubs: Record<string, string> = {
    '🚀 Earn Money': 'Earn Money modules coming soon.',
    '📞 Support': 'Support module coming soon.'
  };"""

content = content.replace("  // Stub other handlers", history_handler + "\n  // Stub other handlers")
content = content.replace("""  // Stub other handlers
  const stubs: Record<string, string> = {
    '🚀 Earn Money': 'Earn Money modules coming soon.',
    '📊 History': 'History module coming soon.',
    '📞 Support': 'Support module coming soon.'
  };""", stub_replace)

with open('src/server/bot/menus/main.ts', 'w') as f:
    f.write(content)

print("History menu patched")

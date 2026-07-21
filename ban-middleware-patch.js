const fs = require('fs');
const file = 'src/server/bot/setup.ts';
let code = fs.readFileSync(file, 'utf8');

const injection = `
  // Global ban check middleware
  bot.use(async (ctx, next) => {
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
`;

code = code.replace(
  "    }\n  }));",
  "    }\n  }));\n" + injection
);

fs.writeFileSync(file, code);

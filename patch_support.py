import re

with open('src/server/bot/menus/main.ts', 'r') as f:
    content = f.read()

support_handler = """
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
     
     let supportMsg = `📞 *Need help? Contact us:*\\n\\n`;
     if (supportUsername) {
        supportMsg += `Username: ${supportUsername}\\n`;
     }
     if (supportEmail) {
        supportMsg += `Email: ${supportEmail}\\n`;
     }
     
     await ctx.reply(supportMsg, { parse_mode: 'Markdown' });
     return;
  }
"""

content = content.replace("  // Stub other handlers", support_handler + "\n  // Stub other handlers")
content = content.replace("    '📞 Support': 'Support module coming soon.'", "")
# clean up any trailing comma in stubs
content = re.sub(r"'🚀 Earn Money': 'Earn Money modules coming soon.',\s*};", "'🚀 Earn Money': 'Earn Money modules coming soon.'\n  };", content)

with open('src/server/bot/menus/main.ts', 'w') as f:
    f.write(content)

print("Support menu patched")

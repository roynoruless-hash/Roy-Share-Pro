import re

with open('src/server/bot/menus/main.ts', 'r') as f:
    content = f.read()

old_msg = """     let supportMsg = `📞 *Need help? Contact us:*\\n\\n`;
     if (supportUsername) {
        supportMsg += `Username: ${supportUsername}\\n`;
     }
     if (supportEmail) {
        supportMsg += `Email: ${supportEmail}\\n`;
     }
     
     await ctx.reply(supportMsg, { parse_mode: 'Markdown' });"""

new_msg = """     let supportMsg = `📞 Need help? Contact us:\\n\\n`;
     if (supportUsername) {
        supportMsg += `Username: ${supportUsername}\\n`;
     }
     if (supportEmail) {
        supportMsg += `Email: ${supportEmail}\\n`;
     }
     
     await ctx.reply(supportMsg);"""

content = content.replace(old_msg, new_msg)

with open('src/server/bot/menus/main.ts', 'w') as f:
    f.write(content)

print("Support menu markdown patched")

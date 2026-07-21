import re

with open('src/server/bot/middleware/membership.ts', 'r') as f:
    content = f.read()

new_func = """
export async function checkMembership(ctx: CustomContext): Promise<boolean> {
  const db = getDb();
  const botId = ctx.botId;
  const userId = ctx.from?.id;
  
  if (!userId) return false;

  const channelsSnap = await db.collection('channels').where('botId', '==', botId).get();
  const groupsSnap = await db.collection('groups').where('botId', '==', botId).get();

  const mandatoryChats: any[] = [
    ...channelsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter(c => c.isMandatory === true),
    ...groupsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter(g => g.isMandatory === true)
  ];

  if (mandatoryChats.length === 0) return true;

  const notJoined: any[] = [];

  for (const chat of mandatoryChats) {
    try {
      const parsedChatId = !isNaN(Number(chat.chatId)) ? Number(chat.chatId) : chat.chatId;
      const member = await ctx.api.getChatMember(parsedChatId, userId);
      const status = member.status;
      
      if (status === 'left' || status === 'kicked') {
        notJoined.push(chat);
      }
    } catch (e: any) {
      console.error(`Error checking membership for ${chat.name} (${chat.chatId}):`, e.message);
      // If the bot cannot access the chat or the user isn't found, require join.
      notJoined.push(chat);
    }
  }

  if (notJoined.length > 0) {
    const keyboard = new InlineKeyboard();
    notJoined.forEach(chat => {
      keyboard.url(`Join ${chat.name}`, chat.inviteLink).row();
    });
    keyboard.text("✅ I have joined", "check_joined");
    
    await ctx.reply("You must join our official channels/groups before using this bot:", { reply_markup: keyboard });
    return false;
  }

  return true;
}
"""

content = re.sub(r'export async function checkMembership\(ctx: CustomContext\): Promise<boolean> \{.*$', new_func, content, flags=re.DOTALL)

with open('src/server/bot/middleware/membership.ts', 'w') as f:
    f.write(content)

import re

with open('src/server/bot/middleware/membership.ts', 'r') as f:
    content = f.read()

new_func = """
export async function checkMembershipSilent(ctx: CustomContext): Promise<boolean> {
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

  for (const chat of mandatoryChats) {
    try {
      const parsedChatId = !isNaN(Number(chat.chatId)) ? Number(chat.chatId) : chat.chatId;
      const member = await ctx.api.getChatMember(parsedChatId, userId);
      const status = member.status;
      if (status === 'left' || status === 'kicked') {
        return false;
      }
    } catch (e: any) {
      console.error(`Silent check error for ${chat.name} (${chat.chatId}):`, e.message);
      return false;
    }
  }

  return true;
}
"""

content = re.sub(r'export async function checkMembershipSilent\(ctx: CustomContext\): Promise<boolean> \{.*?(?=\nexport async function checkMembership)', new_func, content, flags=re.DOTALL)

with open('src/server/bot/middleware/membership.ts', 'w') as f:
    f.write(content)

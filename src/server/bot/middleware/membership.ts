import { InlineKeyboard } from 'grammy';
import { CustomContext } from '../context.js';
import { getDb } from '../../config/firebase.js';

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
      const member = await ctx.api.getChatMember(chat.chatId, userId);
      const status = member.status;
      if (status === 'left' || status === 'kicked') {
        return false;
      }
    } catch (e) {
      console.error(`Silent check error for ${chat.chatId}:`, e);
      return false;
    }
  }

  return true;
}

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
      const member = await ctx.api.getChatMember(chat.chatId, userId);
      const status = member.status;
      if (status === 'left' || status === 'kicked') {
        notJoined.push(chat);
      }
    } catch (e) {
      console.error(`Error checking membership for ${chat.chatId}:`, e);
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

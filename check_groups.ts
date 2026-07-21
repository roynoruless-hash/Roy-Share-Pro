import { initializeFirebase, getDb } from './src/server/config/firebase.js';

async function main() {
  initializeFirebase();
  const db = getDb();
  const bots = await db.collection('bots').get();
  if (bots.empty) return console.log("No bots");
  const botId = bots.docs[0].id;

  const groupsSnap = await db.collection('groups').where('botId', '==', botId).get();
  const channelsSnap = await db.collection('channels').where('botId', '==', botId).get();
  
  console.log("Groups:");
  groupsSnap.forEach(g => console.log(g.id, g.data()));
  
  console.log("Channels:");
  channelsSnap.forEach(c => console.log(c.id, c.data()));
}
main().catch(console.error);

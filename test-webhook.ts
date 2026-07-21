import { getDb, initializeFirebase } from "./src/server/config/firebase.js";

async function main() {
  initializeFirebase();
  const db = getDb();
  const botsSnap = await db.collection('bots').limit(1).get();
  if (botsSnap.empty) {
    console.log("No bots");
    return;
  }
  const botDoc = botsSnap.docs[0];
  const botId = botDoc.id;
  const botData = botDoc.data();
  const webhookSecret = botData.webhookSecret;
  
  console.log(`Testing botId: ${botId}, webhookSecret: ${webhookSecret}`);
  
  const payload = {
    update_id: 12345,
    message: {
      message_id: 1,
      from: {
        id: 9999999,
        is_bot: false,
        first_name: "Test",
        username: "testuser"
      },
      chat: {
        id: 9999999,
        first_name: "Test",
        username: "testuser",
        type: "private"
      },
      date: Math.floor(Date.now() / 1000),
      text: "/start"
    }
  };

  const response = await fetch(`http://localhost:3000/webhook/${botId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-bot-api-secret-token': webhookSecret || ''
    },
    body: JSON.stringify(payload)
  });
  
  console.log(response.status);
  const text = await response.text();
  console.log(text);
}

main().catch(console.error);

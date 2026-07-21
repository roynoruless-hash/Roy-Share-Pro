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
  
  const payload = {
    update_id: 12346,
    message: {
      message_id: 2,
      from: {
        id: 9027671630,
        is_bot: false,
        first_name: "Roy",
        username: "roy"
      },
      chat: {
        id: 9027671630,
        first_name: "Roy",
        username: "roy",
        type: "private"
      },
      date: Math.floor(Date.now() / 1000),
      text: "+9027671630"
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
}

main().catch(console.error);

import { getDb, initializeFirebase } from "./src/server/config/firebase.js";

async function main() {
  initializeFirebase();
  const db = getDb();
  
  const botId = "dYv1deUA8BeoiwLHGMzc";
  const telegramId = 9027671630;
  
  try {
    const otpDocs = await db.collection('otpVerifications')
      .where('botId', '==', botId)
      .where('telegramId', '==', telegramId)
      .where('verifiedAt', '==', null)
      .orderBy('expiresAt', 'desc')
      .get();
    
    console.log("Size:", otpDocs.size);
  } catch (e) {
    console.error("Error:", e);
  }
}

main().catch(console.error);

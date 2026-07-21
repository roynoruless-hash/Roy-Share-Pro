import { getDb, initializeFirebase } from "./src/server/config/firebase.js";

async function main() {
  initializeFirebase();
  const db = getDb();
  
  const botId = "dYv1deUA8BeoiwLHGMzc";
  const telegramId = 9027671630;
  
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);

  try {
    const recentOtpsSnap = await db.collection('otpVerifications')
      .where('botId', '==', botId)
      .where('telegramId', '==', telegramId)
      .where('createdAt', '>=', oneHourAgo)
      .get();
    
    console.log("Size:", recentOtpsSnap.size);
  } catch (e) {
    console.error("Error:", e);
  }
}

main().catch(console.error);

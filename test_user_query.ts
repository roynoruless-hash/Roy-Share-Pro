import { getDb, initializeFirebase } from "./src/server/config/firebase.js";

async function main() {
  initializeFirebase();
  const db = getDb();
  
  const botId = "dYv1deUA8BeoiwLHGMzc";
  
  try {
    const existing = await db.collection('users')
         .where('botId', '==', botId)
         .where('mobileNumber', '==', "1234567890")
         .where('isVerified', '==', true)
         .limit(1).get();
    
    console.log("Size users:", existing.size);
  } catch (e) {
    console.error("Error users:", e);
  }
}

main().catch(console.error);

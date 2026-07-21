import { getDb, initializeFirebase } from "./src/server/config/firebase.js";

async function main() {
  initializeFirebase();
  const db = getDb();
  const botId = "dYv1deUA8BeoiwLHGMzc";
  
  await db.collection("settings").doc(botId).set({ referralReward: 5 });
  console.log("Seeded setting");
}
main().catch(console.error);

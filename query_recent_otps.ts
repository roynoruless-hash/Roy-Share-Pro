import { getDb, initializeFirebase } from "./src/server/config/firebase.js";

async function main() {
  initializeFirebase();
  const db = getDb();
  const otps = await db.collection('otpVerifications')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  otps.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

main().catch(console.error);

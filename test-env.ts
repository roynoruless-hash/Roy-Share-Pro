import dotenv from "dotenv";
dotenv.config();
const key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "";
console.log("Starts with:", key.substring(0, 15));
console.log("Ends with:", key.substring(key.length - 15));

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Since we are in the environment, we might not have the credentials json path directly, but firebase is initialized in src/server/config/firebase.js

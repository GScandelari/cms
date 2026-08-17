const admin = require('firebase-admin');

  let db;

function getDb() {
  if (!db) {
    if (!admin.apps.length) {
      let credential;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (e) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT contains invalid JSON: ' + e.message);
        }
        credential = admin.credential.cert(serviceAccount);
      } else {
        credential = admin.credential.applicationDefault();
      }

      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    db = admin.firestore();
  }
  return db;
}

module.exports = { getDb };

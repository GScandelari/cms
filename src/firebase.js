const { getApps, initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db;

function getDb() {
  if (!db) {
    if (!getApps().length) {
      let credential;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (e) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT contains invalid JSON: ' + e.message);
        }
        credential = cert(serviceAccount);
      } else {
        credential = applicationDefault();
      }

      initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    db = getFirestore();
  }
  return db;
}

module.exports = { getDb };

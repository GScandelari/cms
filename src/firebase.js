const { getApps, initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Defaults to this project's own bucket so nothing extra needs configuring
// in production. Reusing this CMS for another site just means setting
// FIREBASE_STORAGE_BUCKET to that project's bucket — no code change needed.
const DEFAULT_STORAGE_BUCKET = 'gscandelari-cms.firebasestorage.app';

let db;
let bucket;

function ensureApp() {
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
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET,
    });
  }
}

function getDb() {
  if (!db) {
    ensureApp();
    db = getFirestore();
  }
  return db;
}

function getBucket() {
  if (!bucket) {
    ensureApp();
    bucket = getStorage().bucket();
  }
  return bucket;
}

module.exports = { getDb, getBucket };

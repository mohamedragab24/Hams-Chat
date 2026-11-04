'use strict';
// Firebase Admin integration - server side only.
//
// The service-account JSON must come from the FIREBASE_SERVICE_ACCOUNT_JSON
// environment variable in the deployment environment (e.g. Vercel dashboard).
// It must NEVER be committed to the repository or included in a ZIP that
// is shared publicly. firebase-admin is an optional dependency: if it is
// not installed or the env var is missing, every Firebase feature returns
// a clear "not connected" state instead of pretending to work.

let admin = null;
let adminError = '';

function getAdmin() {
  if (admin) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!raw) {
    adminError = 'FIREBASE_SERVICE_ACCOUNT_JSON is not set';
    return null;
  }
  try {
    // eslint-disable-next-line global-require
    const adminLib = require('firebase-admin');
    const serviceAccount = JSON.parse(raw);
    if (!adminLib.apps || adminLib.apps.length === 0) {
      adminLib.initializeApp({ credential: adminLib.credential.cert(serviceAccount) });
    }
    admin = adminLib;
    return admin;
  } catch (e) {
    adminError = 'Firebase Admin is not installed or the service account is invalid. Install firebase-admin and set FIREBASE_SERVICE_ACCOUNT_JSON.';
    return null;
  }
}

function isConfigured() {
  return Boolean(getAdmin());
}

async function verifyIdToken(idToken) {
  const lib = getAdmin();
  if (!lib) return { ok: false, error: adminError };
  try {
    const decoded = await lib.auth().verifyIdToken(idToken);
    return { ok: true, uid: decoded.uid, email: decoded.email || null };
  } catch (e) {
    return { ok: false, error: 'Invalid Firebase ID token' };
  }
}

async function sendPush(token, title, body) {
  const lib = getAdmin();
  if (!lib) return { ok: false, error: adminError };
  try {
    await lib.messaging().send({ token, notification: { title, body } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'FCM send failed' };
  }
}

module.exports = { isConfigured, verifyIdToken, sendPush, adminError: () => adminError };

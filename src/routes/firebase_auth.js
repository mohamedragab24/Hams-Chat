'use strict';
const express = require('express');
const firebase = require('../services/firebase');
const { createToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/firebase
// Body: { idToken }
// Verifies the Firebase ID token on the server, then issues a backend
// JWT. If Firebase Admin is not configured, this returns 503 with a
// clear reason - it never trusts the client token on its own and never
// creates a session from an unverified claim.
router.post('/auth/firebase', async (req, res) => {
  const idToken = req.body && req.body.idToken;
  if (!idToken) {
    return res.status(400).json({ ok: false, error: 'idToken is required / رمز Firebase مطلوب' });
  }
  const result = await firebase.verifyIdToken(idToken);
  if (!result.ok) {
    return res.status(503).json({ ok: false, error: 'Firebase is not connected / Firebase غير مرتبط: ' + result.error });
  }
  // The backend user is keyed by the verified Firebase UID. Full user
  // provisioning (profile, wallet, etc.) belongs in the users module
  // and must run inside a transaction when PostgreSQL is connected.
  const token = createToken({ id: result.uid, role: 'user' });
  return res.json({ ok: true, token, firebaseUid: result.uid, email: result.email });
});

router.get('/auth/firebase/status', (req, res) => {
  return res.json({ ok: true, configured: firebase.isConfigured() });
});

module.exports = router;

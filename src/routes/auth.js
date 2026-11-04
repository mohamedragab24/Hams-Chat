'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { createToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();
// Demo-only login/register: in demo-ephemeral mode a login creates the
// user if missing. Production must verify passwords / OTP properly.
function findOrCreate(username, role) {
  for (const u of store.users.values()) if (u.username === username) return u;
  const user = { id: newId('user'), username, role: role || 'user', banned: false, createdAt: new Date().toISOString() };
  store.users.set(user.id, user);
  return user;
}

router.post('/auth/register', validateBody(['username']), (req, res) => {
  const role = ['user', 'host'].includes(req.body.role) ? req.body.role : 'user';
  const user = findOrCreate(req.body.username, role);
  res.status(201).json({ ok: true, user, token: createToken(user) });
});

router.post('/auth/login', validateBody(['username']), (req, res) => {
  const role = ['user', 'host'].includes(req.body.role) ? req.body.role : 'user';
  const user = findOrCreate(req.body.username, role);
  if (user.banned) return res.status(403).json({ ok: false, error: 'User is banned / المستخدم محظور' });
  res.json({ ok: true, user, token: createToken(user) });
});

router.get('/auth/me', (req, res) => {
  res.json({ ok: true, user: req.user, profile: store.users.get(req.user.id) || null });
});

module.exports = router;

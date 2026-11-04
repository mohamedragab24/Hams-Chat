'use strict';
const express = require('express');
const path = require('path');
const config = require('./config');
const { auth } = require('./middleware/auth');

const app = express();

// CORS permissive — STARTER ONLY. Restrict origins before production use.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(express.json({ limit: '5mb' }));

// Static admin dashboard (Arabic RTL single page).
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

// Health — no auth, always labelled. demo=true when DATABASE_URL is unset.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mode: config.mode, demo: config.demo });
});

// Authenticated API. Exceptions inside auth.js: /api/health,
// /api/settings/feature-flags, /api/auth/login, /api/auth/register
// (login/register must be public, otherwise no token can ever be issued).
app.use('/api', auth);
const routers = [
  'auth', 'firebase_auth', 'users', 'rooms', 'moments', 'chat', 'catalog', 'wallet',
  'games', 'farm', 'families', 'events', 'missions', 'agencies',
  'hosts', 'recharge', 'moderation', 'admin', 'settings', 'payments',
];
for (const name of routers) {
  app.use('/api', require(`./routes/${name}`));
}

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found / المسار غير موجود' });
});

// Global error handler.
 // eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.status || 500).json({ ok: false, error: 'Internal error / خطأ داخلي' });
});

module.exports = app;

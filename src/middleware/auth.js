'use strict';
// Simple HMAC demo token for the starter.
// Production must replace this with a real JWT/OAuth implementation.
// If JWT_SECRET is not set, a clearly labelled DEMO fallback secret is used
// and the app runs in demo-ephemeral mode — never use that in production.
const crypto = require('crypto');
const config = require('../config');

const DEMO_SECRET = 'wanas-demo-only-do-not-use-in-production';
function secret() {
  return config.JWT_SECRET || DEMO_SECRET;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function createToken(user) {
  const payload = base64url(JSON.stringify({ id: user.id, role: user.role || 'user' }));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.id) return null;
    return { id: data.id, role: data.role || 'user' };
  } catch {
    return null;
  }
}

// Paths that do not require a token (exact match on req.path under /api).
const PUBLIC_PATHS = new Set(['/health', '/settings/feature-flags', '/auth/login', '/auth/register', '/auth/firebase', '/auth/firebase/status']);

function auth(req, res, next) {
  // Works whether mounted globally (req.path=/api/health) or under /api.
  const normalized = (req.path || '').replace(/^\/api/, '') || '/';
  if (PUBLIC_PATHS.has(normalized) || PUBLIC_PATHS.has(req.path)) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Missing bearer token / لا يوجد رمز دخول' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid or expired token / رمز غير صالح' });
  req.user = user;
  return next();
}

module.exports = { auth, createToken, verifyToken, DEMO_SECRET };

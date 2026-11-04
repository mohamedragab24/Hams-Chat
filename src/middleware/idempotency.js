'use strict';
// Idempotency middleware for wallet/payment routes.
// Replays the stored response when the same Idempotency-Key is reused,
// so a retried request is never applied twice.
const { store } = require('../store');

function idempotency(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) {
    // Wallet/payment routes require the key; the route validates and
    // returns 400 with a clear message. Other routes pass through.
    return next();
  }
  const namespaced = `http:${req.method}:${req.path}:${key}`;
  const stored = store.idempotency.get(namespaced);
  if (stored) {
    return res.status(stored.status || 200).json(stored.body);
  }
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.idempotency.set(namespaced, { status: res.statusCode, body });
    }
    return originalJson(body);
  };
  return next();
}

module.exports = { idempotency };

'use strict';
// Payments starter: records intents only. No real provider is connected
// (see feature flags: googlePlay/storeKit are disabled until keys are set).
// Never store card data here.
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');

const router = express.Router();
router.get('/payments', (req, res) => {
  const items = [...store.payments.values()].filter((p) => p.userId === req.user.id || req.user.role === 'admin');
  res.json({ ok: true, items });
});
router.post('/payments', idempotency, validateBody(['amount', 'currency']), (req, res) => {
  const payment = { id: newId('pay'), userId: req.user.id, amount: req.body.amount, currency: req.body.currency, provider: req.body.provider || null, status: 'pending', orderNumber: req.body.orderNumber || null, createdAt: new Date().toISOString() };
  store.payments.set(payment.id, payment);
  res.status(201).json({ ok: true, payment });
});
module.exports = router;

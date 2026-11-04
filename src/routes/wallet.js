'use strict';
const express = require('express');
const { requireRole } = require('../middleware/rbac');
const { validateBody, isValidCurrency, isPositiveNumber } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const walletSvc = require('../services/wallet');

const router = express.Router();

router.get('/wallet', (req, res) => {
  // Admins/finance may inspect another user's wallet via ?userId=.
  const userId = (req.query.userId && ['admin', 'finance'].includes(req.user.role)) ? req.query.userId : req.user.id;
  res.json({ ok: true, userId, wallet: walletSvc.getWallet(userId) });
});

router.get('/wallet/ledger', (req, res) => {
  const userId = (req.query.userId && ['admin', 'finance'].includes(req.user.role)) ? req.query.userId : req.user.id;
  res.json({ ok: true, ...walletSvc.listLedger(userId, { page: req.query.page, limit: req.query.limit }) });
});

// Finance/admin ONLY. Recharge agents are never in these roles, so they
// cannot edit balances for free — they must use the recharge flow.
router.post('/wallet/adjust',
  requireRole('admin', 'finance'),
  idempotency,
  validateBody(['userId', 'type', 'amount', 'currency', 'reason', 'reference']),
  (req, res) => {
    const { userId, type, amount, currency, reason, reference } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) return res.status(400).json({ ok: false, error: 'Idempotency-Key header is required / رأس Idempotency-Key مطلوب' });
    if (!isValidCurrency(currency)) return res.status(400).json({ ok: false, error: 'Invalid currency / عملة غير صالحة' });
    if (!isPositiveNumber(amount)) return res.status(400).json({ ok: false, error: 'amount must be a positive number / المبلغ يجب أن يكون رقمًا موجبًا' });
    try {
      const entry = walletSvc.adminAdjust({ adminId: req.user.id, userId, type, amount, currency, reason, reference, idempotencyKey });
      return res.json({ ok: true, entry, wallet: walletSvc.getWallet(userId) });
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message });
    }
  });

module.exports = router;

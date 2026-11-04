'use strict';
// Recharge flow: agents request, admin/finance approves with a reason and
// an order reference. Duplicate order numbers / idempotency keys are
// rejected. Agents NEVER get free balance editing — /wallet/adjust is
// finance/admin only (see wallet route).
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');
const { idempotency } = require('../middleware/idempotency');
const walletSvc = require('../services/wallet');

const router = express.Router();
router.get('/recharge', requireRole('admin', 'finance'), (req, res) => res.json({ ok: true, items: [...store.payments.values()].filter((p) => p.kind === 'recharge') }));
router.post('/recharge/request', idempotency, validateBody(['userId', 'amount', 'currency', 'orderNumber']), (req, res) => {
  const { userId, amount, currency, orderNumber } = req.body;
  const dup = [...store.payments.values()].find((p) => p.kind === 'recharge' && p.orderNumber === orderNumber);
  if (dup) return res.status(409).json({ ok: false, error: 'Duplicate order number / رقم طلب مكرر', existing: dup });
  const rec = { id: newId('recharge'), kind: 'recharge', userId, amount, currency, orderNumber, status: 'pending', agentId: req.user.id, createdAt: new Date().toISOString() };
  store.payments.set(rec.id, rec);
  res.status(201).json({ ok: true, recharge: rec });
});
router.post('/recharge/:id/approve', requireRole('admin', 'finance'), validateBody(['reason']), (req, res) => {
  const rec = store.payments.get(req.params.id);
  if (!rec || rec.kind !== 'recharge') return res.status(404).json({ ok: false, error: 'Recharge not found / طلب الشحن غير موجود' });
  if (rec.status !== 'pending') return res.status(400).json({ ok: false, error: `Recharge already ${rec.status} / الطلب بحالة ${rec.status}` });
  try {
    const entry = walletSvc.applyWalletChange({ userId: rec.userId, type: 'credit', amount: rec.amount, currency: rec.currency, reference: rec.orderNumber, reason: req.body.reason, idempotencyKey: `recharge:${rec.id}` });
    rec.status = 'approved';
    rec.approvedBy = req.user.id;
    store.addAudit(req.user.id, 'recharge.approve', { rechargeId: rec.id, orderNumber: rec.orderNumber }, { status: 'pending' }, { status: 'approved' });
    return res.json({ ok: true, recharge: rec, entry });
  } catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
});
router.post('/recharge/:id/reject', requireRole('admin', 'finance'), validateBody(['reason']), (req, res) => {
  const rec = store.payments.get(req.params.id);
  if (!rec || rec.kind !== 'recharge') return res.status(404).json({ ok: false, error: 'Recharge not found / طلب الشحن غير موجود' });
  rec.status = 'rejected';
  rec.rejectReason = req.body.reason;
  store.addAudit(req.user.id, 'recharge.reject', { rechargeId: rec.id }, null, { status: 'rejected' });
  res.json({ ok: true, recharge: rec });
});
module.exports = router;

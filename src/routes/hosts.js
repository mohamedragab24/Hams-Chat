'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.get('/hosts', requireRole('admin'), (req, res) => res.json({ ok: true, items: [...store.hosts.values()] }));
router.post('/hosts/invite', requireRole('admin'), validateBody(['userId']), (req, res) => {
  const host = { id: newId('host'), userId: req.body.userId, agencyId: req.body.agencyId || null, status: 'invited', createdAt: new Date().toISOString() };
  store.hosts.set(host.id, host);
  res.status(201).json({ ok: true, host });
});
router.post('/hosts/:id/review', requireRole('admin'), validateBody(['decision']), (req, res) => {
  const h = store.hosts.get(req.params.id);
  if (!h) return res.status(404).json({ ok: false, error: 'Host not found / المضيف غير موجود' });
  if (!['approved', 'rejected'].includes(req.body.decision)) return res.status(400).json({ ok: false, error: 'decision must be approved or rejected / القرار غير صالح' });
  const before = { status: h.status };
  h.status = req.body.decision;
  store.addAudit(req.user.id, 'host.review', { hostId: h.id }, before, { status: h.status });
  res.json({ ok: true, host: h });
});
router.post('/hosts/:id/suspend', requireRole('admin'), validateBody(['reason']), (req, res) => {
  const h = store.hosts.get(req.params.id);
  if (!h) return res.status(404).json({ ok: false, error: 'Host not found / المضيف غير موجود' });
  const before = { status: h.status };
  h.status = 'suspended';
  h.suspendReason = req.body.reason;
  store.addAudit(req.user.id, 'host.suspend', { hostId: h.id }, before, { status: 'suspended' });
  res.json({ ok: true, host: h });
});
module.exports = router;

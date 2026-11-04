'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.get('/agencies', requireRole('admin'), (req, res) => res.json({ ok: true, items: [...store.agencies.values()] }));
router.post('/agencies', requireRole('admin'), validateBody(['name']), (req, res) => {
  const agency = { id: newId('agency'), name: req.body.name, ownerId: req.body.ownerId || req.user.id, status: 'active', createdAt: new Date().toISOString() };
  store.agencies.set(agency.id, agency);
  store.addAudit(req.user.id, 'agency.create', { agencyId: agency.id }, null, agency);
  res.status(201).json({ ok: true, agency });
});
router.post('/agencies/:id/disable', requireRole('admin'), (req, res) => {
  const a = store.agencies.get(req.params.id);
  if (!a) return res.status(404).json({ ok: false, error: 'Agency not found / الوكالة غير موجودة' });
  const before = { status: a.status };
  a.status = 'disabled';
  store.addAudit(req.user.id, 'agency.disable', { agencyId: a.id }, before, { status: 'disabled' });
  res.json({ ok: true, agency: a });
});
module.exports = router;

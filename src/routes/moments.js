'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
function pageParams(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit };
}

router.get('/moments', (req, res) => {
  const { page, limit } = pageParams(req);
  const status = req.query.status;
  const all = [...store.moments.values()].filter((m) => !status || m.status === status);
  res.json({ ok: true, items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

router.post('/moments', validateBody(['content']), (req, res) => {
  const moment = { id: newId('moment'), authorId: req.user.id, content: req.body.content, media: req.body.media || null, status: 'pending', createdAt: new Date().toISOString() };
  store.moments.set(moment.id, moment);
  res.status(201).json({ ok: true, moment });
});

router.post('/moments/:id/approve', requireRole('admin', 'moderator'), (req, res) => {
  const m = store.moments.get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Moment not found / المنشور غير موجود' });
  m.status = 'approved';
  store.addAudit(req.user.id, 'moment.approve', { momentId: m.id }, null, { status: 'approved' });
  res.json({ ok: true, moment: m });
});

router.post('/moments/:id/reject', requireRole('admin', 'moderator'), validateBody(['reason']), (req, res) => {
  const m = store.moments.get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Moment not found / المنشور غير موجود' });
  m.status = 'rejected';
  m.rejectReason = req.body.reason;
  store.addAudit(req.user.id, 'moment.reject', { momentId: m.id }, null, { status: 'rejected' });
  res.json({ ok: true, moment: m });
});

module.exports = router;

'use strict';
const express = require('express');
const { store } = require('../store');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
function pageParams(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit };
}

router.get('/users', requireRole('admin'), (req, res) => {
  const { page, limit } = pageParams(req);
  const q = String(req.query.q || '').toLowerCase();
  const all = [...store.users.values()].filter((u) => !q || (u.username || '').toLowerCase().includes(q));
  res.json({ ok: true, items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

router.get('/users/:id', (req, res) => {
  const user = store.users.get(req.params.id);
  if (!user) return res.status(404).json({ ok: false, error: 'User not found / المستخدم غير موجود' });
  if (req.user.id !== user.id && req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden / غير مسموح' });
  res.json({ ok: true, user });
});

router.patch('/users/:id', (req, res) => {
  const user = store.users.get(req.params.id);
  if (!user) return res.status(404).json({ ok: false, error: 'User not found / المستخدم غير موجود' });
  if (req.user.id !== user.id && req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden / غير مسموح' });
  const allowed = ['username', 'avatar', 'bio'];
  for (const k of allowed) if (req.body[k] !== undefined) user[k] = req.body[k];
  res.json({ ok: true, user });
});

module.exports = router;

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

router.get('/admin/overview', requireRole('admin'), (req, res) => {
  res.json({ ok: true, stats: {
    users: store.users.size, rooms: store.rooms.size, moments: store.moments.size,
    catalog: store.catalog.size, bans: store.bans.size, agencies: store.agencies.size,
    hosts: store.hosts.size, games: store.games.size, families: store.families.size,
    events: store.events.size, ledgerEntries: store.ledger_entries.size,
    auditLogs: store.audit_logs.size,
  } });
});

router.get('/admin/users', requireRole('admin'), (req, res) => {
  const { page, limit } = pageParams(req);
  const q = String(req.query.q || '').toLowerCase();
  const all = [...store.users.values()].filter((u) => !q || (u.username || '').toLowerCase().includes(q));
  res.json({ ok: true, items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

router.get('/admin/audit-logs', requireRole('admin'), (req, res) => {
  const { page, limit } = pageParams(req);
  const all = [...store.audit_logs.values()].sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1));
  res.json({ ok: true, items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

router.get('/admin/reports', requireRole('admin', 'moderator'), (req, res) => {
  res.json({ ok: true, items: [...store.reports.values()] });
});
router.post('/admin/reports', (req, res) => {
  const report = { id: `report_${Date.now()}`, reporterId: req.user.id, targetId: req.body.targetId || null, reason: req.body.reason || '', status: 'open', createdAt: new Date().toISOString() };
  store.reports.set(report.id, report);
  res.status(201).json({ ok: true, report });
});
module.exports = router;

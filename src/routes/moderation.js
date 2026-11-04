'use strict';
const express = require('express');
const moderation = require('../services/moderation');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');

const router = express.Router();
router.get('/moderation/bans', requireRole('admin', 'moderator'), (req, res) => res.json({ ok: true, items: [...require('../store').store.bans.values()] }));

router.post('/moderation/ban', requireRole('admin', 'moderator'), validateBody(['targetType', 'targetId', 'reason']), (req, res) => {
  try {
    const record = moderation.ban({ adminId: req.user.id, ...req.body });
    return res.status(201).json({ ok: true, ban: record });
  } catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/moderation/unban', requireRole('admin', 'moderator'), validateBody(['banId']), (req, res) => {
  try {
    const record = moderation.unban({ adminId: req.user.id, banId: req.body.banId, reason: req.body.reason });
    return res.json({ ok: true, ban: record });
  } catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
});

// Personal block — separate from admin bans, any authenticated user.
router.post('/moderation/block', validateBody(['blockedId']), (req, res) => {
  try {
    const record = moderation.block({ blockerId: req.user.id, blockedId: req.body.blockedId });
    return res.status(201).json({ ok: true, block: record });
  } catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
});
router.post('/moderation/unblock', validateBody(['blockedId']), (req, res) => {
  const done = moderation.unblock({ blockerId: req.user.id, blockedId: req.body.blockedId });
  return res.json({ ok: true, removed: done });
});
module.exports = router;

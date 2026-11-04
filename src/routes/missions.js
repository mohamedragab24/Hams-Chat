'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const walletSvc = require('../services/wallet');

const router = express.Router();
router.get('/missions', (req, res) => res.json({ ok: true, items: [...store.missions.values()] }));
router.post('/missions', requireRole('admin'), validateBody(['title']), (req, res) => {
  const m = { id: newId('mission'), title: req.body.title, rewardCoins: req.body.rewardCoins || 0, createdAt: new Date().toISOString() };
  store.missions.set(m.id, m);
  res.status(201).json({ ok: true, mission: m });
});
router.post('/missions/:id/complete', (req, res) => {
  const m = store.missions.get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Mission not found / المهمة غير موجودة' });
  let entry = null;
  if (m.rewardCoins > 0) {
    entry = walletSvc.applyWalletChange({ userId: req.user.id, type: 'credit', amount: m.rewardCoins, currency: 'coins', reference: `mission:${m.id}`, reason: 'Mission reward / مكافأة مهمة' });
  }
  res.json({ ok: true, mission: m, rewardEntry: entry });
});
module.exports = router;

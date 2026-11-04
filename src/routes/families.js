'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');

const router = express.Router();
router.get('/families', (req, res) => res.json({ ok: true, items: [...store.families.values()] }));
router.post('/families', validateBody(['name']), (req, res) => {
  const family = { id: newId('family'), name: req.body.name, leaderId: req.user.id, members: [req.user.id], createdAt: new Date().toISOString() };
  store.families.set(family.id, family);
  res.status(201).json({ ok: true, family });
});
router.post('/families/:id/join', (req, res) => {
  const f = store.families.get(req.params.id);
  if (!f) return res.status(404).json({ ok: false, error: 'Family not found / العائلة غير موجودة' });
  if (!f.members.includes(req.user.id)) f.members.push(req.user.id);
  res.json({ ok: true, family: f });
});
router.post('/families/:id/leave', (req, res) => {
  const f = store.families.get(req.params.id);
  if (!f) return res.status(404).json({ ok: false, error: 'Family not found / العائلة غير موجودة' });
  f.members = f.members.filter((m) => m !== req.user.id);
  res.json({ ok: true, family: f });
});
module.exports = router;

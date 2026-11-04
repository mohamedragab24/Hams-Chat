'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.get('/events', (req, res) => res.json({ ok: true, items: [...store.events.values()] }));
router.post('/events', requireRole('admin'), validateBody(['title']), (req, res) => {
  const ev = { id: newId('event'), title: req.body.title, description: req.body.description || '', startsAt: req.body.startsAt || null, participants: [], createdAt: new Date().toISOString() };
  store.events.set(ev.id, ev);
  res.status(201).json({ ok: true, event: ev });
});
router.post('/events/:id/join', (req, res) => {
  const ev = store.events.get(req.params.id);
  if (!ev) return res.status(404).json({ ok: false, error: 'Event not found / الفعالية غير موجودة' });
  if (!ev.participants.includes(req.user.id)) ev.participants.push(req.user.id);
  res.json({ ok: true, event: ev });
});
module.exports = router;

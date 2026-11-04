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

router.get('/rooms', (req, res) => {
  const { page, limit } = pageParams(req);
  const all = [...store.rooms.values()];
  res.json({ ok: true, items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

router.post('/rooms', validateBody(['title']), (req, res) => {
  const room = { id: newId('room'), title: req.body.title, ownerId: req.user.id, members: [req.user.id], type: req.body.type || 'voice', status: 'open', createdAt: new Date().toISOString() };
  store.rooms.set(room.id, room);
  res.status(201).json({ ok: true, room });
});

router.post('/rooms/:id/join', (req, res) => {
  const room = store.rooms.get(req.params.id);
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found / الغرفة غير موجودة' });
  if (!room.members.includes(req.user.id)) room.members.push(req.user.id);
  res.json({ ok: true, room });
});

router.post('/rooms/:id/leave', (req, res) => {
  const room = store.rooms.get(req.params.id);
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found / الغرفة غير موجودة' });
  room.members = room.members.filter((m) => m !== req.user.id);
  res.json({ ok: true, room });
});

router.post('/rooms/:id/close', requireRole('admin', 'moderator'), (req, res) => {
  const room = store.rooms.get(req.params.id);
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found / الغرفة غير موجودة' });
  room.status = 'closed';
  store.addAudit(req.user.id, 'room.close', { roomId: room.id }, null, { status: 'closed' });
  res.json({ ok: true, room });
});

module.exports = router;

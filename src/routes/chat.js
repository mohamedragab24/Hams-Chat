'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

function isBlocked(a, b) {
  return [...store.blocks.values()].some((r) => (r.blockerId === a && r.blockedId === b) || (r.blockerId === b && r.blockedId === a));
}

router.get('/chat/conversations', (req, res) => {
  const items = [...store.conversations.values()].filter((c) => c.participants.includes(req.user.id));
  res.json({ ok: true, items });
});

router.post('/chat/conversations', validateBody(['participants']), (req, res) => {
  const participants = [...new Set([req.user.id, ...req.body.participants])];
  const conv = { id: newId('conv'), participants, createdAt: new Date().toISOString() };
  store.conversations.set(conv.id, conv);
  res.status(201).json({ ok: true, conversation: conv });
});

router.get('/chat/conversations/:id/messages', (req, res) => {
  const conv = store.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ ok: false, error: 'Conversation not found / المحادثة غير موجودة' });
  if (!conv.participants.includes(req.user.id)) return res.status(403).json({ ok: false, error: 'Forbidden / غير مسموح' });
  const items = [...store.messages.values()].filter((m) => m.conversationId === conv.id);
  res.json({ ok: true, items });
});

router.post('/chat/conversations/:id/messages', validateBody(['text']), (req, res) => {
  const conv = store.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ ok: false, error: 'Conversation not found / المحادثة غير موجودة' });
  if (!conv.participants.includes(req.user.id)) return res.status(403).json({ ok: false, error: 'Forbidden / غير مسموح' });
  const other = conv.participants.find((p) => p !== req.user.id);
  if (other && isBlocked(req.user.id, other)) return res.status(403).json({ ok: false, error: 'Blocked / يوجد حظر شخصي بين الطرفين' });
  const msg = { id: newId('msg'), conversationId: conv.id, senderId: req.user.id, text: req.body.text, createdAt: new Date().toISOString() };
  store.messages.set(msg.id, msg);
  res.status(201).json({ ok: true, message: msg });
});

module.exports = router;

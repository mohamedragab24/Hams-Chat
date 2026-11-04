'use strict';
const express = require('express');
const games = require('../services/games');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');

const router = express.Router();
function fail(res, e) { return res.status(400).json({ ok: false, error: e.message }); }

router.get('/games', (req, res) => {
  res.json({ ok: true, items: games.listMatches() });
});

router.post('/games', validateBody(['type']), (req, res) => {
  try {
    const match = games.createMatch({ type: req.body.type, roomId: req.body.roomId, hostId: req.user.id, minPlayers: req.body.minPlayers, maxPlayers: req.body.maxPlayers, questions: req.body.questions });
    return res.status(201).json({ ok: true, match });
  } catch (e) { return fail(res, e); }
});

router.post('/games/:id/join', (req, res) => {
  try { return res.json({ ok: true, match: games.joinMatch(req.params.id, req.user.id) }); } catch (e) { return fail(res, e); }
});
router.post('/games/:id/leave', (req, res) => {
  try { return res.json({ ok: true, match: games.leaveMatch(req.params.id, req.user.id) }); } catch (e) { return fail(res, e); }
});
router.post('/games/:id/start', (req, res) => {
  try { return res.json({ ok: true, match: games.startMatch(req.params.id, req.user.id) }); } catch (e) { return fail(res, e); }
});
router.post('/games/:id/reconnect', (req, res) => {
  try { return res.json({ ok: true, match: games.reconnect(req.params.id, req.user.id) }); } catch (e) { return fail(res, e); }
});
router.post('/games/:id/surrender', (req, res) => {
  try { return res.json({ ok: true, match: games.surrender(req.params.id, req.user.id) }); } catch (e) { return fail(res, e); }
});
router.post('/games/:id/cancel', requireRole('admin'), (req, res) => {
  try { return res.json({ ok: true, match: games.cancelMatch(req.params.id) }); } catch (e) { return fail(res, e); }
});

// Server dice: any client-supplied dice value is rejected (400).
router.post('/games/:id/roll', (req, res) => {
  try {
    const result = games.rollDice(req.params.id, req.user.id, { clientDice: req.body.dice, dice: req.body.value });
    return res.json({ ok: true, value: result.value, playerId: result.playerId, match: result.match });
  } catch (e) { return fail(res, e); }
});

// Quiz: server checks the answer; the client never sends a score.
router.post('/games/:id/quiz-answer', validateBody(['questionId', 'answer']), (req, res) => {
  try {
    const result = games.answerQuiz(req.params.id, req.user.id, req.body.questionId, req.body.answer);
    return res.json({ ok: true, ...result });
  } catch (e) { return fail(res, e); }
});

router.post('/games/:id/pick', validateBody(['pick']), (req, res) => {
  try { return res.json({ ok: true, pick: games.submitPick(req.params.id, req.user.id, req.body.pick) }); } catch (e) { return fail(res, e); }
});

router.post('/games/:id/pause', requireRole('admin'), (req, res) => {
  try { return res.json({ ok: true, match: games.pauseMatch(req.params.id, req.body.paused !== false) }); } catch (e) { return fail(res, e); }
});

router.get('/games/config', requireRole('admin'), (req, res) => {
  res.json({ ok: true, config: games.getAdminConfig() });
});
router.patch('/games/config', requireRole('admin'), (req, res) => {
  res.json({ ok: true, config: games.updateAdminConfig(req.body || {}) });
});

module.exports = router;

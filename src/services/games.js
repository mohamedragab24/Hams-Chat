'use strict';
// Server-authoritative games. Pure logic, no Express.
// The server is the ONLY source of dice results, quiz verdicts and scores.
// Any client-supplied dice value, score, or result is rejected, never trusted.
const crypto = require('crypto');
const { store, newId } = require('../store');

const GAME_TYPES = ['dice', 'board', 'quiz', 'speed', 'group'];

const adminConfig = {
  enabled: true,
  rounds: 3,
  limits: { minPlayers: 2, maxPlayers: 8 },
  rewards: { winCoins: 100, participationCoins: 10 },
  tournaments: [],
  prizes: [],
  emergencyPause: false,
};

function getAdminConfig() {
  return JSON.parse(JSON.stringify(adminConfig));
}
function updateAdminConfig(patch) {
  if (patch && typeof patch === 'object') Object.assign(adminConfig, patch);
  return getAdminConfig();
}

function log(match, event, data) {
  match.eventLog.push({ event, data: data || null, at: new Date().toISOString() });
}

function createMatch({ type, roomId, hostId, minPlayers, maxPlayers, questions } = {}) {
  if (!GAME_TYPES.includes(type)) throw new Error(`Unknown game type "${type}" / نوع لعبة غير معروف`);
  if (adminConfig.emergencyPause) throw new Error('Games are paused by admin / الألعاب متوقفة مؤقتًا من الإدارة');
  const match = {
    id: newId('game'),
    type,
    roomId: roomId || null,
    hostId: hostId || null,
    status: 'waiting', // waiting | active | paused | finished | cancelled
    players: hostId ? [hostId] : [],
    minPlayers: minPlayers || adminConfig.limits.minPlayers,
    maxPlayers: maxPlayers || adminConfig.limits.maxPlayers,
    round: 0,
    rounds: adminConfig.rounds,
    currentTurn: null,
    state: {},
    // Quiz answers live server-side only; the client never sees them
    // except through the verdict of answerQuiz().
    questions: type === 'quiz' && Array.isArray(questions) ? questions : [],
    eventLog: [],
    result: null,
    rewards: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (hostId) match.currentTurn = hostId;
  store.games.set(match.id, match);
  store.game_matches.set(match.id, match);
  log(match, 'created', { type, hostId });
  return match;
}

function getMatch(id) {
  return store.games.get(id) || store.game_matches.get(id) || null;
}

function assertPlayer(match, playerId) {
  if (!match.players.includes(playerId)) throw new Error('Player is not in this match / اللاعب ليس في هذه المباراة');
}
function assertActive(match) {
  if (match.status === 'paused' || adminConfig.emergencyPause) throw new Error('Game is paused / اللعبة متوقفة مؤقتًا');
  if (match.status !== 'active') throw new Error(`Game is not active (status=${match.status}) / اللعبة ليست نشطة`);
}

function joinMatch(matchId, playerId) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  if (match.status !== 'waiting') throw new Error('Match already started / المباراة بدأت بالفعل');
  if (match.players.includes(playerId)) return match;
  if (match.players.length >= match.maxPlayers) throw new Error('Match is full / المباراة ممتلئة');
  match.players.push(playerId);
  match.updatedAt = new Date().toISOString();
  log(match, 'join', { playerId });
  return match;
}

function leaveMatch(matchId, playerId) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  assertPlayer(match, playerId);
  match.players = match.players.filter((p) => p !== playerId);
  log(match, 'leave', { playerId });
  if (match.players.length === 0 && match.status !== 'finished') {
    match.status = 'cancelled';
    log(match, 'cancelled', { reason: 'no players left' });
  }
  match.updatedAt = new Date().toISOString();
  return match;
}

function startMatch(matchId, userId) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  if (match.hostId && userId && userId !== match.hostId) throw new Error('Only the host can start / المضيف فقط يمكنه البدء');
  if (match.players.length < match.minPlayers) throw new Error('Not enough players / عدد اللاعبين غير كافٍ');
  match.status = 'active';
  match.round = 1;
  match.currentTurn = match.players[0];
  match.updatedAt = new Date().toISOString();
  log(match, 'started', { players: match.players });
  return match;
}

function advanceTurn(match) {
  const idx = match.players.indexOf(match.currentTurn);
  match.currentTurn = match.players[(idx + 1) % match.players.length] || null;
}

/** Server dice: crypto.randomInt(1, 7). Client dice values are REJECTED. */
function rollDice(matchId, playerId, opts = {}) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  if (opts.clientDice !== undefined && opts.clientDice !== null) {
    throw new Error('Client dice values are rejected; the server rolls / قيم النرد من العميل مرفوضة؛ الخادم هو من يرمي');
  }
  if (opts.dice !== undefined && opts.dice !== null) {
    throw new Error('Client dice values are rejected; the server rolls / قيم النرد من العميل مرفوضة؛ الخادم هو من يرمي');
  }
  assertActive(match);
  assertPlayer(match, playerId);
  if (match.currentTurn && match.currentTurn !== playerId) {
    throw new Error('Not your turn / ليس دورك');
  }
  const value = crypto.randomInt(1, 7); // 1..6 inclusive, server-side only
  match.state.lastRoll = { playerId, value, at: new Date().toISOString() };
  match.state.rolls = match.state.rolls || [];
  match.state.rolls.push(match.state.lastRoll);
  log(match, 'dice_rolled', { playerId, value });
  advanceTurn(match);
  match.updatedAt = new Date().toISOString();
  return { match, value, playerId };
}

/** Quiz: the server checks the answer against its own stored correct answer. */
function answerQuiz(matchId, playerId, questionId, answer) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  assertActive(match);
  assertPlayer(match, playerId);
  const q = match.questions.find((item) => item.id === questionId);
  if (!q) throw new Error('Question not found / السؤال غير موجود');
  const correct = String(answer) === String(q.correctAnswer);
  match.state.scores = match.state.scores || {};
  if (correct) match.state.scores[playerId] = (match.state.scores[playerId] || 0) + 1;
  log(match, 'quiz_answer', { playerId, questionId, correct });
  match.updatedAt = new Date().toISOString();
  return { correct, score: match.state.scores[playerId] || 0 };
}

/** Speed / pick challenge: first valid pick wins the round (server timestamp). */
function submitPick(matchId, playerId, pick) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  assertActive(match);
  assertPlayer(match, playerId);
  match.state.picks = match.state.picks || [];
  const entry = { playerId, pick, at: new Date().toISOString() };
  match.state.picks.push(entry);
  log(match, 'pick', entry);
  match.updatedAt = new Date().toISOString();
  return entry;
}

function finishMatch(matchId, winnerId) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  match.status = 'finished';
  match.result = { winnerId: winnerId || null, scores: match.state.scores || null, rolls: match.state.rolls || null };
  match.rewards = winnerId
    ? { [winnerId]: adminConfig.rewards.winCoins }
    : {};
  log(match, 'finished', match.result);
  match.updatedAt = new Date().toISOString();
  return match;
}

function surrender(matchId, playerId) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  assertPlayer(match, playerId);
  match.players = match.players.filter((p) => p !== playerId);
  log(match, 'surrender', { playerId });
  if (match.players.length < match.minPlayers && match.status === 'active') {
    return finishMatch(matchId, match.players[0] || null);
  }
  match.updatedAt = new Date().toISOString();
  return match;
}

function cancelMatch(matchId) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  match.status = 'cancelled';
  log(match, 'cancelled', {});
  match.updatedAt = new Date().toISOString();
  return match;
}

function pauseMatch(matchId, paused) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  match.status = paused ? 'paused' : 'active';
  log(match, paused ? 'paused' : 'resumed', {});
  match.updatedAt = new Date().toISOString();
  return match;
}

/** Reconnect: a previously-joined player re-attaches without a new seat. */
function reconnect(matchId, playerId) {
  const match = getMatch(matchId);
  if (!match) throw new Error('Match not found / المباراة غير موجودة');
  assertPlayer(match, playerId);
  log(match, 'reconnect', { playerId });
  match.updatedAt = new Date().toISOString();
  return match;
}

function listMatches() {
  return [...store.games.values()];
}

module.exports = {
  GAME_TYPES, adminConfig, getAdminConfig, updateAdminConfig,
  createMatch, getMatch, joinMatch, leaveMatch, startMatch, rollDice,
  answerQuiz, submitPick, finishMatch, surrender, cancelMatch,
  pauseMatch, reconnect, listMatches,
};

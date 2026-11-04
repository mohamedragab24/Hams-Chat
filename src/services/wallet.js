'use strict';
// Wallet service — append-only ledger, idempotent by key.
// Pure logic over src/store.js; no Express dependency (testable directly).
const { store, newId } = require('../store');
const { isPositiveNumber, isValidCurrency } = require('../middleware/validate');

function getWallet(userId) {
  if (!store.wallets.has(userId)) store.wallets.set(userId, { coins: 0, premiumCoins: 0 });
  return store.wallets.get(userId);
}

function getBalance(userId, currency) {
  return getWallet(userId)[currency];
}

/**
 * applyWalletChange({ userId, type, amount, currency, reference, reason, idempotencyKey })
 * type: 'credit' | 'debit'. amount must be a positive number.
 * Returns the ledger entry. Replaying the same idempotencyKey returns the
 * original entry WITHOUT changing the balance again.
 */
function applyWalletChange({ userId, type, amount, currency, reference, reason, idempotencyKey }) {
  if (!userId) throw new Error('userId is required / userId مطلوب');
  if (type !== 'credit' && type !== 'debit') throw new Error('type must be credit or debit / النوع يجب أن يكون credit أو debit');
  if (!isPositiveNumber(amount)) throw new Error('amount must be a positive number / المبلغ يجب أن يكون رقمًا موجبًا');
  if (!isValidCurrency(currency)) throw new Error('currency must be coins or premiumCoins / العملة يجب أن تكون coins أو premiumCoins');

  if (idempotencyKey) {
    const existing = store.idempotency.get(`wallet:${idempotencyKey}`);
    if (existing) return existing;
  }

  const wallet = getWallet(userId);
  const balanceBefore = wallet[currency];
  let balanceAfter;
  if (type === 'credit') balanceAfter = balanceBefore + amount;
  else {
    if (balanceBefore < amount) throw new Error('Insufficient balance / الرصيد غير كافٍ');
    balanceAfter = balanceBefore - amount;
  }
  wallet[currency] = balanceAfter;

  const entry = {
    id: newId('ledger'),
    transactionId: newId('txn'),
    userId,
    type,
    amount,
    currency,
    balanceBefore,
    balanceAfter,
    reference: reference || null,
    idempotency_key: idempotencyKey || null,
    reason: reason || null,
    createdAt: new Date().toISOString(),
  };
  store.ledger_entries.set(entry.id, entry);
  if (idempotencyKey) store.idempotency.set(`wallet:${idempotencyKey}`, entry);
  return entry;
}

/**
 * adminAdjust — admin/finance balance adjustment.
 * Requires reason AND reference, and always writes an audit log entry.
 * The route layer enforces finance/admin roles; recharge agents are
 * never given that role and cannot call this.
 */
function adminAdjust({ adminId, userId, type, amount, currency, reason, reference, idempotencyKey }) {
  if (!reason) throw new Error('reason is required for admin adjustments / السبب مطلوب لتعديل الرصيد');
  if (!reference) throw new Error('reference is required for admin adjustments / المرجع مطلوب لتعديل الرصيد');
  const before = { ...getWallet(userId) };
  const entry = applyWalletChange({ userId, type, amount, currency, reference, reason, idempotencyKey });
  const after = { ...getWallet(userId) };
  store.addAudit(adminId, 'wallet.adjust', { userId, transactionId: entry.transactionId }, before, after);
  return entry;
}

function listLedger(userId, { page = 1, limit = 20 } = {}) {
  const all = [...store.ledger_entries.values()]
    .filter((e) => !userId || e.userId === userId)
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1));
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { items: all.slice((p - 1) * l, p * l), total: all.length, page: p, limit: l };
}

module.exports = { getWallet, getBalance, applyWalletChange, adminAdjust, listLedger };

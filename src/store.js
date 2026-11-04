'use strict';
// In-memory ephemeral store — STARTER ONLY.
// Everything here is lost on restart and is NOT production data.
// Demo mode must be labelled as such in every response that exposes it
// (see /api/health and the admin dashboard banner).
const crypto = require('crypto');

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

const store = {
  users: new Map(),
  rooms: new Map(),
  moments: new Map(),
  conversations: new Map(),
  messages: new Map(),
  catalog: new Map(), // catalog items: gifts, entry_effects, frames
  wallets: new Map(), // userId -> { coins, premiumCoins }
  ledger_entries: new Map(),
  audit_logs: new Map(),
  bans: new Map(),
  blocks: new Map(), // id -> { blockerId, blockedId, createdAt }
  agencies: new Map(),
  hosts: new Map(),
  recharge_agents: new Map(),
  games: new Map(), // game matches
  game_matches: new Map(), // alias kept in sync with games
  families: new Map(),
  events: new Map(),
  missions: new Map(),
  notifications: new Map(),
  settings: new Map(),
  idempotency: new Map(), // key -> stored response or ledger entry
  payments: new Map(),
  farms: new Map(), // userId -> { plots, coins... } (starter demo state)
  reports: new Map(),
  support_tickets: new Map(),

  reset() {
    for (const key of Object.keys(this)) {
      if (this[key] instanceof Map) this[key].clear();
    }
    // Seed safe, clearly-labelled demo settings (no fake production data).
    this.settings.set('public', {
      appName: 'Wanas',
      demo: true,
      maintenance: false,
    });
  },

  addAudit(adminId, action, target, before, after) {
    const entry = {
      id: newId('audit'),
      adminId: adminId || null,
      action,
      target: target || null,
      before: before === undefined ? null : before,
      after: after === undefined ? null : after,
      createdAt: new Date().toISOString(),
    };
    this.audit_logs.set(entry.id, entry);
    return entry;
  },
};

store.reset();
module.exports = { store, newId };

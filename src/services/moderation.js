'use strict';
// Moderation service — pure logic, no Express.
// Bans keep full history: unban lifts the ban but never erases the record.
// Personal blocks are separate from admin bans.
const { store, newId } = require('../store');

const BAN_TARGET_TYPES = ['user', 'host', 'agency', 'recharge-agent', 'room'];

function ban({ adminId, targetType, targetId, reason, category, scope, startAt, endAt, evidence, reference }) {
  if (!BAN_TARGET_TYPES.includes(targetType)) throw new Error(`Invalid ban target type "${targetType}" / نوع هدف حظر غير صالح`);
  if (!targetId) throw new Error('targetId is required / targetId مطلوب');
  if (!reason) throw new Error('reason is required for bans / سبب الحظر مطلوب');
  const user = targetType === 'user' || targetType === 'host' ? store.users.get(targetId) : null;
  const before = user ? { banned: Boolean(user.banned), role: user.role } : null;
  const record = {
    id: newId('ban'),
    targetType, targetId, reason, category: category || null,
    scope: scope || 'global',
    status: 'active',
    startAt: startAt || new Date().toISOString(),
    endAt: endAt || null,
    evidence: evidence || null,
    reference: reference || null,
    adminId: adminId || null,
    history: [{ action: 'ban', at: new Date().toISOString(), adminId: adminId || null, reason }],
    createdAt: new Date().toISOString(),
    liftedAt: null,
  };
  store.bans.set(record.id, record);
  if (user) {
    user.previousRole = user.role;
    user.banned = true;
  }
  store.addAudit(adminId, 'moderation.ban', { targetType, targetId, banId: record.id }, before, { banned: true });
  return record;
}

function unban({ adminId, banId, reason }) {
  const record = store.bans.get(banId);
  if (!record) throw new Error('Ban not found / الحظر غير موجود');
  const user = (record.targetType === 'user' || record.targetType === 'host')
    ? store.users.get(record.targetId) : null;
  const before = user ? { banned: Boolean(user.banned), role: user.role } : { status: record.status };
  record.status = 'lifted';
  record.liftedAt = new Date().toISOString();
  record.history.push({ action: 'unban', at: record.liftedAt, adminId: adminId || null, reason: reason || null });
  // Restore only appropriate permissions: clear the ban flag and restore
  // the pre-ban role if one was saved. History is never deleted.
  if (user) {
    user.banned = false;
    if (user.previousRole) user.role = user.previousRole;
  }
  store.addAudit(adminId, 'moderation.unban', { banId, targetId: record.targetId }, before, { banned: false, status: 'lifted' });
  return record;
}

function block({ blockerId, blockedId }) {
  if (!blockerId || !blockedId) throw new Error('blockerId and blockedId are required / blockerId و blockedId مطلوبان');
  if (blockerId === blockedId) throw new Error('Cannot block yourself / لا يمكن حظر نفسك');
  const record = { id: newId('block'), blockerId, blockedId, createdAt: new Date().toISOString() };
  store.blocks.set(record.id, record);
  return record;
}

function unblock({ blockerId, blockedId }) {
  for (const [id, rec] of store.blocks.entries()) {
    if (rec.blockerId === blockerId && rec.blockedId === blockedId) {
      store.blocks.delete(id);
      return true;
    }
  }
  return false;
}

module.exports = { ban, unban, block, unblock, BAN_TARGET_TYPES };

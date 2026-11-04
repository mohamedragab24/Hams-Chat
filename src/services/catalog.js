'use strict';
// Catalog media validation + item lifecycle. Pure logic, no Express.
// Validation checks MAGIC BYTES, never the file extension or claimed type.
const config = require('../config');

const ALLOWED_FORMATS = ['svga', 'mp4', 'gif', 'png'];

const limits = {
  maxSizeBytes: config.catalogLimits.maxSizeBytes,
  maxDurationSec: config.catalogLimits.maxDurationSec,
  maxWidth: config.catalogLimits.maxWidth,
  maxHeight: config.catalogLimits.maxHeight,
};

function toBuffer(buffer) {
  if (Buffer.isBuffer(buffer)) return buffer;
  if (buffer instanceof Uint8Array) return Buffer.from(buffer);
  if (typeof buffer === 'string') return Buffer.from(buffer, 'base64');
  return null;
}

function magicOk(buf, format) {
  if (format === 'png') {
    return buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (format === 'gif') {
    const head = buf.slice(0, 6).toString('ascii');
    return head === 'GIF87a' || head === 'GIF89a';
  }
  if (format === 'mp4') {
    // 'ftyp' box at offset 4.
    return buf.length >= 8 && buf.slice(4, 8).toString('ascii') === 'ftyp';
  }
  if (format === 'svga') {
    // SVGA files are ZIP containers: PK\x03\x04.
    return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  }
  return false;
}

function fail(msg) {
  return { ok: false, error: msg };
}

/**
 * validateMedia(buffer, format) -> { ok, error? }
 * buffer: Buffer | Uint8Array | base64 string. format: svga|mp4|gif|png.
 * Optional metadata (durationSec/width/height) may be passed as 3rd arg
 * and is checked against limits when supplied.
 */
function validateMedia(buffer, format, meta = {}) {
  const fmt = String(format || '').toLowerCase();
  if (!ALLOWED_FORMATS.includes(fmt)) {
    return fail(`Unsupported format "${fmt}" — only svga, mp4, gif, png are allowed / صيغة غير مدعومة — المسموح فقط: svga, mp4, gif, png`);
  }
  const buf = toBuffer(buffer);
  if (!buf || buf.length === 0) return fail('Empty file / الملف فارغ');
  if (buf.length > limits.maxSizeBytes) {
    return fail(`File too large (${buf.length} bytes > ${limits.maxSizeBytes}) / الملف أكبر من الحد المسموح`);
  }
  if (!magicOk(buf, fmt)) {
    return fail(`Invalid ${fmt.toUpperCase()} file: magic bytes do not match the claimed format / ملف ${fmt.toUpperCase()} غير صالح: البصمة لا تطابق الصيغة المعلنة`);
  }
  if (meta.durationSec !== undefined && meta.durationSec > limits.maxDurationSec) {
    return fail(`Duration exceeds ${limits.maxDurationSec}s / المدة تتجاوز الحد المسموح`);
  }
  if (meta.width !== undefined && meta.width > limits.maxWidth) {
    return fail(`Width exceeds ${limits.maxWidth}px / العرض يتجاوز الحد المسموح`);
  }
  if (meta.height !== undefined && meta.height > limits.maxHeight) {
    return fail(`Height exceeds ${limits.maxHeight}px / الارتفاع يتجاوز الحد المسموح`);
  }
  return { ok: true };
}

// Lifecycle: draft -> approved -> published ; published -> disabled ;
// any non-archived state -> archived. Nothing else is allowed.
const ALLOWED_TRANSITIONS = {
  draft: ['approved', 'archived'],
  approved: ['published', 'archived'],
  published: ['disabled', 'archived'],
  disabled: ['published', 'archived'],
  archived: [],
};

function transitionItem(item, nextStatus) {
  const from = item.status || 'draft';
  if (!ALLOWED_TRANSITIONS[from] || !ALLOWED_TRANSITIONS[from].includes(nextStatus)) {
    return { ok: false, error: `Invalid transition ${from} -> ${nextStatus} / انتقال غير صالح من ${from} إلى ${nextStatus}` };
  }
  const before = item.status;
  item.status = nextStatus;
  item.updatedAt = new Date().toISOString();
  return { ok: true, before, after: nextStatus };
}

/**
 * canDeleteItem — hard deletion is NEVER allowed for items owned by users
 * (purchased / granted / in a user's inventory). Such items may only be
 * disabled or archived. Returns { canDelete, reason }.
 */
function canDeleteItem(item) {
  if (!item) return { canDelete: false, reason: 'Item not found / العنصر غير موجود' };
  const owners = item.ownedByUsers || item.ownerUserIds || [];
  if (Array.isArray(owners) && owners.length > 0) {
    return { canDelete: false, reason: 'Item is owned by users and cannot be hard-deleted; disable or archive it instead / العنصر مملوك لمستخدمين ولا يمكن حذفه نهائيًا؛ عطّله أو أرشفه بدلًا من ذلك' };
  }
  if (item.purchaseCount && item.purchaseCount > 0) {
    return { canDelete: false, reason: 'Item has purchases and cannot be hard-deleted / العنصر له مشتريات ولا يمكن حذفه نهائيًا' };
  }
  if (item.status === 'published') {
    return { canDelete: false, reason: 'Published items must be disabled first / يجب تعطيل العناصر المنشورة أولًا' };
  }
  return { canDelete: true, reason: null };
}

module.exports = { validateMedia, limits, ALLOWED_FORMATS, transitionItem, canDeleteItem };

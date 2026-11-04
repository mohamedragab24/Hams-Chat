'use strict';
const express = require('express');
const { store, newId } = require('../store');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const catalogSvc = require('../services/catalog');

const router = express.Router();
function pageParams(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit };
}

// POST /api/catalog/validate — base64 body { format, base64 }.
// No real file storage in the starter; only magic-byte validation.
router.post('/catalog/validate', (req, res) => {
  const { format, base64 } = req.body || {};
  if (!format || !base64) return res.status(400).json({ ok: false, error: 'format and base64 are required / الصيغة و base64 مطلوبان' });
  let buf;
  try { buf = Buffer.from(base64, 'base64'); } catch {
    return res.status(400).json({ ok: false, error: 'Invalid base64 / base64 غير صالح' });
  }
  const result = catalogSvc.validateMedia(buf, format, req.body.meta || {});
  return res.json({ ok: result.ok, error: result.error || null, limits: catalogSvc.limits });
});

router.get('/catalog', (req, res) => {
  const { page, limit } = pageParams(req);
  const { type, status } = req.query;
  const all = [...store.catalog.values()].filter((i) => (!type || i.type === type) && (!status || i.status === status));
  res.json({ ok: true, items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

router.post('/catalog', requireRole('admin', 'catalog_manager'), validateBody(['type', 'name']), (req, res) => {
  const { type, name, price, format, special } = req.body;
  if (!['gift', 'entry_effect', 'frame'].includes(type)) return res.status(400).json({ ok: false, error: 'type must be gift, entry_effect or frame / النوع غير صالح' });
  const item = { id: newId('catalog'), type, name, price: price || 0, format: format || null, special: Boolean(special), status: 'draft', ownedByUsers: [], purchaseCount: 0, createdBy: req.user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  store.catalog.set(item.id, item);
  store.addAudit(req.user.id, 'catalog.create', { itemId: item.id }, null, item);
  res.status(201).json({ ok: true, item });
});

function transition(req, res, nextStatus) {
  const item = store.catalog.get(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: 'Item not found / العنصر غير موجود' });
  const result = catalogSvc.transitionItem(item, nextStatus);
  if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
  store.addAudit(req.user.id, `catalog.${nextStatus}`, { itemId: item.id }, { status: result.before }, { status: result.after });
  return res.json({ ok: true, item });
}
router.post('/catalog/:id/approve', requireRole('admin', 'catalog_manager'), (req, res) => transition(req, res, 'approved'));
router.post('/catalog/:id/publish', requireRole('admin', 'catalog_manager'), (req, res) => transition(req, res, 'published'));
router.post('/catalog/:id/disable', requireRole('admin', 'catalog_manager'), (req, res) => transition(req, res, 'disabled'));
router.post('/catalog/:id/archive', requireRole('admin', 'catalog_manager'), (req, res) => transition(req, res, 'archived'));

router.delete('/catalog/:id', requireRole('admin', 'catalog_manager'), (req, res) => {
  const item = store.catalog.get(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: 'Item not found / العنصر غير موجود' });
  const check = catalogSvc.canDeleteItem(item);
  if (!check.canDelete) return res.status(400).json({ ok: false, error: check.reason });
  store.catalog.delete(req.params.id);
  store.addAudit(req.user.id, 'catalog.delete', { itemId: req.params.id }, item, null);
  res.json({ ok: true });
});

module.exports = router;

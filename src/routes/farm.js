'use strict';
const express = require('express');
const { store } = require('../store');
const { validateBody } = require('../middleware/validate');

const router = express.Router();
function getFarm(userId) {
  if (!store.farms.has(userId)) store.farms.set(userId, { plots: [], coinsEarned: 0 });
  return store.farms.get(userId);
}
router.get('/farm', (req, res) => res.json({ ok: true, farm: getFarm(req.user.id) }));
router.post('/farm/plant', validateBody(['crop']), (req, res) => {
  const farm = getFarm(req.user.id);
  const plot = { id: `plot_${Date.now()}`, crop: req.body.crop, plantedAt: new Date().toISOString(), status: 'growing' };
  farm.plots.push(plot);
  res.status(201).json({ ok: true, plot, farm });
});
router.post('/farm/harvest', validateBody(['plotId']), (req, res) => {
  const farm = getFarm(req.user.id);
  const plot = farm.plots.find((p) => p.id === req.body.plotId);
  if (!plot) return res.status(404).json({ ok: false, error: 'Plot not found / القطعة غير موجودة' });
  plot.status = 'harvested';
  farm.coinsEarned += 10;
  res.json({ ok: true, plot, farm });
});
module.exports = router;

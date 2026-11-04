'use strict';
// Settings: only a SAFE public subset is ever returned — no secret values,
// no env values, no keys. Feature flags carry enabled + reason only.
const express = require('express');
const config = require('../config');

const router = express.Router();
router.get('/settings/feature-flags', (req, res) => {
  res.json({ ok: true, mode: config.mode, demo: config.demo, featureFlags: config.featureFlags });
});
router.get('/settings', (req, res) => {
  res.json({ ok: true, appName: 'Wanas', mode: config.mode, demo: config.demo, featureFlags: config.featureFlags });
});
module.exports = router;

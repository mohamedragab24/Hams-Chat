'use strict';

function validateBody(requiredFields) {
  return (req, res, next) => {
    const body = req.body || {};
    const missing = requiredFields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
    if (missing.length) {
      return res.status(400).json({ ok: false, error: 'Missing required fields / حقول مطلوبة ناقصة', missing });
    }
    return next();
  };
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidCurrency(currency) {
  return currency === 'coins' || currency === 'premiumCoins';
}

module.exports = { validateBody, isPositiveNumber, isValidCurrency };

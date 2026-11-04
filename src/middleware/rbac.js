'use strict';
// Role-based access control. Returns 403 unless req.user.role is allowed.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: 'Unauthenticated / غير مسجّل دخول' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Forbidden: insufficient role / صلاحيات غير كافية' });
    }
    return next();
  };
}

module.exports = { requireRole };

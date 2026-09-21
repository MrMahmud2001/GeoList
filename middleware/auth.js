function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Не авторизован' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Не авторизован' });
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: 'Нет прав доступа' });
    next();
  };
}

module.exports = { requireAuth, requireRole };

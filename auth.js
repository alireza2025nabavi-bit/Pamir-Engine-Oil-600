// auth.js — امضا/بررسی JWT و میدل‌ورهای محافظت از مسیرها بر اساس نقش
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'توکن ارسال نشده است' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی شده است' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'دسترسی مجاز نیست' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole, SECRET };

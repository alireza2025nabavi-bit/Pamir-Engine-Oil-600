const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken } = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'نام کاربری و رمز الزامی است' });

  // ۱) سوپر ادمین — از env خوانده می‌شود، هیچ‌وقت داخل دیتابیس یا کد قابل‌مشاهده نیست
  const suUser = process.env.SUPERADMIN_USER;
  const suHash = process.env.SUPERADMIN_PASSWORD_HASH;
  if (suUser && suHash && username === suUser && bcrypt.compareSync(password, suHash)) {
    const token = signToken({ role: 'superadmin', id: 0, name: 'مدیر ارشد' });
    return res.json({ token, role: 'superadmin', name: 'مدیر ارشد', id: 0 });
  }

  // ۲) ادمین‌های ولایتی
  const admin = db.get('admins').find({ username }).value();
  if (admin && bcrypt.compareSync(password, admin.passwordHash)) {
    const token = signToken({ role: 'admin', id: admin.id, name: admin.name });
    return res.json({ token, role: 'admin', name: admin.name, id: admin.id });
  }

  // ۳) نمایندگان
  const agent = db.get('agents').find({ username }).value();
  if (agent && bcrypt.compareSync(password, agent.passwordHash)) {
    const token = signToken({ role: 'agent', id: agent.id, adminId: agent.adminId, name: agent.name });
    return res.json({ token, role: 'agent', name: agent.name, id: agent.id });
  }

  return res.status(401).json({ error: 'نام کاربری یا رمز اشتباه است' });
});

module.exports = router;

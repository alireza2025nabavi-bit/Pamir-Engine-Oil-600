const express = require('express');
const bcrypt = require('bcryptjs');
const { db, nextId } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireRole('superadmin'));

// لیست ادمین‌ها
router.get('/admins', (req, res) => {
  const admins = db.get('admins').value().map(({ passwordHash, ...rest }) => rest);
  res.json(admins);
});

// ساخت ادمین جدید
router.post('/admins', (req, res) => {
  const { name, username, password } = req.body || {};
  if (!name || !username || !password) return res.status(400).json({ error: 'نام، نام کاربری و رمز الزامی است' });
  if (db.get('admins').find({ username }).value()) return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده' });

  const admin = { id: nextId('admin'), name, username, passwordHash: bcrypt.hashSync(password, 10) };
  db.get('admins').push(admin).write();
  const { passwordHash, ...safe } = admin;
  res.status(201).json(safe);
});

// ویرایش ادمین
router.put('/admins/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, username, password } = req.body || {};
  const admin = db.get('admins').find({ id }).value();
  if (!admin) return res.status(404).json({ error: 'ادمین یافت نشد' });
  if (username && db.get('admins').find(a => a.username === username && a.id !== id).value()) {
    return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده' });
  }
  const patch = {};
  if (name) patch.name = name;
  if (username) patch.username = username;
  if (password) patch.passwordHash = bcrypt.hashSync(password, 10);
  db.get('admins').find({ id }).assign(patch).write();
  const { passwordHash, ...safe } = db.get('admins').find({ id }).value();
  res.json(safe);
});

// حذف ادمین (به همراه نمایندگان و سفارش‌های آن — عملیات آبشاری)
router.delete('/admins/:id', (req, res) => {
  const id = Number(req.params.id);
  if (db.get('admins').size().value() <= 1) return res.status(400).json({ error: 'حداقل یک ادمین باید باقی بماند' });
  const agentIds = db.get('agents').filter({ adminId: id }).map('id').value();
  db.get('orders').remove(o => agentIds.includes(o.agentId)).write();
  db.get('payments').remove(p => agentIds.includes(p.agentId)).write();
  db.get('agents').remove({ adminId: id }).write();
  db.get('admins').remove({ id }).write();
  res.json({ ok: true });
});

// گزارش کامل سراسری
router.get('/report', (req, res) => {
  const orders = db.get('orders').value();
  const payments = db.get('payments').value();
  const totals = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((s, o) => s + (o.total || 0), 0),
    totalDue: orders.reduce((s, o) => s + (o.due || 0), 0),
    totalCollected: orders.reduce((s, o) => s + (o.paid || 0), 0),
    totalAgents: db.get('agents').size().value(),
    totalAdmins: db.get('admins').size().value(),
  };
  res.json({ totals, orders, payments });
});

// پاک‌سازی کامل سیستم — نیازمند تایپ عبارت تأیید
router.post('/reset', (req, res) => {
  const { confirm } = req.body || {};
  if (confirm !== 'پاک کن') return res.status(400).json({ error: 'برای تأیید باید عبارت «پاک کن» ارسال شود' });

  db.set('orders', []).write();
  db.set('payments', []).write();
  db.set('agents', []).write();
  db.set('admins', []).write();
  db.set('counters', { admin: 0, agent: 0, order: 1000, payment: 6000 }).write();

  // یک ادمین مرکزی پیش‌فرض دوباره ساخته می‌شود
  const admin = { id: nextId('admin'), name: 'مدیر مرکزی', username: 'admin', passwordHash: bcrypt.hashSync('1234', 10) };
  db.get('admins').push(admin).write();

  res.json({ ok: true, message: 'سیستم کاملاً پاک‌سازی شد' });
});

module.exports = router;

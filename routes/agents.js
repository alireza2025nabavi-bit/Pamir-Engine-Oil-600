const express = require('express');
const bcrypt = require('bcryptjs');
const { db, nextId } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// لیست نمایندگان همین ادمین (جداسازی کامل بین ادمین‌ها)
router.get('/', (req, res) => {
  const agents = db.get('agents').filter({ adminId: req.user.id }).value()
    .map(({ passwordHash, ...rest }) => rest);
  res.json(agents);
});

router.post('/', (req, res) => {
  const { name, phone, address, city, username, password } = req.body || {};
  if (!name || !phone || !username || !password) return res.status(400).json({ error: 'فیلدهای الزامی ناقص است' });
  if (db.get('agents').find({ username }).value()) return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده' });

  const agent = {
    id: nextId('agent'), adminId: req.user.id, name, phone,
    address: address || city || '', city: city || '',
    username, passwordHash: bcrypt.hashSync(password, 10),
  };
  db.get('agents').push(agent).write();
  const { passwordHash, ...safe } = agent;
  res.status(201).json(safe);
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const agent = db.get('agents').find({ id, adminId: req.user.id }).value();
  if (!agent) return res.status(404).json({ error: 'نماینده یافت نشد' });

  const { name, phone, address, city, username, password } = req.body || {};
  if (username && db.get('agents').find(a => a.username === username && a.id !== id).value()) {
    return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده' });
  }
  const patch = {};
  if (name) patch.name = name;
  if (phone) patch.phone = phone;
  if (address) patch.address = address;
  if (city) patch.city = city;
  if (username) patch.username = username;
  if (password) patch.passwordHash = bcrypt.hashSync(password, 10);
  db.get('agents').find({ id }).assign(patch).write();
  const { passwordHash, ...safe } = db.get('agents').find({ id }).value();
  res.json(safe);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const agent = db.get('agents').find({ id, adminId: req.user.id }).value();
  if (!agent) return res.status(404).json({ error: 'نماینده یافت نشد' });
  db.get('orders').remove({ agentId: id }).write();
  db.get('payments').remove({ agentId: id }).write();
  db.get('agents').remove({ id }).write();
  res.json({ ok: true });
});

module.exports = router;

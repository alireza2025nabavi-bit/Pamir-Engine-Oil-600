const express = require('express');
const { db, nextId } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin', 'agent'));

function myAgentIds(req) {
  if (req.user.role === 'agent') return [req.user.id];
  return db.get('agents').filter({ adminId: req.user.id }).map('id').value();
}

router.get('/', (req, res) => {
  const ids = myAgentIds(req);
  const orders = db.get('orders').filter(o => ids.includes(o.agentId)).value();
  res.json(orders);
});

router.post('/', (req, res) => {
  if (req.user.role !== 'agent') return res.status(403).json({ error: 'فقط نماینده می‌تواند سفارش ثبت کند' });
  const { oilName, grade, qty, unit, type, total } = req.body || {};
  if (!oilName || !qty || !total) return res.status(400).json({ error: 'فیلدهای الزامی ناقص است' });

  const order = {
    id: 'ORD-' + nextId('order'), agentId: req.user.id,
    oilName, grade: grade || '', qty, unit: unit || '', type: type || '',
    total, paid: 0, due: total, status: 'در انتظار', createdAt: new Date().toISOString(),
  };
  db.get('orders').push(order).write();
  res.status(201).json(order);
});

module.exports = router;

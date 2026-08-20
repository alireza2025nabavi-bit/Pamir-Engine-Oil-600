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
  const payments = db.get('payments').filter(p => ids.includes(p.agentId)).value();
  res.json(payments);
});

// ثبت پرداخت قسط بدهی — با توزیع FIFO روی سفارش‌های دارای باقیمانده
router.post('/', (req, res) => {
  if (req.user.role !== 'agent') return res.status(403).json({ error: 'فقط نماینده می‌تواند پرداخت ثبت کند' });
  const { amount } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: 'مبلغ نامعتبر است' });

  let remaining = amount;
  const dueOrders = db.get('orders')
    .filter(o => o.agentId === req.user.id && o.due > 0)
    .sortBy('createdAt')
    .value();

  for (const o of dueOrders) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, o.due);
    db.get('orders').find({ id: o.id }).assign({
      due: Math.round(o.due - pay),
      paid: Math.round((o.paid || 0) + pay),
    }).write();
    remaining -= pay;
  }

  const payment = {
    id: 'PAY-' + nextId('payment'), agentId: req.user.id,
    amount, createdAt: new Date().toISOString(),
  };
  db.get('payments').push(payment).write();
  res.status(201).json(payment);
});

module.exports = router;

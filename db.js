// db.js — دیتابیس ساده مبتنی بر فایل JSON (lowdb)
// برای شروع سریع کافی است؛ برای پروڈاکشن واقعی بهتر است به PostgreSQL/MySQL مهاجرت کنید.
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

db.defaults({ admins: [], agents: [], orders: [], payments: [], counters: { admin: 0, agent: 0, order: 1000, payment: 6000 }, appState: null }).write();

function nextId(kind) {
  const val = db.get(`counters.${kind}`).value() + 1;
  db.set(`counters.${kind}`, val).write();
  return val;
}

module.exports = { db, nextId };

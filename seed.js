// seed.js — ایجاد یک ادمین و یک نماینده پیش‌فرض برای تست
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, nextId } = require('./db');

if (!db.get('admins').find({ username: 'admin' }).value()) {
  const admin = { id: nextId('admin'), name: 'مدیر مرکزی', username: 'admin', passwordHash: bcrypt.hashSync('1234', 10) };
  db.get('admins').push(admin).write();
  console.log('ادمین پیش‌فرض ساخته شد → admin / 1234');

  const agent = {
    id: nextId('agent'), adminId: admin.id, name: 'عبدالحمید', phone: '0728201250',
    address: 'هرات، شهرنو', city: 'هرات', username: 'agent', passwordHash: bcrypt.hashSync('agent123', 10),
  };
  db.get('agents').push(agent).write();
  console.log('نماینده پیش‌فرض ساخته شد → agent / agent123');
} else {
  console.log('داده‌های اولیه از قبل موجود است.');
}

console.log('\nبرای ساخت رمز هش‌شده سوپر ادمین (برای .env) دستور زیر را اجرا کنید:');
console.log('  node hash-password.js <رمز-دلخواه>');

// hash-password.js — تولید هش bcrypt برای گذاشتن در SUPERADMIN_PASSWORD_HASH داخل .env
// استفاده: node hash-password.js "رمز-من"
const bcrypt = require('bcryptjs');
const pass = process.argv[2];
if (!pass) {
  console.log('استفاده: node hash-password.js "رمز-دلخواه"');
  process.exit(1);
}
console.log(bcrypt.hashSync(pass, 10));

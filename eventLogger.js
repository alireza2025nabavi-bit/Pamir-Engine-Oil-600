// eventLogger.js — ارسال پیام خوانا برای هر رویداد مهم (نماینده/سفارش/تراکنش جدید)
// این‌ها جدا از فایل دیتابیس هستند؛ فقط برای اینکه اعضای گروه بتوانند فعالیت‌ها
// را به‌صورت زنده در گروه ببینند (یک دفتر ثبت ساده).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API = `https://api.telegram.org/bot${TOKEN}`;

async function sendLog(text) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('خطا در ارسال پیام ثبت رویداد به تلگرام:', e.message);
  }
}

function keyOf(item) {
  return item?.id ?? item?.ID ?? item?.username ?? JSON.stringify(item);
}

function indexById(arr) {
  const m = new Map();
  (arr || []).forEach((x) => m.set(keyOf(x), x));
  return m;
}

// چیدمان بخش‌هایی که باید رصد شوند؛ در صورت نیاز می‌توانید کلید/برچسب اضافه کنید
const WATCHED_SECTIONS = [
  {
    key: 'AGENTS',
    label: '👤 نماینده جدید ثبت شد',
    describe: (a) => `نام: ${a.name || '-'}\nشهر: ${a.city || a.address || '-'}\nیوزرنیم: ${a.username || '-'}`,
  },
  {
    key: 'ORDERS',
    label: '📦 سفارش جدید ثبت شد',
    describe: (o) => `شماره: #${o.id ?? '-'}\nمبلغ: ${o.total ?? o.amount ?? '-'}`,
  },
  {
    key: 'PAYMENTS',
    label: '💰 تراکنش/پرداخت جدید ثبت شد',
    describe: (p) => `شماره: #${p.id ?? '-'}\nمبلغ: ${p.amount ?? '-'}`,
  },
];

// مقایسه‌ی state قبلی و جدید و ارسال پیام برای هر رکورد تازه‌اضافه‌شده
function diffAndLog(oldState, newState) {
  if (!oldState) return; // اولین ذخیره — چیزی برای مقایسه نداریم
  for (const section of WATCHED_SECTIONS) {
    const oldMap = indexById(oldState[section.key]);
    const newArr = newState[section.key] || [];
    for (const item of newArr) {
      if (!oldMap.has(keyOf(item))) {
        const time = new Date().toLocaleString('fa-IR');
        sendLog(`${section.label}\n${section.describe(item)}\n🕒 ${time}`);
      }
    }
  }
}

module.exports = { diffAndLog, sendLog };

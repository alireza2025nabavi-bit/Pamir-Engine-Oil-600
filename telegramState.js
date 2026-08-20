// telegramState.js — ذخیره کامل «state» برنامه در گروه تلگرام
//
// طرز کار:
//  - کل داده‌ی برنامه (ADMINS/AGENTS/ORDERS/PAYMENTS/...) یک بار به صورت فایل JSON
//    به گروه فرستاده می‌شود (sendDocument) و پیام آن پین می‌شود.
//  - هر بار که داده تغییر می‌کند، همان پیام ویرایش می‌شود (editMessageMedia) —
//    یعنی به‌جای انباشته‌شدن پیام‌های جدید، یک «فایل دیتابیس زنده» در گروه داریم.
//  - شناسه‌ی آن پیام (message_id) و شناسه‌ی آخرین فایل (file_id) در یک فایل کوچک
//    محلی (telegram-meta.json) نگه‌داری می‌شود تا سرور بعد از ری‌استارت هم آن‌ها را
//    بشناسد. اگر این فایل محلی از بین برود (مثلاً روی هاست رایگان Render که دیسک
//    موقتی دارد)، برنامه به‌صورت خودکار یک پیام/فایل جدید می‌سازد.
//
// نیازمندی: Node.js نسخه 18 یا بالاتر (برای fetch/FormData/Blob داخلی).

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API = `https://api.telegram.org/bot${TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}`;

const META_PATH = path.join(__dirname, 'telegram-meta.json');

function assertConfigured() {
  if (!TOKEN || !CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN یا TELEGRAM_CHAT_ID در تنظیمات (.env) قرار داده نشده است');
  }
}

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeMeta(meta) {
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
}

async function tgCall(method, body, isForm = false) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`خطای Telegram API در ${method}: ${data.description || res.status}`);
  }
  return data.result;
}

// نوشتن/به‌روزرسانی وضعیت کامل برنامه در گروه تلگرام
async function setState(state) {
  assertConfigured();
  const meta = readMeta();
  const json = JSON.stringify(state);
  const blob = new Blob([Buffer.from(json, 'utf8')], { type: 'application/json' });
  const caption = `دیتابیس پامیر — بروزرسانی: ${new Date().toLocaleString('fa-IR')}`;

  let result;
  if (meta.messageId) {
    try {
      const form = new FormData();
      form.append('chat_id', CHAT_ID);
      form.append('message_id', String(meta.messageId));
      form.append('media', JSON.stringify({ type: 'document', media: 'attach://state_file', caption }));
      form.append('state_file', blob, 'pamir-state.json');
      result = await tgCall('editMessageMedia', form, true);
    } catch (e) {
      // اگر پیام قبلی دیگر در دسترس نبود (مثلاً حذف شده)، یک پیام جدید بساز
      meta.messageId = null;
    }
  }

  if (!meta.messageId) {
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('document', blob, 'pamir-state.json');
    form.append('caption', caption);
    result = await tgCall('sendDocument', form, true);
    meta.messageId = result.message_id;
    try {
      await tgCall('pinChatMessage', { chat_id: CHAT_ID, message_id: result.message_id, disable_notification: true });
    } catch (e) {
      // پین کردن اختیاری است؛ اگر بات دسترسی پین نداشته باشد مشکلی نیست
      console.warn('پین کردن پیام دیتابیس ممکن نشد (اختیاری است):', e.message);
    }
  }

  meta.fileId = result?.document?.file_id || meta.fileId;
  meta.updatedAt = new Date().toISOString();
  writeMeta(meta);
  return meta.updatedAt;
}

// خواندن آخرین وضعیت ذخیره‌شده از گروه تلگرام
async function getState() {
  assertConfigured();
  const meta = readMeta();
  if (!meta.fileId) return { state: null, updatedAt: null };

  const file = await tgCall('getFile', { file_id: meta.fileId });
  const res = await fetch(`${FILE_API}/${file.file_path}`);
  if (!res.ok) throw new Error('دانلود فایل دیتابیس از تلگرام ناموفق بود');
  const state = await res.json();
  return { state, updatedAt: meta.updatedAt || null };
}

module.exports = { getState, setState };

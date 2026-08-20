// routes/state.js — همگام‌سازی کل داده‌های برنامه با گروه تلگرام (به‌جای MongoDB)
// این مسیر همان قرارداد قبلی (GET برای خواندن / POST برای نوشتن کل state) را دارد،
// پس نیازی به تغییر کد برنامه‌ی تک‌فایلی HTML شما نیست — فقط آدرس سرور را همین سرور بگذارید.
const express = require('express');
const telegramState = require('../telegramState');
const { diffAndLog } = require('../eventLogger');

const router = express.Router();

function checkSecret(req, res, next) {
  const secret = process.env.APP_SECRET;
  if (!secret) return res.status(500).json({ error: 'APP_SECRET در سرور تنظیم نشده است' });
  const provided = req.headers['x-app-secret'];
  if (provided !== secret) return res.status(401).json({ error: 'کلید دسترسی نامعتبر است' });
  next();
}

router.use(checkSecret);

// دریافت آخرین نسخه‌ی ذخیره‌شده (از فایل دیتابیس داخل گروه تلگرام)
router.get('/', async (req, res) => {
  try {
    const { state, updatedAt } = await telegramState.getState();
    res.json({ state: state || null, updatedAt: updatedAt || null });
  } catch (e) {
    console.error('خطا در خواندن از تلگرام', e);
    res.status(500).json({ error: 'خطا در اتصال به گروه تلگرام: ' + e.message });
  }
});

// ذخیره‌ی نسخه‌ی جدید (کل بلاک را جایگزین می‌کند + ثبت رویدادهای تازه در گروه)
router.post('/', async (req, res) => {
  const { state } = req.body || {};
  if (!state) return res.status(400).json({ error: 'state ارسال نشده است' });
  try {
    let oldState = null;
    try {
      oldState = (await telegramState.getState()).state;
    } catch (e) {
      // اگر این اولین ذخیره است ممکن است خطا بدهد؛ مشکلی نیست
    }
    const updatedAt = await telegramState.setState(state);
    diffAndLog(oldState, state);
    res.json({ ok: true, updatedAt });
  } catch (e) {
    console.error('خطا در نوشتن در تلگرام', e);
    res.status(500).json({ error: 'خطا در اتصال به گروه تلگرام: ' + e.message });
  }
});

module.exports = router;

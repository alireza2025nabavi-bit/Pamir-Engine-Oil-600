require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // بلاک کامل داده (شامل عکس بنر base64) ممکن است چند مگابایت باشد

app.use('/api/auth', require('./routes/auth'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/state', require('./routes/state'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Pamir Oil API listening on http://localhost:${PORT}`));

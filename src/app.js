const express = require('express');
const cors = require('cors');

const postsRouter = require('./routes/posts');
const uploadsRouter = require('./routes/uploads');

const app = express();

const allowedOrigins = (process.env.ADMIN_PORTAL_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server) — not a browser request, allow.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/posts', postsRouter);
app.use('/uploads', uploadsRouter);

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Forbidden: origin not allowed.' });
  }
  next(err);
});

module.exports = app;

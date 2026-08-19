const express = require('express');
const cors = require('cors');

const postsRouter = require('./routes/posts');

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

module.exports = app;

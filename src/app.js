const express = require('express');

const postsRouter = require('./routes/posts');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/posts', postsRouter);

module.exports = app;

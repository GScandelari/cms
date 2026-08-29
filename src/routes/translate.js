const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { translatePost } = require('../services/translateService');

const router = Router();

// POST /translate — takes the post's current PT fields (whether the post is
// already saved or still being drafted in the editor) and returns an English
// draft translation. Never writes anything itself — the caller reviews/edits
// the result and saves it as part of the post's own translations.en field via
// the normal POST/PUT /posts flow. Same auth as writing posts, since every
// call costs real money against the Anthropic API.
router.post('/', requireAuth, async (req, res) => {
  const { title, description, content } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Field "title" is required and must be a non-empty string.' });
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Field "content" is required and must be a non-empty string.' });
  }

  try {
    const translated = await translatePost({ title, description, content });
    res.json(translated);
  } catch (err) {
    console.error('POST /translate failed:', err);
    res.status(502).json({ error: err.message || 'Falha ao traduzir o post.' });
  }
});

module.exports = router;

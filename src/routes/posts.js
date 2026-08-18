const { Router } = require('express');
const { validatePost, validatePostUpdate } = require('../middlewares/validate');
const { requireApiKey } = require('../middlewares/auth');
const postsService = require('../services/postsService');

const router = Router();

// GET /posts
router.get('/', async (req, res) => {
  try {
    const posts = await postsService.getAllPosts();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve posts.' });
  }
});

// GET /posts/:id
router.get('/:id', async (req, res) => {
  try {
    const post = await postsService.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve post.' });
  }
});

// POST /posts
router.post('/', requireApiKey, validatePost, async (req, res) => {
  try {
    const post = await postsService.createPost(req.body);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// PUT /posts/:id
router.put('/:id', requireApiKey, validatePostUpdate, async (req, res) => {
  try {
    const post = await postsService.updatePost(req.params.id, req.body);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// DELETE /posts/:id
router.delete('/:id', requireApiKey, async (req, res) => {
  try {
    const deleted = await postsService.deletePost(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Post not found.' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;

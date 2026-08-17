function validatePost(req, res, next) {
  const { title, content, slug } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Field "title" is required and must be a non-empty string.' });
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Field "content" is required and must be a non-empty string.' });
  }
  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    return res.status(400).json({ error: 'Field "slug" is required and must be a non-empty string.' });
  }

  next();
}

const UPDATABLE_FIELDS = ['title', 'content', 'slug', 'published'];

function validatePostUpdate(req, res, next) {
  const hasField = UPDATABLE_FIELDS.some((f) => req.body[f] !== undefined);
  if (!hasField) {
    return res.status(400).json({
      error: `Request body must contain at least one updatable field: ${UPDATABLE_FIELDS.join(', ')}.`,
    });
  }
  next();
}

module.exports = { validatePost, validatePostUpdate };

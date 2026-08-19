function validateOptionalFields(body) {
  const { description, tags, lang, publishAt } = body;

  if (description !== undefined && typeof description !== 'string') {
    return 'Field "description" must be a string.';
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
      return 'Field "tags" must be an array of strings.';
    }
  }
  if (lang !== undefined && lang !== 'pt' && lang !== 'en') {
    return 'Field "lang" must be "pt" or "en".';
  }
  if (publishAt !== undefined && publishAt !== null) {
    if (typeof publishAt !== 'string' || Number.isNaN(new Date(publishAt).getTime())) {
      return 'Field "publishAt" must be an ISO 8601 date string, or null to clear it.';
    }
  }
  return null;
}

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

  const optionalError = validateOptionalFields(req.body);
  if (optionalError) {
    return res.status(400).json({ error: optionalError });
  }

  next();
}

const UPDATABLE_FIELDS = ['title', 'content', 'slug', 'published', 'description', 'tags', 'lang', 'publishAt'];

function validatePostUpdate(req, res, next) {
  const hasField = UPDATABLE_FIELDS.some((f) => req.body[f] !== undefined);
  if (!hasField) {
    return res.status(400).json({
      error: `Request body must contain at least one updatable field: ${UPDATABLE_FIELDS.join(', ')}.`,
    });
  }

  const optionalError = validateOptionalFields(req.body);
  if (optionalError) {
    return res.status(400).json({ error: optionalError });
  }

  next();
}

module.exports = { validatePost, validatePostUpdate };

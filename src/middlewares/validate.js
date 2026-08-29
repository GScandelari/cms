// One entry per locale a post has been translated into, e.g.
// { en: { title, description, content } }. Keyed by locale code so a post
// could gain more locales later without a schema change.
function validateTranslations(translations) {
  if (typeof translations !== 'object' || translations === null || Array.isArray(translations)) {
    return 'Field "translations" must be an object keyed by locale code.';
  }
  for (const [locale, fields] of Object.entries(translations)) {
    if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
      return `Field "translations.${locale}" must be an object.`;
    }
    if (fields.title !== undefined && typeof fields.title !== 'string') {
      return `Field "translations.${locale}.title" must be a string.`;
    }
    if (fields.description !== undefined && typeof fields.description !== 'string') {
      return `Field "translations.${locale}.description" must be a string.`;
    }
    if (fields.content !== undefined && typeof fields.content !== 'string') {
      return `Field "translations.${locale}.content" must be a string.`;
    }
  }
  return null;
}

function validateOptionalFields(body) {
  const { description, tags, lang, publishAt, translations } = body;

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
  if (translations !== undefined) {
    const translationsError = validateTranslations(translations);
    if (translationsError) return translationsError;
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

  const { createdAt } = req.body;
  if (createdAt !== undefined) {
    if (typeof createdAt !== 'string' || Number.isNaN(new Date(createdAt).getTime())) {
      return res.status(400).json({ error: 'Field "createdAt" must be an ISO 8601 date string.' });
    }
  }

  next();
}

const UPDATABLE_FIELDS = ['title', 'content', 'slug', 'published', 'description', 'tags', 'lang', 'publishAt', 'translations'];

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

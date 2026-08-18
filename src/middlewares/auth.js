function requireApiKey(req, res, next) {
  const configuredKey = process.env.CMS_API_KEY;
  if (!configuredKey) {
    return res.status(500).json({ error: 'Server misconfigured: CMS_API_KEY is not set.' });
  }

  const providedKey = req.header('x-api-key');
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid API key.' });
  }

  next();
}

module.exports = { requireApiKey };

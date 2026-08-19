const { getAuth } = require('firebase-admin/auth');

function getAllowedEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function tryApiKey(req) {
  const configuredKey = process.env.CMS_API_KEY;
  const providedKey = req.header('x-api-key');
  return Boolean(configuredKey && providedKey && providedKey === configuredKey);
}

async function tryFirebaseToken(req) {
  const authHeader = req.header('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return false;

  const allowedEmails = getAllowedEmails();
  if (!allowedEmails.length) return false;

  try {
    const decoded = await getAuth().verifyIdToken(match[1]);
    if (!decoded.email || !decoded.email_verified) return false;
    return allowedEmails.includes(decoded.email.toLowerCase());
  } catch (err) {
    console.error('tryFirebaseToken: token verification failed:', err.message);
    return false;
  }
}

// Accepts either a matching x-api-key header (scripts/CLI) or a Firebase Auth
// ID token for an allow-listed email (the admin portal). Rejects with 401
// whenever neither credential validates — never distinguishes "server
// misconfigured" from "wrong credential" in the response.
async function requireAuth(req, res, next) {
  if (await tryApiKey(req)) return next();
  if (await tryFirebaseToken(req)) return next();

  return res.status(401).json({ error: 'Unauthorized: provide a valid x-api-key or Authorization bearer token.' });
}

module.exports = { requireAuth };

// Defaults to this project's own site so nothing breaks for the current
// deployment if the secret is never set. Reusing this CMS for another site
// just means setting GITHUB_DISPATCH_REPO to that site's repo — no code
// change or redeploy of this file needed.
const DEFAULT_REPO = 'GScandelari/website-gscandelari';
const EVENT_TYPE = 'cms-post-published';

async function triggerSiteRebuild() {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    console.error('triggerSiteRebuild skipped: GITHUB_DISPATCH_TOKEN is not set.');
    return false;
  }

  const repo = process.env.GITHUB_DISPATCH_REPO || DEFAULT_REPO;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: EVENT_TYPE }),
    });

    if (!res.ok) {
      console.error(`triggerSiteRebuild failed: GitHub API returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('triggerSiteRebuild failed:', err);
    return false;
  }
}

module.exports = { triggerSiteRebuild };

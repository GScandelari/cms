const REPO = 'GScandelari/website-gscandelari';
const EVENT_TYPE = 'cms-post-published';

async function triggerSiteRebuild() {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    console.error('triggerSiteRebuild skipped: GITHUB_DISPATCH_TOKEN is not set.');
    return false;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
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

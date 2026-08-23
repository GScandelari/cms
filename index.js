const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const app = require('./src/app');
const { publishDuePosts } = require('./src/services/postsService');
const { triggerSiteRebuild } = require('./src/services/githubDispatch');

exports.api = onRequest(
  {
    region: 'southamerica-east1',
    secrets: ['CMS_API_KEY', 'GITHUB_DISPATCH_TOKEN', 'GITHUB_DISPATCH_REPO', 'ADMIN_EMAILS', 'ADMIN_PORTAL_ORIGINS'],
  },
  app
);

exports.publishScheduledPosts = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'southamerica-east1',
    secrets: ['GITHUB_DISPATCH_TOKEN', 'GITHUB_DISPATCH_REPO'],
  },
  async () => {
    const published = await publishDuePosts();
    if (published.length > 0) {
      console.log(`publishScheduledPosts: published ${published.length} post(s):`, published.map((p) => p.slug));
      await triggerSiteRebuild();
    }
  }
);

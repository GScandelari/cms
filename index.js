const { onRequest } = require('firebase-functions/v2/https');
const app = require('./src/app');

exports.api = onRequest({ region: 'southamerica-east1', secrets: ['CMS_API_KEY'] }, app);

jest.mock('../src/services/postsService');
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: jest.fn() }),
}));

const ORIGINAL_ORIGINS = process.env.ADMIN_PORTAL_ORIGINS;

describe('CORS', () => {
  afterEach(() => {
    jest.resetModules();
    process.env.ADMIN_PORTAL_ORIGINS = ORIGINAL_ORIGINS;
  });

  it('returns a JSON 403 (not the default Express HTML error page) for a disallowed origin', async () => {
    process.env.ADMIN_PORTAL_ORIGINS = 'https://gscandelari-cms-admin.web.app';
    jest.resetModules();
    const request = require('supertest');
    const app = require('../src/app');
    const postsService = require('../src/services/postsService');
    postsService.getAllPosts.mockResolvedValue([]);

    const res = await request(app).get('/posts').set('Origin', 'https://evil.example.com');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden: origin not allowed.' });
  });

  it('allows a request from an origin in ADMIN_PORTAL_ORIGINS', async () => {
    process.env.ADMIN_PORTAL_ORIGINS = 'https://gscandelari-cms-admin.web.app';
    jest.resetModules();
    const request = require('supertest');
    const app = require('../src/app');
    const postsService = require('../src/services/postsService');
    postsService.getAllPosts.mockResolvedValue([]);

    const res = await request(app).get('/posts').set('Origin', 'https://gscandelari-cms-admin.web.app');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://gscandelari-cms-admin.web.app');
  });

  it('allows requests with no Origin header (curl/server-to-server)', async () => {
    process.env.ADMIN_PORTAL_ORIGINS = 'https://gscandelari-cms-admin.web.app';
    jest.resetModules();
    const request = require('supertest');
    const app = require('../src/app');
    const postsService = require('../src/services/postsService');
    postsService.getAllPosts.mockResolvedValue([]);

    const res = await request(app).get('/posts');

    expect(res.status).toBe(200);
  });
});

jest.mock('../src/services/postsService');
jest.mock('../src/services/githubDispatch');

const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

const TEST_API_KEY = 'test-api-key';
process.env.CMS_API_KEY = TEST_API_KEY;

const request = require('supertest');
const app = require('../src/app');
const postsService = require('../src/services/postsService');
const { triggerSiteRebuild } = require('../src/services/githubDispatch');

const samplePost = {
  id: 'abc123',
  title: 'Hello World',
  content: 'My first post',
  slug: 'hello-world',
  published: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

afterEach(() => jest.clearAllMocks());

describe('GET /posts', () => {
  it('returns list of posts', async () => {
    postsService.getAllPosts.mockResolvedValue([samplePost]);
    const res = await request(app).get('/posts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([samplePost]);
  });

  it('returns 500 on service error', async () => {
    postsService.getAllPosts.mockRejectedValue(new Error('db error'));
    const res = await request(app).get('/posts');
    expect(res.status).toBe(500);
  });
});

describe('GET /posts/:id', () => {
  it('returns a post by id', async () => {
    postsService.getPostById.mockResolvedValue(samplePost);
    const res = await request(app).get('/posts/abc123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(samplePost);
  });

  it('returns 404 when post not found', async () => {
    postsService.getPostById.mockResolvedValue(null);
    const res = await request(app).get('/posts/notexist');
    expect(res.status).toBe(404);
  });
});

describe('POST /posts', () => {
  it('creates a post and returns 201', async () => {
    postsService.createPost.mockResolvedValue(samplePost);
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello World', content: 'My first post', slug: 'hello-world' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(samplePost);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ content: 'My first post', slug: 'hello-world' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when content is missing', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello World', slug: 'hello-world' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when slug is missing', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello World', content: 'My first post' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /posts/:id', () => {
  it('returns 400 when body has no recognized fields', async () => {
    const res = await request(app)
      .put('/posts/abc123')
      .set('x-api-key', TEST_API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });

  it('updates a post', async () => {
    const updated = { ...samplePost, title: 'Updated' };
    postsService.updatePost.mockResolvedValue(updated);
    const res = await request(app)
      .put('/posts/abc123')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 404 when post not found', async () => {
    postsService.updatePost.mockResolvedValue(null);
    const res = await request(app)
      .put('/posts/notexist')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /posts/:id', () => {
  it('deletes a post and returns 204', async () => {
    postsService.deletePost.mockResolvedValue(true);
    const res = await request(app)
      .delete('/posts/abc123')
      .set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(204);
  });

  it('returns 404 when post not found', async () => {
    postsService.deletePost.mockResolvedValue(false);
    const res = await request(app)
      .delete('/posts/notexist')
      .set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(404);
  });
});

describe('API key authentication on write endpoints', () => {
  it('rejects POST without an x-api-key header', async () => {
    const res = await request(app)
      .post('/posts')
      .send({ title: 'Hello', content: 'World', slug: 'hello' });
    expect(res.status).toBe(401);
    expect(postsService.createPost).not.toHaveBeenCalled();
  });

  it('rejects POST with the wrong x-api-key', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', 'wrong-key')
      .send({ title: 'Hello', content: 'World', slug: 'hello' });
    expect(res.status).toBe(401);
  });

  it('rejects PUT without an x-api-key header', async () => {
    const res = await request(app).put('/posts/abc123').send({ title: 'X' });
    expect(res.status).toBe(401);
    expect(postsService.updatePost).not.toHaveBeenCalled();
  });

  it('rejects DELETE without an x-api-key header', async () => {
    const res = await request(app).delete('/posts/abc123');
    expect(res.status).toBe(401);
    expect(postsService.deletePost).not.toHaveBeenCalled();
  });

  it('does not require an x-api-key header for GET requests', async () => {
    postsService.getAllPosts.mockResolvedValue([]);
    const res = await request(app).get('/posts');
    expect(res.status).toBe(200);
  });

  it('rejects writes with 401 when CMS_API_KEY is not configured server-side and no other credential is given', async () => {
    delete process.env.CMS_API_KEY;
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello' });
    expect(res.status).toBe(401);
    process.env.CMS_API_KEY = TEST_API_KEY;
  });
});

describe('Firebase Auth bearer token authentication on write endpoints', () => {
  const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'owner@example.com';
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS;
  });

  it('accepts a valid token for an allow-listed, verified email', async () => {
    mockVerifyIdToken.mockResolvedValue({ email: 'owner@example.com', email_verified: true });
    postsService.createPost.mockResolvedValue(samplePost);

    const res = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Hello World', content: 'My first post', slug: 'hello-world' });

    expect(res.status).toBe(201);
  });

  it('rejects a token for an email not on the allow list', async () => {
    mockVerifyIdToken.mockResolvedValue({ email: 'someone-else@example.com', email_verified: true });

    const res = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Hello', content: 'World', slug: 'hello' });

    expect(res.status).toBe(401);
  });

  it('rejects a token with an unverified email', async () => {
    mockVerifyIdToken.mockResolvedValue({ email: 'owner@example.com', email_verified: false });

    const res = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Hello', content: 'World', slug: 'hello' });

    expect(res.status).toBe(401);
  });

  it('rejects an invalid/expired token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));

    const res = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer garbage')
      .send({ title: 'Hello', content: 'World', slug: 'hello' });

    expect(res.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app)
      .post('/posts')
      .set('Authorization', 'NotBearer something')
      .send({ title: 'Hello', content: 'World', slug: 'hello' });

    expect(res.status).toBe(401);
  });
});

describe('Site rebuild trigger', () => {
  it('triggers a rebuild when a post is created already published', async () => {
    postsService.createPost.mockResolvedValue({ ...samplePost, published: true });
    await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello', published: true });
    expect(triggerSiteRebuild).toHaveBeenCalledTimes(1);
  });

  it('does not trigger a rebuild when a post is created as a draft', async () => {
    postsService.createPost.mockResolvedValue({ ...samplePost, published: false });
    await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello' });
    expect(triggerSiteRebuild).not.toHaveBeenCalled();
  });

  it('triggers a rebuild when a post is updated to published', async () => {
    postsService.updatePost.mockResolvedValue({ ...samplePost, published: true });
    await request(app)
      .put('/posts/abc123')
      .set('x-api-key', TEST_API_KEY)
      .send({ published: true });
    expect(triggerSiteRebuild).toHaveBeenCalledTimes(1);
  });

  it('does not trigger a rebuild when an update keeps the post unpublished', async () => {
    postsService.updatePost.mockResolvedValue({ ...samplePost, published: false });
    await request(app)
      .put('/posts/abc123')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Updated' });
    expect(triggerSiteRebuild).not.toHaveBeenCalled();
  });
});

describe('Optional post fields validation', () => {
  it('rejects tags that is not an array of strings', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello', tags: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid lang value', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello', lang: 'fr' });
    expect(res.status).toBe(400);
  });

  it('accepts description, tags, and lang', async () => {
    postsService.createPost.mockResolvedValue({
      ...samplePost,
      description: 'A description',
      tags: ['blog', 'ideias'],
      lang: 'pt',
    });
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({
        title: 'Hello',
        content: 'World',
        slug: 'hello',
        description: 'A description',
        tags: ['blog', 'ideias'],
        lang: 'pt',
      });
    expect(res.status).toBe(201);
    expect(res.body.tags).toEqual(['blog', 'ideias']);
  });

  it('rejects a non-date publishAt value', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello', publishAt: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('accepts a valid ISO publishAt', async () => {
    postsService.createPost.mockResolvedValue({ ...samplePost, publishAt: '2026-12-25T00:00:00.000Z' });
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello', publishAt: '2026-12-25T00:00:00.000Z' });
    expect(res.status).toBe(201);
    expect(res.body.publishAt).toBe('2026-12-25T00:00:00.000Z');
  });

  it('accepts null publishAt to clear scheduling on update', async () => {
    postsService.updatePost.mockResolvedValue({ ...samplePost, publishAt: null });
    const res = await request(app)
      .put('/posts/abc123')
      .set('x-api-key', TEST_API_KEY)
      .send({ publishAt: null });
    expect(res.status).toBe(200);
  });

  it('rejects a non-date createdAt value on create', async () => {
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello', createdAt: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('accepts a custom createdAt on create, for migrating existing content', async () => {
    postsService.createPost.mockResolvedValue({ ...samplePost, createdAt: '2026-08-16T00:00:00.000Z' });
    const res = await request(app)
      .post('/posts')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Hello', content: 'World', slug: 'hello', createdAt: '2026-08-16T00:00:00.000Z' });
    expect(res.status).toBe(201);
    expect(postsService.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: '2026-08-16T00:00:00.000Z' })
    );
    expect(res.body.createdAt).toBe('2026-08-16T00:00:00.000Z');
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

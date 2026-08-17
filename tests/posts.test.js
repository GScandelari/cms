jest.mock('../src/services/postsService');

const request = require('supertest');
const app = require('../src/app');
const postsService = require('../src/services/postsService');

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
      .send({ title: 'Hello World', content: 'My first post', slug: 'hello-world' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(samplePost);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/posts')
      .send({ content: 'My first post', slug: 'hello-world' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when content is missing', async () => {
    const res = await request(app)
      .post('/posts')
      .send({ title: 'Hello World', slug: 'hello-world' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when slug is missing', async () => {
    const res = await request(app)
      .post('/posts')
      .send({ title: 'Hello World', content: 'My first post' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /posts/:id', () => {
  it('returns 400 when body has no recognized fields', async () => {
    const res = await request(app).put('/posts/abc123').send({});
    expect(res.status).toBe(400);
  });

  it('updates a post', async () => {
    const updated = { ...samplePost, title: 'Updated' };
    postsService.updatePost.mockResolvedValue(updated);
    const res = await request(app)
      .put('/posts/abc123')
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 404 when post not found', async () => {
    postsService.updatePost.mockResolvedValue(null);
    const res = await request(app).put('/posts/notexist').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /posts/:id', () => {
  it('deletes a post and returns 204', async () => {
    postsService.deletePost.mockResolvedValue(true);
    const res = await request(app).delete('/posts/abc123');
    expect(res.status).toBe(204);
  });

  it('returns 404 when post not found', async () => {
    postsService.deletePost.mockResolvedValue(false);
    const res = await request(app).delete('/posts/notexist');
    expect(res.status).toBe(404);
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

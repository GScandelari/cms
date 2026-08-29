jest.mock('../src/services/translateService');

const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

const TEST_API_KEY = 'test-api-key';
process.env.CMS_API_KEY = TEST_API_KEY;

const request = require('supertest');
const app = require('../src/app');
const { translatePost } = require('../src/services/translateService');

afterEach(() => jest.clearAllMocks());

describe('POST /translate', () => {
  it('rejects requests without an x-api-key header', async () => {
    const res = await request(app).post('/translate').send({ title: 'T', content: 'C' });
    expect(res.status).toBe(401);
    expect(translatePost).not.toHaveBeenCalled();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/translate').set('x-api-key', TEST_API_KEY).send({ content: 'C' });
    expect(res.status).toBe(400);
    expect(translatePost).not.toHaveBeenCalled();
  });

  it('returns 400 when content is missing', async () => {
    const res = await request(app).post('/translate').set('x-api-key', TEST_API_KEY).send({ title: 'T' });
    expect(res.status).toBe(400);
    expect(translatePost).not.toHaveBeenCalled();
  });

  it('returns the translated fields on success', async () => {
    translatePost.mockResolvedValue({ title: 'Translated', description: 'Desc', content: 'Content' });

    const res = await request(app)
      .post('/translate')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'Título', description: 'Descrição', content: 'Conteúdo' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ title: 'Translated', description: 'Desc', content: 'Content' });
    expect(translatePost).toHaveBeenCalledWith({ title: 'Título', description: 'Descrição', content: 'Conteúdo' });
  });

  it('returns 502 when the translation service throws', async () => {
    translatePost.mockRejectedValue(new Error('upstream failure'));

    const res = await request(app)
      .post('/translate')
      .set('x-api-key', TEST_API_KEY)
      .send({ title: 'T', content: 'C' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('upstream failure');
  });
});

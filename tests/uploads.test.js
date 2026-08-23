jest.mock('../src/services/uploadService', () => {
  const actual = jest.requireActual('../src/services/uploadService');
  return {
    ...actual,
    uploadImage: jest.fn(),
  };
});

const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

const TEST_API_KEY = 'test-api-key';
process.env.CMS_API_KEY = TEST_API_KEY;

const request = require('supertest');
const app = require('../src/app');
const { uploadImage } = require('../src/services/uploadService');

afterEach(() => jest.clearAllMocks());

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

describe('POST /uploads', () => {
  it('rejects requests without an x-api-key header', async () => {
    const res = await request(app).post('/uploads').attach('image', tinyPng, 'test.png');
    expect(res.status).toBe(401);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('uploads an image and returns its URL', async () => {
    uploadImage.mockResolvedValue('https://storage.googleapis.com/gscandelari-cms.firebasestorage.app/uploads/test.png');

    const res = await request(app)
      .post('/uploads')
      .set('x-api-key', TEST_API_KEY)
      .attach('image', tinyPng, 'test.png');

    expect(res.status).toBe(201);
    expect(res.body.url).toBe('https://storage.googleapis.com/gscandelari-cms.firebasestorage.app/uploads/test.png');
    expect(uploadImage).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-image file', async () => {
    const res = await request(app)
      .post('/uploads')
      .set('x-api-key', TEST_API_KEY)
      .attach('image', Buffer.from('not an image'), { filename: 'file.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is sent', async () => {
    const res = await request(app).post('/uploads').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(400);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('returns 500 when the upload service throws', async () => {
    uploadImage.mockRejectedValue(new Error('bucket unreachable'));
    const res = await request(app)
      .post('/uploads')
      .set('x-api-key', TEST_API_KEY)
      .attach('image', tinyPng, 'test.png');
    expect(res.status).toBe(500);
  });
});

jest.mock('../src/services/uploadService', () => {
  const actual = jest.requireActual('../src/services/uploadService');
  return {
    ...actual,
    uploadImage: jest.fn(),
    listImages: jest.fn(),
    deleteImage: jest.fn(),
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
const { uploadImage, listImages, deleteImage } = require('../src/services/uploadService');

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

describe('GET /uploads', () => {
  it('rejects requests without an x-api-key header', async () => {
    const res = await request(app).get('/uploads');
    expect(res.status).toBe(401);
    expect(listImages).not.toHaveBeenCalled();
  });

  it('returns the list of uploaded images', async () => {
    const images = [{ name: 'a.png', url: 'https://storage.googleapis.com/bucket/uploads/a.png', size: 123 }];
    listImages.mockResolvedValue(images);

    const res = await request(app).get('/uploads').set('x-api-key', TEST_API_KEY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(images);
  });

  it('returns 500 when the service throws', async () => {
    listImages.mockRejectedValue(new Error('bucket unreachable'));
    const res = await request(app).get('/uploads').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(500);
  });
});

describe('DELETE /uploads/:name', () => {
  it('rejects requests without an x-api-key header', async () => {
    const res = await request(app).delete('/uploads/a.png');
    expect(res.status).toBe(401);
    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('deletes an image and returns 204', async () => {
    deleteImage.mockResolvedValue(true);
    const res = await request(app).delete('/uploads/a.png').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(204);
    expect(deleteImage).toHaveBeenCalledWith('a.png');
  });

  it('returns 404 when the image does not exist', async () => {
    deleteImage.mockResolvedValue(false);
    const res = await request(app).delete('/uploads/missing.png').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(404);
  });

  it('returns 500 when the service throws', async () => {
    deleteImage.mockRejectedValue(new Error('bucket unreachable'));
    const res = await request(app).delete('/uploads/a.png').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(500);
  });
});

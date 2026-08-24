const mockGetBucket = jest.fn();
jest.mock('../src/firebase', () => ({ getBucket: mockGetBucket }));

const { uploadImage, listImages, deleteImage } = require('../src/services/uploadService');

afterEach(() => jest.clearAllMocks());

function buildFakeBucket({ files = [] } = {}) {
  const savedFiles = new Map();
  const bucket = {
    name: 'test-bucket.firebasestorage.app',
    file: jest.fn((name) => {
      if (!savedFiles.has(name)) {
        savedFiles.set(name, {
          save: jest.fn().mockResolvedValue(undefined),
          exists: jest.fn().mockResolvedValue([files.some((f) => f.name === name)]),
          delete: jest.fn().mockResolvedValue(undefined),
        });
      }
      return savedFiles.get(name);
    }),
    getFiles: jest.fn().mockResolvedValue([files]),
  };
  return { bucket, savedFiles };
}

describe('uploadImage', () => {
  it('saves the file publicly under uploads/ and returns its public URL', async () => {
    const { bucket } = buildFakeBucket();
    mockGetBucket.mockReturnValue(bucket);

    const url = await uploadImage({ originalname: 'photo.JPG', mimetype: 'image/jpeg', buffer: Buffer.from('x') });

    expect(url).toMatch(/^https:\/\/storage\.googleapis\.com\/test-bucket\.firebasestorage\.app\/uploads\/.+\.jpg$/);
    const fileArg = bucket.file.mock.calls[0][0];
    const fakeFile = bucket.file(fileArg);
    expect(fakeFile.save).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ public: true, metadata: { contentType: 'image/jpeg' } })
    );
  });
});

describe('listImages', () => {
  it('maps and sorts files by most recent first', async () => {
    const { bucket } = buildFakeBucket({
      files: [
        { name: 'uploads/old.png', metadata: { size: '10', contentType: 'image/png', timeCreated: '2026-01-01T00:00:00.000Z' } },
        { name: 'uploads/new.png', metadata: { size: '20', contentType: 'image/png', timeCreated: '2026-06-01T00:00:00.000Z' } },
      ],
    });
    mockGetBucket.mockReturnValue(bucket);

    const images = await listImages();

    expect(images.map((i) => i.name)).toEqual(['new.png', 'old.png']);
    expect(images[0]).toEqual({
      name: 'new.png',
      url: 'https://storage.googleapis.com/test-bucket.firebasestorage.app/uploads/new.png',
      size: 20,
      contentType: 'image/png',
      createdAt: '2026-06-01T00:00:00.000Z',
    });
  });
});

describe('deleteImage', () => {
  it('rejects names containing a slash without touching the bucket', async () => {
    const { bucket } = buildFakeBucket();
    mockGetBucket.mockReturnValue(bucket);

    const result = await deleteImage('../secrets/config.json');

    expect(result).toBe(false);
    expect(bucket.file).not.toHaveBeenCalled();
  });

  it('returns false when the image does not exist', async () => {
    const { bucket } = buildFakeBucket({ files: [] });
    mockGetBucket.mockReturnValue(bucket);

    const result = await deleteImage('missing.png');

    expect(result).toBe(false);
  });

  it('deletes the file and returns true when it exists', async () => {
    const { bucket } = buildFakeBucket({ files: [{ name: 'uploads/a.png' }] });
    mockGetBucket.mockReturnValue(bucket);

    const result = await deleteImage('a.png');

    expect(result).toBe(true);
    expect(bucket.file('uploads/a.png').delete).toHaveBeenCalled();
  });
});

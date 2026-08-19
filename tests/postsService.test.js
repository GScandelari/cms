const mockGetDb = jest.fn();
jest.mock('../src/firebase', () => ({ getDb: mockGetDb }));

const { publishDuePosts } = require('../src/services/postsService');

function buildFakeDb({ docs = [] } = {}) {
  const updateCalls = [];
  const batch = {
    update: jest.fn((ref, data) => updateCalls.push({ ref, data })),
    commit: jest.fn().mockResolvedValue(undefined),
  };

  const query = {
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      empty: docs.length === 0,
      docs: docs.map((d) => ({
        id: d.id,
        ref: { id: d.id },
        data: () => d.data,
      })),
    }),
  };

  const db = {
    collection: jest.fn().mockReturnValue(query),
    batch: jest.fn().mockReturnValue(batch),
  };

  return { db, batch, query };
}

afterEach(() => jest.clearAllMocks());

describe('publishDuePosts', () => {
  it('returns an empty array and does not write when nothing is due', async () => {
    const { db, batch } = buildFakeDb({ docs: [] });
    mockGetDb.mockReturnValue(db);

    const result = await publishDuePosts(new Date('2026-01-01T00:00:00.000Z'));

    expect(result).toEqual([]);
    expect(batch.commit).not.toHaveBeenCalled();
  });

  it('publishes every due post and commits a single batch', async () => {
    const docs = [
      { id: 'a', data: { title: 'A', slug: 'a', published: false, publishAt: '2025-12-31T00:00:00.000Z' } },
      { id: 'b', data: { title: 'B', slug: 'b', published: false, publishAt: '2025-12-30T00:00:00.000Z' } },
    ];
    const { db, batch, query } = buildFakeDb({ docs });
    mockGetDb.mockReturnValue(db);

    const result = await publishDuePosts(new Date('2026-01-01T00:00:00.000Z'));

    expect(query.where).toHaveBeenCalledWith('published', '==', false);
    expect(query.where).toHaveBeenCalledWith('publishAt', '<=', '2026-01-01T00:00:00.000Z');
    expect(batch.update).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.published === true)).toBe(true);
  });
});

const { triggerSiteRebuild } = require('../src/services/githubDispatch');

const ORIGINAL_TOKEN = process.env.GITHUB_DISPATCH_TOKEN;
const ORIGINAL_REPO = process.env.GITHUB_DISPATCH_REPO;

afterEach(() => {
  jest.restoreAllMocks();
  process.env.GITHUB_DISPATCH_TOKEN = ORIGINAL_TOKEN;
  process.env.GITHUB_DISPATCH_REPO = ORIGINAL_REPO;
});

describe('triggerSiteRebuild', () => {
  it('returns false and does not call fetch when GITHUB_DISPATCH_TOKEN is not set', async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await triggerSiteRebuild();
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts a repository_dispatch event to the default repo when GITHUB_DISPATCH_REPO is not set', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'test-token';
    delete process.env.GITHUB_DISPATCH_REPO;
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 204 });

    const result = await triggerSiteRebuild();

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/GScandelari/website-gscandelari/dispatches',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({ event_type: 'cms-post-published' }),
      })
    );
  });

  it('posts to the repo from GITHUB_DISPATCH_REPO when it is set', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'test-token';
    process.env.GITHUB_DISPATCH_REPO = 'AmandaGiraldi/amandagiraldi-site';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 204 });

    const result = await triggerSiteRebuild();

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/AmandaGiraldi/amandagiraldi-site/dispatches',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns false when GitHub responds with a non-2xx status', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'test-token';
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401 });
    const result = await triggerSiteRebuild();
    expect(result).toBe(false);
  });

  it('returns false and does not throw when fetch rejects', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'test-token';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    const result = await triggerSiteRebuild();
    expect(result).toBe(false);
  });
});

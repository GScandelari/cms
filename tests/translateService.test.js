const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const { translatePost } = require('../src/services/translateService');

afterEach(() => jest.clearAllMocks());

function textResponse(text) {
  return { content: [{ type: 'text', text }] };
}

describe('translatePost', () => {
  it('returns the parsed translation on a clean JSON response', async () => {
    mockCreate.mockResolvedValue(
      textResponse(JSON.stringify({ title: 'Why I started this blog', description: 'A short intro.', content: 'Hello **world**.' }))
    );

    const result = await translatePost({ title: 'Por que criei este blog', description: 'Uma breve intro.', content: 'Olá **mundo**.' });

    expect(result).toEqual({
      title: 'Why I started this blog',
      description: 'A short intro.',
      content: 'Hello **world**.',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-5',
        messages: [
          expect.objectContaining({
            role: 'user',
            content: JSON.stringify({ title: 'Por que criei este blog', description: 'Uma breve intro.', content: 'Olá **mundo**.' }),
          }),
        ],
      })
    );
  });

  it('strips a markdown code fence around the JSON if present', async () => {
    mockCreate.mockResolvedValue(textResponse('```json\n' + JSON.stringify({ title: 'T', content: 'C' }) + '\n```'));

    const result = await translatePost({ title: 'T', description: '', content: 'C' });

    expect(result).toEqual({ title: 'T', description: '', content: 'C' });
  });

  it('defaults description to an empty string when the model omits it', async () => {
    mockCreate.mockResolvedValue(textResponse(JSON.stringify({ title: 'T', content: 'C' })));

    const result = await translatePost({ title: 'T', description: '', content: 'C' });

    expect(result.description).toBe('');
  });

  it('throws when the response has no text block', async () => {
    mockCreate.mockResolvedValue({ content: [] });
    await expect(translatePost({ title: 'T', description: '', content: 'C' })).rejects.toThrow(/nenhum texto/);
  });

  it('throws when the response is not valid JSON', async () => {
    mockCreate.mockResolvedValue(textResponse('not json at all'));
    await expect(translatePost({ title: 'T', description: '', content: 'C' })).rejects.toThrow(/JSON válido/);
  });

  it('throws when the parsed JSON is missing required fields', async () => {
    mockCreate.mockResolvedValue(textResponse(JSON.stringify({ description: 'only this' })));
    await expect(translatePost({ title: 'T', description: '', content: 'C' })).rejects.toThrow(/campos esperados/);
  });
});

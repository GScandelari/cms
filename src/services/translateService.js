const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';

const SYSTEM_PROMPT = `You are translating a Brazilian Portuguese blog post into natural, professional English for a software developer's personal blog.

Rules:
- Preserve Markdown formatting exactly: headings, lists, bold/italic, links, images.
- Never translate URLs, image paths, code inside fenced code blocks, inline code, or HTML tags.
- Keep the same paragraph and heading structure as the original.
- Write in a natural, first-person voice, as if the author wrote it in English themselves — not a literal word-for-word translation.
- Return ONLY a JSON object with this exact shape, no other text before or after it: {"title": "...", "description": "...", "content": "..."}`;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Claude sometimes wraps JSON output in a markdown code fence despite being
// told not to — strip that before parsing instead of failing on it.
function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

async function translatePost({ title, description, content }) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({ title, description: description || '', content }),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('A tradução não retornou nenhum texto.');

  let parsed;
  try {
    parsed = JSON.parse(extractJson(textBlock.text));
  } catch (err) {
    throw new Error('A resposta da tradução não veio em um JSON válido.');
  }

  if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') {
    throw new Error('A resposta da tradução não trouxe os campos esperados.');
  }

  return {
    title: parsed.title,
    description: typeof parsed.description === 'string' ? parsed.description : '',
    content: parsed.content,
  };
}

module.exports = { translatePost };

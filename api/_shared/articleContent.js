import { safeFetch, UnsafeUrlError } from './safeFetch.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CONTENT_CHARS = 5000;
// Upstream pages are untrusted and can be arbitrarily large; never buffer more than this.
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Read a response body as text, stopping after `maxBytes`. Extra data is
 * discarded (we only keep the first few thousand characters anyway), so a huge
 * or endless upstream body cannot exhaust function memory.
 */
export const readTextCapped = async (response, maxBytes = MAX_BODY_BYTES) => {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = received + value.byteLength > maxBytes ? value.subarray(0, maxBytes - received) : value;
      received += chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return text + decoder.decode();
};

/** Strip markup from fetched HTML and cap the length. */
export const extractText = (html) => {
  let content = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (content.length > MAX_CONTENT_CHARS) content = content.substring(0, MAX_CONTENT_CHARS) + '...';
  return content;
};

/**
 * GET /api/article/content?url=... shared by the Vercel function and the dev
 * server. The URL is user-supplied, so every fetch goes through safeFetch.
 */
export const handleArticleContentRequest = async (req, res, fetchOptions) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await safeFetch(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
      fetchOptions
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = extractText(await readTextCapped(response));
    return res.status(200).json({ content, length: content.length, url });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return res.status(400).json({ error: 'URL is not allowed' });
    }
    // Upstream/network error text is logged, not returned to the client.
    console.error('[article:content] fetch failed:', error);
    return res.status(500).json({ error: 'Failed to fetch article content' });
  }
};

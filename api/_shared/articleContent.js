import { safeFetch, UnsafeUrlError } from './safeFetch.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CONTENT_CHARS = 5000;

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

    const content = extractText(await response.text());
    return res.status(200).json({ content, length: content.length, url });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return res.status(400).json({ error: 'URL is not allowed', details: error.message });
    }
    return res.status(500).json({
      error: 'Failed to fetch article content',
      details: error.message,
    });
  }
};

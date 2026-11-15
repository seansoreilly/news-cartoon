import { applyCors, createRateLimiter, rejectIfLimited } from '../_shared/requestGuards.js';
import { parseGoogleNewsRSS } from '../_shared/rssParser.js';

// Best effort (per warm instance); the Vercel WAF rule is the durable control.
const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

export default async function handler(req, res) {
  applyCors(req, res, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (rejectIfLimited(limiter, req, res)) return;

  const { location, max = process.env.VITE_DEFAULT_NEWS_LIMIT || '10' } = req.query;

  if (!location) {
    return res.status(400).json({ error: 'Location parameter is required' });
  }

  try {
    // Use location as query for Google News RSS
    const encodedLocation = encodeURIComponent(location);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedLocation}&hl=en-US&gl=US&ceid=US:en`;

    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();
    const limit = parseInt(max, 10);
    const articles = await parseGoogleNewsRSS(xmlText, { limit });

    return res.status(200).json({
      articles,
      totalArticles: articles.length,
      location,
      topic: `Local News - ${location}`,
    });
  } catch (error) {
    console.error('[news:location] fetch failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch news',
    });
  }
}
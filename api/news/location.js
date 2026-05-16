import { parseGoogleNewsRSS } from '../_shared/rssParser.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    return res.status(500).json({
      error: 'Failed to fetch news',
      details: error.message,
    });
  }
}
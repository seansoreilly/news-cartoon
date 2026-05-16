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

  const { q, max = process.env.VITE_DEFAULT_NEWS_LIMIT || '10', sortby = 'publishedAt' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Encode query for Google News RSS
    const encodedQuery = encodeURIComponent(q);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    console.log(`📡 Fetching from Google News RSS: ${rssUrl}`);

    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();
    const limit = parseInt(max, 10);
    const articles = await parseGoogleNewsRSS(xmlText, { limit });

    console.log(`✅ Returning ${articles.length} articles for query: ${q}`);

    return res.status(200).json({
      articles,
      totalArticles: articles.length,
    });
  } catch (error) {
    console.error('❌ Error fetching news:', error);
    return res.status(500).json({
      error: 'Failed to fetch news',
      details: error.message,
    });
  }
}
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.development') });

const app = express();
const PORT = process.env.PORT || 3001;

// Weather-related sources to filter out (Subtask 1.1)
const DEFAULT_WEATHER_SOURCES = [
  'weather.com',
  'the weather channel',
  'accuweather',
  'weather underground',
  'wunderground',
  'national weather service',
  'weatherbug',
  'weather network',
  'weather.gov',
  'weathernation',
  'weather central'
];

// Task 3: Allow extending blocklist via environment variable
const extraSources = process.env.WEATHER_BLOCKLIST_EXTRA
  ? process.env.WEATHER_BLOCKLIST_EXTRA.split(',').map(s => s.trim().toLowerCase())
  : [];
const WEATHER_SOURCES = [...DEFAULT_WEATHER_SOURCES, ...extraSources];

// Weather keywords to filter from titles (Task 2 prep)
const WEATHER_KEYWORDS = [
  'weather forecast',
  'temperature alert',
  'weather warning',
  'weather advisory',
  'weather update'
];

/**
 * Filter out weather-related sources from articles (Subtask 1.2)
 * @param {Array} articles - Array of news articles
 * @returns {Array} - Filtered articles without weather sources
 */
const filterWeatherSources = (articles) => {
  const debugMode = process.env.DEBUG === 'true';

  return articles.filter((article) => {
    const sourceName = (article.source?.name || '').toLowerCase();
    const titleLower = (article.title || '').toLowerCase();

    // Check if source is in blocklist
    const isBlockedSource = WEATHER_SOURCES.some(blocked =>
      sourceName.includes(blocked.toLowerCase())
    );

    // Check if title contains weather keywords
    const hasWeatherKeywords = WEATHER_KEYWORDS.some(keyword =>
      titleLower.includes(keyword.toLowerCase())
    );

    const shouldFilter = isBlockedSource || hasWeatherKeywords;

    // Debug logging (Subtask 1.4)
    if (debugMode && shouldFilter) {
      console.log(`[WeatherFilter] Filtered: "${article.title}" (source: ${sourceName})`);
    }

    return !shouldFilter;
  });
};

// Enable CORS for requests from the frontend
app.use(cors());
app.use(express.json());

/**
 * Parse Google News RSS feed and filter articles from the last 3 days
 */
const parseGoogleNewsRss = (rssData, limit) => {
  try {
    const rssRoot = rssData.RSS || rssData.rss;
    if (!rssRoot) {
      return [];
    }

    const channel = rssRoot.CHANNEL?.[0] || rssRoot.channel?.[0];
    if (!channel) {
      return [];
    }

    const items = channel.ITEM || channel.item || [];
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return items
      .map((item) => {
        const title = item.TITLE?.[0] || item.title?.[0] || '';
        const description = item.DESCRIPTION?.[0] || item.description?.[0] || '';
        const link = item.LINK?.[0] || item.link?.[0] || '';
        const pubDate = item.PUBDATE?.[0] || item.pubDate?.[0] || new Date().toISOString();

        // Extract source from title (Google News format: "Title - Source")
        const titleParts = title.split(' - ');
        const cleanTitle = titleParts.slice(0, -1).join(' - ') || title;
        const source = titleParts[titleParts.length - 1] || 'Unknown';

        // Clean HTML from description
        const cleanDescription = description
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();

        const publishedAtISO = new Date(pubDate).toISOString();

        return {
          title: cleanTitle,
          description: cleanDescription,
          content: cleanDescription,
          url: link,
          image: null,
          publishedAt: publishedAtISO,
          source: {
            name: source,
            url: null,
          },
          publishedDate: new Date(pubDate),
        };
      })
      .filter((article) => article.publishedDate >= threeDaysAgo)
      .slice(0, limit)
      .map(({ publishedDate, ...article }) => article);
  } catch (error) {
    return [];
  }
};

// News search endpoint (location or keyword)
app.get('/api/news/search', async (req, res) => {
  const {
    q,
    max = process.env.VITE_DEFAULT_NEWS_LIMIT || '10',
    scoring = 'r' // default to relevance/authority ranking
  } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Encode query for Google News RSS
    const encodedQuery = encodeURIComponent(q);
    // Use scoring=r for relevance/authority ranking (Google's default)
    // This ensures the most authoritative sources appear first
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en&scoring=${scoring}`;

    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse RSS XML
    const rssData = await parseStringPromise(xmlText);
    const parsedArticles = parseGoogleNewsRss(rssData, parseInt(max, 10) * 2); // Fetch extra to account for filtering

    // Apply weather source filter (Subtask 1.3)
    const articles = filterWeatherSources(parsedArticles).slice(0, parseInt(max, 10));

    return res.json({
      articles,
      totalArticles: articles.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch news',
      details: error.message,
    });
  }
});

// Fetch article content endpoint
app.get('/api/article/content', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log(`[article/content] Fetching: ${url}`);

    // Fetch the article page
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Simple content extraction - remove scripts, styles, and extract text from article/main/body
    let content = html
      // Remove script tags and their contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove style tags and their contents
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Limit content length
    const maxLength = 5000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    console.log(`[article/content] ✅ Extracted ${content.length} chars`);

    res.json({
      content,
      length: content.length,
      url,
    });
  } catch (error) {
    console.error(`[article/content] Error:`, error.message);
    res.status(500).json({
      error: 'Failed to fetch article content',
      details: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`News API server running on http://localhost:${PORT}`);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Prevent the process from exiting immediately
process.stdin.resume();
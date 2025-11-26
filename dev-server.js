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

// Location-to-country/language mapping for Google News (Task 3)
const LOCATION_CONFIG = {
  // Australia
  Melbourne: { countryCode: 'AU', languageCode: 'en-AU' },
  Sydney: { countryCode: 'AU', languageCode: 'en-AU' },
  Brisbane: { countryCode: 'AU', languageCode: 'en-AU' },
  Perth: { countryCode: 'AU', languageCode: 'en-AU' },
  Adelaide: { countryCode: 'AU', languageCode: 'en-AU' },
  Canberra: { countryCode: 'AU', languageCode: 'en-AU' },

  // United States
  'New York': { countryCode: 'US', languageCode: 'en-US' },
  'Los Angeles': { countryCode: 'US', languageCode: 'en-US' },
  Chicago: { countryCode: 'US', languageCode: 'en-US' },
  'San Francisco': { countryCode: 'US', languageCode: 'en-US' },

  // United Kingdom
  London: { countryCode: 'GB', languageCode: 'en-GB' },
  Manchester: { countryCode: 'GB', languageCode: 'en-GB' },

  // Canada
  Toronto: { countryCode: 'CA', languageCode: 'en-CA' },
  Vancouver: { countryCode: 'CA', languageCode: 'en-CA' },

  // New Zealand
  Auckland: { countryCode: 'NZ', languageCode: 'en-NZ' },
  Wellington: { countryCode: 'NZ', languageCode: 'en-NZ' },
};

// Default location config for unknown cities
const DEFAULT_LOCATION_CONFIG = {
  countryCode: 'US',
  languageCode: 'en-US',
};

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
 * Normalize city name for lookup (title case).
 * @param {string} cityName - Raw city name input
 * @returns {string} - Normalized city name
 */
const normalizeCity = (cityName) => {
  if (!cityName || typeof cityName !== 'string') {
    return '';
  }

  return cityName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Resolve location to country and language codes for Google News.
 * @param {string} location - City name or location string
 * @returns {object} - Object with countryCode and languageCode
 */
const resolveLocationConfig = (location) => {
  if (!location || typeof location !== 'string') {
    console.log('[LocationResolver] No location provided, using default (US/en-US)');
    return DEFAULT_LOCATION_CONFIG;
  }

  const normalizedLocation = normalizeCity(location);
  const config = LOCATION_CONFIG[normalizedLocation];

  if (config) {
    console.log(`[LocationResolver] Resolved "${location}" → ${config.countryCode}/${config.languageCode}`);
    return config;
  }

  console.log(`[LocationResolver] Unknown location "${location}", using default (US/en-US)`);
  return DEFAULT_LOCATION_CONFIG;
};

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

/**
 * News search endpoint (location or keyword)
 *
 * Query parameters:
 * - q: Search query (required)
 * - location: City name for location-aware results (optional, e.g., "Melbourne", "New York")
 * - gl: Country code override (optional, e.g., "AU", "US", "GB")
 * - hl: Language code override (optional, e.g., "en-AU", "en-US", "en-GB")
 * - max: Maximum number of articles to return (default: 10)
 * - scoring: Ranking algorithm - 'r' for relevance (default), 'd' for date
 */
app.get('/api/news/search', async (req, res) => {
  const {
    q,
    location,
    gl: glOverride,
    hl: hlOverride,
    max = process.env.VITE_DEFAULT_NEWS_LIMIT || '10',
    scoring = 'r' // default to relevance/authority ranking
  } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Resolve location to country/language codes
    let countryCode, languageCode;

    if (glOverride || hlOverride) {
      // Use explicit overrides if provided
      countryCode = glOverride || 'US';
      languageCode = hlOverride || 'en-US';
      console.log(`[NewsSearch] Using explicit overrides: gl=${countryCode}, hl=${languageCode}`);
    } else if (location) {
      // Resolve location to config
      const locationConfig = resolveLocationConfig(location);
      countryCode = locationConfig.countryCode;
      languageCode = locationConfig.languageCode;
    } else {
      // Use defaults
      countryCode = 'US';
      languageCode = 'en-US';
      console.log('[NewsSearch] No location specified, using default (US/en-US)');
    }

    // Construct Google News RSS URL with location parameters
    const encodedQuery = encodeURIComponent(q);
    const ceid = `${countryCode}:${languageCode.split('-')[0]}`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${languageCode}&gl=${countryCode}&ceid=${ceid}&scoring=${scoring}`;

    console.log(`[NewsSearch] Fetching: ${rssUrl}`);

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

    console.log(`[NewsSearch] Returning ${articles.length} articles for query="${q}", location="${location || 'default'}"`);

    return res.json({
      articles,
      totalArticles: articles.length,
      location: location || null,
      countryCode,
      languageCode,
    });
  } catch (error) {
    console.error(`[NewsSearch] Error:`, error.message);
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
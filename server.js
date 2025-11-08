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
const PORT = process.env.PORT || 3000;

// Enable CORS for requests from the frontend
app.use(cors());
app.use(express.json());

// Debug: Log configuration
console.log('🔍 Server Configuration:');
console.log(`   News Source: Google News RSS (no API key required)`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

/**
 * Parse Google News RSS feed and convert to GNews-compatible format
 */
const parseGoogleNewsRss = (rssData, limit) => {
  try {
    // xml2js parses root and attributes as uppercase
    const rssRoot = rssData.RSS || rssData.rss;
    if (!rssRoot) {
      console.error('❌ No RSS root element found in parsed data');
      return [];
    }

    // Get channel - xml2js may use uppercase CHANNEL or lowercase channel
    const channel = rssRoot.CHANNEL?.[0] || rssRoot.channel?.[0];
    if (!channel) {
      console.error('❌ No channel found in RSS');
      return [];
    }

    const items = channel.ITEM || channel.item || [];
    const articles = items.slice(0, limit).map((item) => {
      const title = item.TITLE?.[0] || item.title?.[0] || '';
      const description = item.DESCRIPTION?.[0] || item.description?.[0] || '';
      const link = item.LINK?.[0] || item.link?.[0] || '';
      const pubDate = item.PUBDATE?.[0] || item.pubDate?.[0] || new Date().toISOString();
      const source = item.SOURCE?.[0] || item.source?.[0] || 'Google News';
      const image = item['MEDIA:CONTENT']?.[0]?.$ || item['media:content']?.[0]?.$ || {};

      return {
        title,
        description,
        content: description,
        url: link,
        image: image.url || null,
        source: {
          name: source,
          url: 'https://news.google.com',
        },
        publishedAt: new Date(pubDate).toISOString(),
      };
    });

    return articles;
  } catch (error) {
    console.error('❌ Error parsing RSS:', error.message);
    return [];
  }
};

/**
 * Proxy endpoint for Google News RSS
 * Fetches news from Google News RSS feed
 */
app.get('/api/news/search', async (req, res) => {
  try {
    const { q, max = 10 } = req.query;

    // Validate required parameters
    if (!q) {
      console.warn('⚠️  Missing query parameter "q"');
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Build the Google News RSS URL
    const googleNewsUrl = new URL('https://news.google.com/rss/search');
    googleNewsUrl.searchParams.set('q', q);
    googleNewsUrl.searchParams.set('hl', 'en-US');
    googleNewsUrl.searchParams.set('gl', 'US');

    // Fetch from Google News RSS
    console.log(`📡 Fetching from Google News: ${googleNewsUrl.toString()}`);
    const response = await fetch(googleNewsUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`❌ Google News responded with status: ${response.status}`);
      return res
        .status(response.status)
        .json({ error: 'Failed to fetch from Google News' });
    }

    const rssText = await response.text();
    console.log(`📨 Received RSS feed (${rssText.length} bytes)`);

    // Debug: Log first 500 chars of response
    if (rssText.length > 0) {
      console.log(`📄 RSS Preview: ${rssText.substring(0, 500)}...`);
    } else {
      console.error('❌ Empty RSS response from Google News');
    }

    // Parse RSS XML
    const parsedRss = await parseStringPromise(rssText, {
      strict: false,
      mergeAttrs: true,
    });

    // Debug: Log parsed structure
    console.log(`🔍 Parsed RSS structure keys:`, Object.keys(parsedRss));
    const rssRoot = parsedRss.RSS || parsedRss.rss;
    if (rssRoot) {
      console.log(`🔍 RSS root has keys:`, Object.keys(rssRoot));
      if (rssRoot.channel) {
        console.log(`✓ Channel found, length: ${rssRoot.channel.length}`);
        if (rssRoot.channel[0]) {
          console.log(`  Channel[0] keys:`, Object.keys(rssRoot.channel[0]));
          if (rssRoot.channel[0].item) {
            console.log(`  Items found: ${rssRoot.channel[0].item.length}`);
          } else {
            console.log(`  ❌ No items in channel[0]`);
          }
        }
      } else {
        console.log(`❌ No channel in RSS root`);
      }
    }

    // Convert to GNews-compatible format
    const articles = parseGoogleNewsRss(parsedRss, parseInt(max));

    console.log(`✅ Successfully parsed ${articles.length} articles`);

    // Return in GNews-compatible format
    res.json({
      articles,
      totalArticles: articles.length,
      topic: q,
    });
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch news',
      details: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 News Cartoon API Proxy running on http://localhost:${PORT}`);
  console.log(`📰 News endpoint: http://localhost:${PORT}/api/news/search?q=your_query`);
});

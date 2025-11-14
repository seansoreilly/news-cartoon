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
  const { q, max = process.env.VITE_DEFAULT_NEWS_LIMIT || '10' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Encode query for Google News RSS
    const encodedQuery = encodeURIComponent(q);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse RSS XML
    const rssData = await parseStringPromise(xmlText);
    const articles = parseGoogleNewsRss(rssData, parseInt(max, 10));

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
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

  const { q, max = '10', sortby = 'publishedAt' } = req.query;

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

    // Parse RSS XML
    const { parseStringPromise } = await import('xml2js');
    const rssData = await parseStringPromise(xmlText);

    // Parse Google News RSS feed
    const rssRoot = rssData.RSS || rssData.rss;
    if (!rssRoot) {
      console.error('No RSS root element found');
      return res.status(200).json({ articles: [] });
    }

    const channel = rssRoot.CHANNEL?.[0] || rssRoot.channel?.[0];
    if (!channel) {
      console.error('No channel found in RSS');
      return res.status(200).json({ articles: [] });
    }

    const items = channel.ITEM || channel.item || [];
    const limit = parseInt(max, 10);

    const articles = items.slice(0, limit).map((item) => {
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

      return {
        title: cleanTitle,
        description: cleanDescription,
        content: cleanDescription,
        url: link,
        image: null,
        publishedAt: new Date(pubDate).toISOString(),
        source: {
          name: source,
          url: null,
        },
      };
    });

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
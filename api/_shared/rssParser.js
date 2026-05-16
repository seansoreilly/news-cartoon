import { parseStringPromise } from 'xml2js';

/**
 * Normalize a single raw RSS item into a consistent article shape.
 * @param {object} item - Raw xml2js-parsed RSS item
 * @returns {object} Normalized article object
 */
export function normalizeArticle(item) {
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
}

/**
 * Parse a Google News RSS XML string into a normalized articles array.
 *
 * @param {string} xmlText - Raw RSS XML string
 * @param {object} [options]
 * @param {number} [options.limit] - Max articles to return (default: no limit)
 * @param {Date} [options.since] - Exclude articles older than this date (default: no filter)
 * @returns {Promise<Array>} Normalized articles
 */
export async function parseGoogleNewsRSS(xmlText, { limit, since } = {}) {
  try {
    const rssData = await parseStringPromise(xmlText);
    const rssRoot = rssData.RSS || rssData.rss;
    if (!rssRoot) return [];

    const channel = rssRoot.CHANNEL?.[0] || rssRoot.channel?.[0];
    if (!channel) return [];

    const items = channel.ITEM || channel.item || [];

    let articles = items.map(normalizeArticle);

    if (since instanceof Date) {
      articles = articles.filter(
        (a) => new Date(a.publishedAt) >= since
      );
    }

    if (limit != null) {
      articles = articles.slice(0, limit);
    }

    return articles;
  } catch {
    return [];
  }
}

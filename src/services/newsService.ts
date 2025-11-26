import type { NewsArticle, NewsResponse } from '../types/news';
import { createNewsError } from '../types/error';
import { parse as parseDomain } from 'tldts';
import {
  isMainstreamSource,
  getAuthorityRank,
} from '../data/mainstreamSources';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

type CacheStore = Record<string, CacheEntry<NewsArticle[]>>;

const CACHE_DURATION_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Number of top results to consider as "authoritative"
// Google News ranks by authority/relevance, so first results are most trustworthy
const AUTHORITATIVE_RESULTS_LIMIT = 5;

// Filtering mode configuration from environment (reserved for future use)
// const FILTERING_MODE = import.meta.env.VITE_NEWS_FILTERING_MODE || 'soft'; // 'strict' or 'soft'

class NewsService {
  private cache: CacheStore = {};
  private baseUrl = import.meta.env.PROD ? '/api/news' : 'http://localhost:3001/api/news';

  constructor() {
    // API key is now handled server-side via backend proxy
  }

  /**
   * Extract canonical domain from article URL using tldts library.
   * Handles edge cases: subdomains, www prefix, tracking parameters.
   *
   * @param url - Article URL to extract domain from
   * @returns Canonical domain (e.g., "nytimes.com") or null if invalid
   *
   * @example
   * extractCanonicalDomain("https://www.nytimes.com/article?track=123") // "nytimes.com"
   * extractCanonicalDomain("https://news.bbc.co.uk/article") // "bbc.co.uk"
   */
  private extractCanonicalDomain(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const parsed = parseDomain(url);

      // tldts returns domain (SLD + TLD) which is what we need
      // e.g., "nytimes.com" from "www.nytimes.com" or "news.nytimes.com"
      if (parsed.domain) {
        return parsed.domain.toLowerCase();
      }

      return null;
    } catch (error) {
      console.warn(`[NewsService.extractCanonicalDomain] Failed to parse URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Check if an article's domain matches a whitelisted mainstream source for the given city.
   * Uses case-insensitive and normalized matching via the mainstream sources data structure.
   *
   * @param articleUrl - Article URL to check
   * @param cityName - City name to check mainstream sources against
   * @returns True if the article is from a mainstream source for that city
   *
   * @example
   * isArticleFromMainstreamSource("https://www.nytimes.com/article", "New York") // true
   * isArticleFromMainstreamSource("https://random-blog.com/article", "New York") // false
   */
  private isArticleFromMainstreamSource(articleUrl: string, cityName: string): boolean {
    const domain = this.extractCanonicalDomain(articleUrl);

    if (!domain) {
      return false;
    }

    return isMainstreamSource(domain, cityName);
  }

  /**
   * Get the mainstream authority rank for an article based on the city's whitelist.
   *
   * @param articleUrl - Article URL to check
   * @param cityName - City name to check mainstream sources against
   * @returns Authority rank (1 = highest) or null if not a mainstream source
   *
   * @example
   * getMainstreamAuthorityRank("https://www.nytimes.com/article", "New York") // 1
   * getMainstreamAuthorityRank("https://random-blog.com/article", "New York") // null
   */
  private getMainstreamAuthorityRank(articleUrl: string, cityName: string): number | null {
    const domain = this.extractCanonicalDomain(articleUrl);

    if (!domain) {
      return null;
    }

    return getAuthorityRank(domain, cityName);
  }

  async fetchNewsByLocation(
    location: string,
    limit = parseInt(import.meta.env.VITE_DEFAULT_NEWS_LIMIT || '10'),
    onlyAuthoritative = true
  ): Promise<NewsResponse> {
    if (!location || location.trim() === '') {
      throw createNewsError('Location cannot be empty');
    }

    try {
      // Fetch more results to ensure we get enough authoritative sources
      const fetchLimit = onlyAuthoritative ? Math.max(limit * 2, 20) : limit;

      const articles = await this.fetchWithCache(
        `location-${location}-limit-${limit}-auth-${onlyAuthoritative}`,
        async () => {
          const params = new URLSearchParams({
            q: location,
            max: fetchLimit.toString(),
            scoring: 'r', // Use relevance/authority ranking
          });

          const queryString = params.toString();
          const results = await this.fetchWithRetry(
            `${this.baseUrl}/search?${queryString}`
          );

          // Add authority ranking based on position
          return this.addAuthorityRanking(results, limit, onlyAuthoritative);
        }
      );

      return {
        articles,
        totalArticles: articles.length,
        topic: location,
        location,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw createNewsError(
        `Failed to fetch news for location: ${location}`,
        { originalError: String(error) }
      );
    }
  }

  async fetchNewsByKeyword(
    keyword: string,
    limit = parseInt(import.meta.env.VITE_DEFAULT_NEWS_LIMIT || '10'),
    onlyAuthoritative = true
  ): Promise<NewsResponse> {
    if (!keyword || keyword.trim() === '') {
      throw createNewsError('Keyword cannot be empty');
    }

    try {
      // Fetch more results to ensure we get enough authoritative sources
      const fetchLimit = onlyAuthoritative ? Math.max(limit * 2, 20) : limit;

      const articles = await this.fetchWithCache(
        `keyword-${keyword}-limit-${limit}-auth-${onlyAuthoritative}`,
        async () => {
          const params = new URLSearchParams({
            q: keyword,
            max: fetchLimit.toString(),
            scoring: 'r', // Use relevance/authority ranking
          });

          const queryString = params.toString();
          const results = await this.fetchWithRetry(
            `${this.baseUrl}/search?${queryString}`
          );

          // Add authority ranking based on position
          return this.addAuthorityRanking(results, limit, onlyAuthoritative);
        }
      );

      return {
        articles,
        totalArticles: articles.length,
        topic: keyword,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw createNewsError(
        `Failed to fetch news for keyword: ${keyword}`,
        { originalError: String(error) }
      );
    }
  }

  private async fetchWithRetry(
    url: string,
    retryCount = 0
  ): Promise<NewsArticle[]> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
          return this.fetchWithRetry(url, retryCount + 1);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseNewsResponse(data as Record<string, unknown>);
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await this.sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
        return this.fetchWithRetry(url, retryCount + 1);
      }

      throw error;
    }
  }

  private async fetchWithCache(
    cacheKey: string,
    fetchFn: () => Promise<NewsArticle[]>
  ): Promise<NewsArticle[]> {
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await fetchFn();
    this.setCache(cacheKey, data);
    return data;
  }

  private getFromCache(key: string): NewsArticle[] | null {
    const entry = this.cache[key];
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS;
    if (isExpired) {
      delete this.cache[key];
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: NewsArticle[]): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };
  }

  clearCache(): void {
    this.cache = {};
  }

  private parseNewsResponse(data: Record<string, unknown>): NewsArticle[] {
    if (!Array.isArray(data.articles)) {
      return [];
    }

    return (data.articles as Array<Record<string, unknown>>).map((article) => {
      const source = article.source as Record<string, unknown> | undefined;

      // Handle nested source.name structure from XML parsing
      let sourceName = 'Unknown';
      if (source?.name) {
        // Check if source.name is an object with _ property (from XML parsing)
        if (typeof source.name === 'object' && source.name !== null) {
          const nameObj = source.name as Record<string, unknown>;
          sourceName = String(nameObj._ || nameObj.name || 'Unknown');
        } else {
          sourceName = String(source.name);
        }
      }

      return {
        title: String(article.title || ''),
        description: article.description ? String(article.description) : undefined,
        url: String(article.url || ''),
        source: {
          name: sourceName,
          url: source?.url ? String(source.url) : undefined,
        },
        publishedAt: String(article.publishedAt || new Date().toISOString()),
        content: article.content ? String(article.content) : undefined,
        image: article.image ? String(article.image) : undefined,
        author: article.author ? String(article.author) : undefined,
      };
    });
  }

  async fetchArticleContent(articleUrl: string): Promise<string> {
    if (!articleUrl || articleUrl.trim() === '') {
      throw createNewsError('Article URL cannot be empty');
    }

    try {
      const params = new URLSearchParams({ url: articleUrl });
      const response = await fetch(`${this.baseUrl.replace('/news', '')}/article/content?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { content: string; length: number; url: string };
      return data.content || '';
    } catch (error) {
      throw createNewsError(
        `Failed to fetch article content from: ${articleUrl}`,
        { originalError: String(error) }
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add authority ranking to articles based on their position in Google News results.
   * Google News orders results by relevance/authority, so position indicates trustworthiness.
   */
  private addAuthorityRanking(
    articles: NewsArticle[],
    limit: number,
    onlyAuthoritative: boolean
  ): NewsArticle[] {
    // Add authority score based on position (1st = highest authority)
    const rankedArticles = articles.map((article, index) => ({
      ...article,
      authorityScore: this.calculateAuthorityScore(index + 1),
      isAuthoritative: index < AUTHORITATIVE_RESULTS_LIMIT,
      rankPosition: index + 1,
    }));

    if (onlyAuthoritative) {
      // Return only the top authoritative sources, respecting user's limit
      return rankedArticles
        .filter(article => article.isAuthoritative || rankedArticles.indexOf(article) < limit)
        .slice(0, limit);
    }

    // Return all articles up to limit, but with authority indicators
    return rankedArticles.slice(0, limit);
  }

  /**
   * Calculate authority score based on position in results.
   * Higher position = higher score (exponential decay).
   */
  private calculateAuthorityScore(position: number): number {
    // Score from 100 (first result) to 0 (last result) with exponential decay
    const maxScore = 100;
    const decayFactor = 0.8; // How quickly authority drops off

    if (position === 1) return maxScore;

    // Exponential decay based on position
    const score = maxScore * Math.pow(decayFactor, position - 1);

    // Ensure score doesn't go below 10 for any result in the feed
    return Math.max(Math.round(score), 10);
  }
}

export const newsService = new NewsService();

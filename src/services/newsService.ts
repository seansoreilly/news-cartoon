import type { NewsArticle, NewsResponse } from '../types/news';
import { createNewsError } from '../types/error';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

type CacheStore = Record<string, CacheEntry<NewsArticle[]>>;

const CACHE_DURATION_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

class NewsService {
  private cache: CacheStore = {};
  private baseUrl = import.meta.env.PROD ? '/api/news' : 'http://localhost:3000/api/news';

  constructor() {
    // API key is now handled server-side via backend proxy
  }

  async fetchNewsByLocation(
    location: string,
    limit = parseInt(import.meta.env.VITE_DEFAULT_NEWS_LIMIT || '10')
  ): Promise<NewsResponse> {
    if (!location || location.trim() === '') {
      throw createNewsError('Location cannot be empty');
    }

    try {
      const articles = await this.fetchWithCache(
        `location-${location}`,
        async () => {
          const params = new URLSearchParams({
            q: location,
            max: limit.toString(),
            sortby: 'publishedAt',
          });

          const queryString = params.toString();
          return this.fetchWithRetry(
            `${this.baseUrl}/search?${queryString}`
          );
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
    limit = parseInt(import.meta.env.VITE_DEFAULT_NEWS_LIMIT || '10')
  ): Promise<NewsResponse> {
    if (!keyword || keyword.trim() === '') {
      throw createNewsError('Keyword cannot be empty');
    }

    try {
      const articles = await this.fetchWithCache(
        `keyword-${keyword}`,
        async () => {
          const params = new URLSearchParams({
            q: keyword,
            max: limit.toString(),
            sortby: 'publishedAt',
          });

          const queryString = params.toString();
          return this.fetchWithRetry(
            `${this.baseUrl}/search?${queryString}`
          );
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
}

export const newsService = new NewsService();

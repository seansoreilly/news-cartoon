import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { newsService } from '../newsService';

describe('NewsService', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    newsService.clearCache();
    mockFetch.mockClear();
    globalThis.fetch = mockFetch as any;
    vi.useFakeTimers();
  });

  afterEach(() => {
    mockFetch.mockClear();
    vi.useRealTimers();
  });

  const mockArticles = {
    articles: [
      {
        title: 'Breaking News 1',
        description: 'This is a test article',
        url: 'https://example.com/1',
        source: { name: 'News Source 1', url: 'https://example.com' },
        publishedAt: '2025-01-01T12:00:00Z',
        content: 'Full content here',
        image: 'https://example.com/image.jpg',
      },
      {
        title: 'Breaking News 2',
        description: 'This is another test article',
        url: 'https://example.com/2',
        source: { name: 'News Source 2', url: 'https://example.com' },
        publishedAt: '2025-01-01T11:00:00Z',
        content: 'More content here',
      },
    ],
  };

  describe('fetchNewsByLocation', () => {
    it('should fetch news articles for a valid location', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockArticles), { status: 200 })
      );

      const result = await newsService.fetchNewsByLocation('Melbourne, Victoria, Australia');

      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].title).toBe('Breaking News 1');
      expect(result.totalArticles).toBe(2);
      expect(result.topic).toBe('Melbourne, Victoria, Australia');
      expect(result.location).toBe('Melbourne, Victoria, Australia');
    });

    it('should throw error for empty location', async () => {
      await expect(newsService.fetchNewsByLocation('')).rejects.toThrow(
        'Location cannot be empty'
      );
    });

    it('should throw error for whitespace-only location', async () => {
      await expect(newsService.fetchNewsByLocation('   ')).rejects.toThrow(
        'Location cannot be empty'
      );
    });

    it('should include timestamp in response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockArticles), { status: 200 })
      );

      const result = await newsService.fetchNewsByLocation('Sydney');

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    });

    it('should respect the limit parameter', async () => {
      const limitedArticles = {
        articles: mockArticles.articles.slice(0, 5),
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(limitedArticles), { status: 200 })
      );

      await newsService.fetchNewsByLocation('Brisbane', 5);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('max=5'),
        expect.any(Object)
      );
    });
  });

  describe('fetchNewsByKeyword', () => {
    it('should fetch news articles for a valid keyword', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockArticles), { status: 200 })
      );

      const result = await newsService.fetchNewsByKeyword('technology');

      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].title).toBe('Breaking News 1');
      expect(result.totalArticles).toBe(2);
      expect(result.topic).toBe('technology');
      expect(result.location).toBeUndefined();
    });

    it('should throw error for empty keyword', async () => {
      await expect(newsService.fetchNewsByKeyword('')).rejects.toThrow(
        'Keyword cannot be empty'
      );
    });

    it('should throw error for whitespace-only keyword', async () => {
      await expect(newsService.fetchNewsByKeyword('   ')).rejects.toThrow(
        'Keyword cannot be empty'
      );
    });

    it('should include timestamp in response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockArticles), { status: 200 })
      );

      const result = await newsService.fetchNewsByKeyword('sports');

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    });
  });

  describe('Caching', () => {
    it('should cache results and return cached data on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockArticles), { status: 200 })
      );

      // First call
      await newsService.fetchNewsByLocation('Melbourne');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await newsService.fetchNewsByLocation('Melbourne');
      expect(fetch).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should use different cache keys for location vs keyword', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockArticles), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockArticles), { status: 200 })
        );

      // Fetch by location
      await newsService.fetchNewsByLocation('Melbourne');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Fetch by keyword with same search term should not use cache
      await newsService.fetchNewsByKeyword('Melbourne');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on clearCache()', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockArticles), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockArticles), { status: 200 })
        );

      // First call - caches result
      await newsService.fetchNewsByLocation('Melbourne');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      newsService.clearCache();

      // Second call should make a new request
      await newsService.fetchNewsByLocation('Melbourne');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle response with empty articles array', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ articles: [] }), { status: 200 })
      );

      const result = await newsService.fetchNewsByLocation('NoNews');

      expect(result.articles).toEqual([]);
      expect(result.totalArticles).toBe(0);
    });

    it('should handle response missing articles field', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      const result = await newsService.fetchNewsByLocation('Invalid');

      expect(result.articles).toEqual([]);
      expect(result.totalArticles).toBe(0);
    });
  });

  describe('Response Parsing', () => {
    it('should parse article with all fields', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockArticles), { status: 200 })
      );

      const result = await newsService.fetchNewsByLocation('Test');

      expect(result.articles[0]).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          url: expect.any(String),
          source: expect.objectContaining({
            name: expect.any(String),
          }),
          publishedAt: expect.any(String),
          content: expect.any(String),
          image: expect.any(String),
        })
      );
    });

    it('should handle articles with missing optional fields', async () => {
      const articlesWithoutOptional = {
        articles: [
          {
            title: 'Minimal Article',
            url: 'https://example.com/minimal',
            source: { name: 'Test Source' },
            publishedAt: '2025-01-01T12:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(articlesWithoutOptional), { status: 200 })
      );

      const result = await newsService.fetchNewsByLocation('Test');

      expect(result.articles[0].title).toBe('Minimal Article');
      expect(result.articles[0].description).toBeUndefined();
      expect(result.articles[0].content).toBeUndefined();
      expect(result.articles[0].image).toBeUndefined();
    });

    it('should use default values for missing source information', async () => {
      const articlesWithoutSource = {
        articles: [
          {
            title: 'No Source Article',
            url: 'https://example.com/no-source',
            publishedAt: '2025-01-01T12:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(articlesWithoutSource), { status: 200 })
      );

      const result = await newsService.fetchNewsByLocation('Test');

      expect(result.articles[0].source.name).toBe('Unknown');
      expect(result.articles[0].source.url).toBeUndefined();
    });
  });
});

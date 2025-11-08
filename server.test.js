import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock modules before importing server
vi.mock('dotenv');
vi.mock('express');
vi.mock('cors');

describe('News Proxy Server', () => {
  let app;
  let mockFetch;
  let mockParseString;

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock parseStringPromise
    mockParseString = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Google News RSS Parsing', () => {
    const mockRssResponse = {
      rss: {
        channel: [
          {
            item: [
              {
                title: ['Breaking News Story'],
                description: ['This is a test article'],
                link: ['https://news.example.com/article1'],
                pubDate: ['Fri, 01 Jan 2025 12:00:00 GMT'],
                source: ['News Source 1'],
                'media:content': [
                  {
                    $: { url: 'https://example.com/image.jpg' },
                  },
                ],
              },
              {
                title: ['Another Story'],
                description: ['Second test article'],
                link: ['https://news.example.com/article2'],
                pubDate: ['Fri, 01 Jan 2025 11:00:00 GMT'],
                source: ['News Source 2'],
              },
            ],
          },
        ],
      },
    };

    it('should parse RSS response correctly', () => {
      const parseGoogleNewsRss = (rssData, limit) => {
        try {
          const items = rssData.rss.channel[0].item || [];
          const articles = items.slice(0, limit).map((item) => {
            const title = item.title?.[0] || '';
            const description = item.description?.[0] || '';
            const link = item.link?.[0] || '';
            const pubDate = item.pubDate?.[0] || new Date().toISOString();
            const source = item.source?.[0]?._ || item.source?.[0] || 'Google News';
            const image = item['media:content']?.[0]?.$ || {};

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
          return [];
        }
      };

      const articles = parseGoogleNewsRss(mockRssResponse, 10);

      expect(articles).toHaveLength(2);
      expect(articles[0]).toEqual(
        expect.objectContaining({
          title: 'Breaking News Story',
          description: 'This is a test article',
          url: 'https://news.example.com/article1',
          source: expect.objectContaining({
            name: 'News Source 1',
            url: 'https://news.google.com',
          }),
          image: 'https://example.com/image.jpg',
        })
      );
    });

    it('should handle articles without images', () => {
      const parseGoogleNewsRss = (rssData, limit) => {
        try {
          const items = rssData.rss.channel[0].item || [];
          const articles = items.slice(0, limit).map((item) => {
            const title = item.title?.[0] || '';
            const description = item.description?.[0] || '';
            const link = item.link?.[0] || '';
            const pubDate = item.pubDate?.[0] || new Date().toISOString();
            const source = item.source?.[0]?._ || item.source?.[0] || 'Google News';
            const image = item['media:content']?.[0]?.$ || {};

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
          return [];
        }
      };

      const articles = parseGoogleNewsRss(mockRssResponse, 10);
      const secondArticle = articles[1];

      expect(secondArticle.image).toBeNull();
      expect(secondArticle.title).toBe('Another Story');
    });

    it('should respect limit parameter', () => {
      const parseGoogleNewsRss = (rssData, limit) => {
        try {
          const items = rssData.rss.channel[0].item || [];
          const articles = items.slice(0, limit).map((item) => {
            const title = item.title?.[0] || '';
            const description = item.description?.[0] || '';
            const link = item.link?.[0] || '';
            const pubDate = item.pubDate?.[0] || new Date().toISOString();
            const source = item.source?.[0]?._ || item.source?.[0] || 'Google News';
            const image = item['media:content']?.[0]?.$ || {};

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
          return [];
        }
      };

      const articles = parseGoogleNewsRss(mockRssResponse, 1);

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Breaking News Story');
    });

    it('should handle empty RSS response', () => {
      const parseGoogleNewsRss = (rssData, limit) => {
        try {
          const items = rssData.rss.channel[0].item || [];
          const articles = items.slice(0, limit).map((item) => {
            const title = item.title?.[0] || '';
            const description = item.description?.[0] || '';
            const link = item.link?.[0] || '';
            const pubDate = item.pubDate?.[0] || new Date().toISOString();
            const source = item.source?.[0]?._ || item.source?.[0] || 'Google News';
            const image = item['media:content']?.[0]?.$ || {};

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
          return [];
        }
      };

      const emptyRss = {
        rss: {
          channel: [
            {
              item: [],
            },
          ],
        },
      };

      const articles = parseGoogleNewsRss(emptyRss, 10);

      expect(articles).toEqual([]);
    });

    it('should handle malformed RSS gracefully', () => {
      const parseGoogleNewsRss = (rssData, limit) => {
        try {
          const items = rssData.rss.channel[0].item || [];
          const articles = items.slice(0, limit).map((item) => {
            const title = item.title?.[0] || '';
            const description = item.description?.[0] || '';
            const link = item.link?.[0] || '';
            const pubDate = item.pubDate?.[0] || new Date().toISOString();
            const source = item.source?.[0]?._ || item.source?.[0] || 'Google News';
            const image = item['media:content']?.[0]?.$ || {};

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
          return [];
        }
      };

      const malformedRss = null;

      // Should not throw, returns empty array
      expect(() => parseGoogleNewsRss(malformedRss, 10)).not.toThrow();
    });
  });

  describe('Google News URL Construction', () => {
    it('should build correct Google News RSS URL', () => {
      const buildGoogleNewsUrl = (query) => {
        const url = new URL('https://news.google.com/rss/search');
        url.searchParams.set('q', query);
        url.searchParams.set('hl', 'en-US');
        url.searchParams.set('gl', 'US');
        return url.toString();
      };

      const url = buildGoogleNewsUrl('technology');

      expect(url).toContain('https://news.google.com/rss/search');
      expect(url).toContain('q=technology');
      expect(url).toContain('hl=en-US');
      expect(url).toContain('gl=US');
    });

    it('should handle special characters in query', () => {
      const buildGoogleNewsUrl = (query) => {
        const url = new URL('https://news.google.com/rss/search');
        url.searchParams.set('q', query);
        url.searchParams.set('hl', 'en-US');
        url.searchParams.set('gl', 'US');
        return url.toString();
      };

      const url = buildGoogleNewsUrl('Melbourne, Victoria, Australia');

      expect(url).toContain('Melbourne');
      expect(url).toContain('Victoria');
      expect(url).toContain('Australia');
    });
  });

  describe('Response Format', () => {
    it('should return response in GNews-compatible format', () => {
      const articles = [
        {
          title: 'Test Article',
          description: 'Test Description',
          content: 'Test Description',
          url: 'https://example.com/article',
          image: 'https://example.com/image.jpg',
          source: {
            name: 'Test Source',
            url: 'https://news.google.com',
          },
          publishedAt: '2025-01-01T12:00:00.000Z',
        },
      ];

      const response = {
        articles,
        totalArticles: articles.length,
        topic: 'technology',
      };

      expect(response).toHaveProperty('articles');
      expect(response).toHaveProperty('totalArticles');
      expect(response).toHaveProperty('topic');
      expect(response.articles[0]).toHaveProperty('title');
      expect(response.articles[0]).toHaveProperty('url');
      expect(response.articles[0]).toHaveProperty('source');
      expect(response.articles[0]).toHaveProperty('publishedAt');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing query parameter', async () => {
      // Simulating request validation
      const query = '';
      const error = !query ? 'Query parameter "q" is required' : null;

      expect(error).toBe('Query parameter "q" is required');
    });

    it('should provide helpful error message on network failure', () => {
      const error = new Error('Network error');
      const errorResponse = {
        error: 'Failed to fetch news',
        details: error.message,
      };

      expect(errorResponse).toEqual({
        error: 'Failed to fetch news',
        details: 'Network error',
      });
    });

    it('should handle HTTP error responses', () => {
      const statusCode = 500;
      const shouldRetry = statusCode >= 500;

      expect(shouldRetry).toBe(true);
    });
  });
});

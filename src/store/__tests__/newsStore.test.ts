import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNewsStore } from '../newsStore';
import type { NewsArticle, NewsData } from '../../types';

describe('newsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useNewsStore());
    act(() => {
      result.current.clearNews();
      // Clear selected articles by deselecting all
      const articles = result.current.selectedArticles;
      articles.forEach(article => result.current.deselectArticle(article));
    });
  });

  describe('Initial State', () => {
    it('should have initial state with null news and empty articles', () => {
      const { result } = renderHook(() => useNewsStore());

      expect(result.current.news).toBeNull();
      expect(result.current.selectedArticles).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setNews', () => {
    it('should set news data and clear error', () => {
      const { result } = renderHook(() => useNewsStore());
      const mockNews: NewsData = {
        articles: [
          {
            title: 'Test Article',
            description: 'Test description',
            url: 'https://example.com',
            source: { name: 'Test Source' },
            publishedAt: '2025-01-01T00:00:00Z',
          },
        ],
        topic: 'Technology',
        date: new Date().toISOString(),
      };

      act(() => {
        result.current.setNews(mockNews);
      });

      expect(result.current.news).toEqual(mockNews);
      expect(result.current.error).toBeNull();
    });

    it('should accept a function to update news', () => {
      const { result } = renderHook(() => useNewsStore());
      const initialNews: NewsData = {
        articles: [{ title: 'Article 1', url: 'url1', source: { name: 'Test' }, publishedAt: '2025-01-01T00:00:00Z' } as NewsArticle],
        topic: 'Tech',
        date: new Date().toISOString(),
      };

      act(() => {
        result.current.setNews(initialNews);
      });

      act(() => {
        result.current.setNews((prev) => ({
          ...prev!,
          topic: 'Science',
        }));
      });

      expect(result.current.news?.topic).toBe('Science');
    });

    it('should clear error when setting news', () => {
      const { result } = renderHook(() => useNewsStore());

      act(() => {
        result.current.setError('Previous error');
      });

      const newsData: NewsData = {
        articles: [],
        topic: 'Tech',
        date: new Date().toISOString(),
      };

      act(() => {
        result.current.setNews(newsData);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Article Selection', () => {
    it('should select an article', () => {
      const { result } = renderHook(() => useNewsStore());
      const article: NewsArticle = {
        title: 'Test Article',
        url: 'https://example.com',
        source: { name: 'Source' },
        publishedAt: '2025-01-01T00:00:00Z',
      } as NewsArticle;

      act(() => {
        result.current.selectArticle(article);
      });

      expect(result.current.selectedArticles).toHaveLength(1);
      expect(result.current.selectedArticles[0]).toEqual(article);
    });

    it('should not select duplicate articles', () => {
      const { result } = renderHook(() => useNewsStore());
      const article: NewsArticle = {
        title: 'Duplicate',
        url: 'https://example.com',
        source: { name: 'Source' },
        publishedAt: '2025-01-01T00:00:00Z',
      } as NewsArticle;

      act(() => {
        result.current.selectArticle(article);
        result.current.selectArticle(article);
      });

      expect(result.current.selectedArticles).toHaveLength(1);
    });

    it('should deselect an article', () => {
      const { result } = renderHook(() => useNewsStore());
      const article: NewsArticle = {
        title: 'Article to Deselect',
        url: 'https://example.com/1',
        source: { name: 'Source' },
        publishedAt: '2025-01-01T00:00:00Z',
      } as NewsArticle;

      act(() => {
        result.current.selectArticle(article);
      });

      expect(result.current.selectedArticles).toHaveLength(1);

      act(() => {
        result.current.deselectArticle(article);
      });

      expect(result.current.selectedArticles).toHaveLength(0);
    });

    it('should handle selecting multiple articles', () => {
      const { result } = renderHook(() => useNewsStore());
      const articles: NewsArticle[] = [
        {
          title: 'Article 1',
          url: 'https://example.com/1',
          source: { name: 'Source' },
          publishedAt: '2025-01-01T00:00:00Z',
        } as NewsArticle,
        {
          title: 'Article 2',
          url: 'https://example.com/2',
          source: { name: 'Source' },
          publishedAt: '2025-01-01T00:00:00Z',
        } as NewsArticle,
      ];

      act(() => {
        articles.forEach((article) => result.current.selectArticle(article));
      });

      expect(result.current.selectedArticles).toHaveLength(2);
    });

    it('should clear all selected articles', () => {
      const { result } = renderHook(() => useNewsStore());
      const articles: NewsArticle[] = [
        {
          title: 'Article 1',
          url: 'url1',
          source: { name: 'Source' },
          publishedAt: '2025-01-01T00:00:00Z',
        } as NewsArticle,
        {
          title: 'Article 2',
          url: 'url2',
          source: { name: 'Source' },
          publishedAt: '2025-01-01T00:00:00Z',
        } as NewsArticle,
      ];

      act(() => {
        articles.forEach((article) => result.current.selectArticle(article));
      });

      expect(result.current.selectedArticles).toHaveLength(2);

      act(() => {
        // Deselect all articles
        const selectedArticles = [...result.current.selectedArticles];
        selectedArticles.forEach((article) => result.current.deselectArticle(article));
      });

      expect(result.current.selectedArticles).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useNewsStore());
      const errorMessage = 'Failed to fetch news';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should clear error with null', () => {
      const { result } = renderHook(() => useNewsStore());

      act(() => {
        result.current.setError('Error');
      });

      expect(result.current.error).toBe('Error');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useNewsStore());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Clear News', () => {
    it('should clear all news data and error', () => {
      const { result } = renderHook(() => useNewsStore());
      const news: NewsData = {
        articles: [
          {
            title: 'Article',
            url: 'url',
            source: { name: 'Source' },
            publishedAt: '2025-01-01T00:00:00Z',
          } as NewsArticle,
        ],
        topic: 'Tech',
        date: new Date().toISOString(),
      };

      act(() => {
        result.current.setNews(news);
        result.current.setError('Some error');
      });

      expect(result.current.news).not.toBeNull();
      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearNews();
      });

      expect(result.current.news).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});

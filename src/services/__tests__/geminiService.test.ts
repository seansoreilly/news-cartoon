import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { geminiService } from '../geminiService';

describe('GeminiService - Humor Scoring', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe('generateHumorScore', () => {
    it('should return a valid humor score between 1-100', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '75',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore(
        'Man bites dog',
        'A humorous twist on the classic headline'
      );

      expect(score).toBe(75);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle score at minimum boundary (1)', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '1',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore(
        'Boring economic report',
        'Quarterly earnings unchanged'
      );

      expect(score).toBe(1);
    });

    it('should handle score at maximum boundary (100)', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '100',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore(
        'Absurd political gaffe',
        'Politician accidentally declares war on spelling'
      );

      expect(score).toBe(100);
    });

    it('should clamp scores above 100 to 100', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '150',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore('Test', 'Test');

      expect(score).toBe(100);
    });

    it('should clamp scores below 1 to 1', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '-10',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore('Test', 'Test');

      expect(score).toBe(1);
    });

    it('should return 50 (default) when API returns invalid response', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'not a number',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore('Test', 'Test');

      expect(score).toBe(50);
    });

    it('should return 1 when API returns empty response', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore('Test', 'Test');

      // Empty string becomes '0' via || operator, which gets clamped to 1
      expect(score).toBe(1);
    });

    it('should return 50 (default) on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const score = await geminiService.generateHumorScore('Test', 'Test');

      expect(score).toBe(50);
    });

    it('should work without description parameter', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '60',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const score = await geminiService.generateHumorScore('Funny headline');

      expect(score).toBe(60);
    });

    it('should make API call with correct prompt structure', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '80',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await geminiService.generateHumorScore(
        'Test Title',
        'Test Description'
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test Title'),
        })
      );
    });
  });

  describe('Humor Score Integration', () => {
    it('should handle multiple concurrent humor score requests', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '75',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const scores = await Promise.all([
        geminiService.generateHumorScore('Article 1', 'Description 1'),
        geminiService.generateHumorScore('Article 2', 'Description 2'),
        geminiService.generateHumorScore('Article 3', 'Description 3'),
      ]);

      expect(scores).toHaveLength(3);
      scores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });
});

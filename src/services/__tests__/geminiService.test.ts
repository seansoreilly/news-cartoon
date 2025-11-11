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

  describe('batchAnalyzeArticles', () => {
    it('should successfully analyze a batch of articles', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '[{"summary": "Test summary 1", "humorScore": 75}, {"summary": "Test summary 2", "humorScore": 60}, {"summary": "Test summary 3", "humorScore": 85}]',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const articles = [
        { title: 'Article 1', description: 'Desc 1' },
        { title: 'Article 2', description: 'Desc 2' },
        { title: 'Article 3', description: 'Desc 3' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ summary: 'Test summary 1', humorScore: 75 });
      expect(results[1]).toEqual({ summary: 'Test summary 2', humorScore: 60 });
      expect(results[2]).toEqual({ summary: 'Test summary 3', humorScore: 85 });
    });

    it('should handle markdown-wrapped JSON responses', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n[{"summary": "Satirical angle here", "humorScore": 70}, {"summary": "Comedy potential", "humorScore": 82}]\n```',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const articles = [
        { title: 'Article 1', description: 'Desc 1' },
        { title: 'Article 2', description: 'Desc 2' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(2);
      expect(results[0].summary).toBe('Satirical angle here');
      expect(results[0].humorScore).toBe(70);
      expect(results[1].summary).toBe('Comedy potential');
      expect(results[1].humorScore).toBe(82);
    });

    it('should handle JSON with trailing commas', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '[{"summary": "Test with comma", "humorScore": 65,}, {"summary": "Another test", "humorScore": 70,}]',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const articles = [
        { title: 'Article 1', description: 'Desc 1' },
        { title: 'Article 2', description: 'Desc 2' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(2);
      expect(results[0].humorScore).toBe(65);
      expect(results[1].humorScore).toBe(70);
    });

    it('should handle malformed JSON with fallback values', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'This is not valid JSON at all',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const articles = [
        { title: 'Article 1', description: 'Desc 1' },
        { title: 'Article 2', description: 'Desc 2' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ summary: '', humorScore: 50 });
      expect(results[1]).toEqual({ summary: '', humorScore: 50 });
    });

    it('should process articles in batches of 3', async () => {
      const mockResponse1 = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '[{"summary": "Batch 1 - 1", "humorScore": 71}, {"summary": "Batch 1 - 2", "humorScore": 72}, {"summary": "Batch 1 - 3", "humorScore": 73}]',
                },
              ],
            },
          },
        ],
      };

      const mockResponse2 = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '[{"summary": "Batch 2 - 1", "humorScore": 81}, {"summary": "Batch 2 - 2", "humorScore": 82}]',
                },
              ],
            },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse1), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse2), { status: 200 }));

      const articles = [
        { title: 'Article 1' },
        { title: 'Article 2' },
        { title: 'Article 3' },
        { title: 'Article 4' },
        { title: 'Article 5' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(5);
      expect(results[0].summary).toBe('Batch 1 - 1');
      expect(results[2].summary).toBe('Batch 1 - 3');
      expect(results[3].summary).toBe('Batch 2 - 1');
      expect(results[4].summary).toBe('Batch 2 - 2');
      expect(fetch).toHaveBeenCalledTimes(2); // Two batches
    });

    it('should handle partial batch failures gracefully', async () => {
      const mockResponse1 = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '[{"summary": "Success", "humorScore": 75}]',
                },
              ],
            },
          },
        ],
      };

      // Second batch fails
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse1), { status: 200 }))
        .mockRejectedValueOnce(new Error('API Error'));

      const articles = [
        { title: 'Article 1' },
        { title: 'Article 2' },
        { title: 'Article 3' },
        { title: 'Article 4' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(4);
      expect(results[0].summary).toBe('Success');
      expect(results[0].humorScore).toBe(75);
      // Padding for first batch
      expect(results[1]).toEqual({ summary: '', humorScore: 50 });
      expect(results[2]).toEqual({ summary: '', humorScore: 50 });
      // Second batch failed, should have fallbacks
      expect(results[3]).toEqual({ summary: '', humorScore: 50 });
    });

    it('should handle incomplete JSON array responses', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n[{"summary": "The satirical angle here is the absurdity of', // Cut off mid-sentence
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const articles = [
        { title: 'Article 1', description: 'Desc 1' },
        { title: 'Article 2', description: 'Desc 2' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(2);
      // Should fall back to default values when JSON parsing fails
      expect(results[0]).toEqual({ summary: '', humorScore: 50 });
      expect(results[1]).toEqual({ summary: '', humorScore: 50 });
    });

    it('should pad results when API returns fewer results than expected', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '[{"summary": "Only one result", "humorScore": 90}]',
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const articles = [
        { title: 'Article 1', description: 'Desc 1' },
        { title: 'Article 2', description: 'Desc 2' },
        { title: 'Article 3', description: 'Desc 3' },
      ];

      const results = await geminiService.batchAnalyzeArticles(articles);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ summary: 'Only one result', humorScore: 90 });
      expect(results[1]).toEqual({ summary: '', humorScore: 50 });
      expect(results[2]).toEqual({ summary: '', humorScore: 50 });
    });
  });
});

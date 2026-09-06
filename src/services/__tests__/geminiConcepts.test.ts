import { describe, it, expect, beforeEach, vi } from 'vitest';
import { geminiService } from '../geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import { buildProxyUrl } from '../gemini/api';
import type { NewsArticle } from '../../types/news';

const articles: NewsArticle[] = [
  {
    title: 'Council approves giant rubber duck for the Yarra',
    description: 'A 12-metre duck will float past Federation Square.',
    url: 'https://example.com/duck',
    source: { name: 'Test', url: 'https://example.com' },
    publishedAt: '2026-09-01T00:00:00Z',
  } as NewsArticle,
];

const concepts = [
  { title: 'Duck Tax', premise: 'The duck files a rates notice', why_funny: 'Anthropomorphism' },
  { title: 'Rubber Bridge', premise: 'Commuters walk across the duck', why_funny: 'Scale inversion' },
];

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('geminiService.generateCartoonConcepts (via proxy)', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  it('posts a text request to the proxy and parses the concepts', async () => {
    mockFetch.mockResolvedValueOnce(
      json({ candidates: [{ content: { parts: [{ text: JSON.stringify(concepts) }] }, finishReason: 'STOP' }] })
    );

    const data = await geminiService.generateCartoonConcepts(articles, 'Melbourne');

    expect(data.ideas.map((c) => c.title)).toEqual(['Duck Tax', 'Rubber Bridge']);
    expect(data.winner).toBe('Duck Tax');
    expect(data.location).toBe('Melbourne');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0][0])).toBe(buildProxyUrl());
    const body = JSON.parse(String(mockFetch.mock.calls[0][1].body));
    expect(body.kind).toBe('text');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.prompt).toContain('rubber duck');
  });

  it('surfaces a retired-model error reported by the proxy', async () => {
    mockFetch.mockResolvedValueOnce(
      json(
        {
          error: {
            message: 'Gemini model "gemini-2.5-flash" is not available (it may have been retired).',
            statusCode: 404,
            code: 'GEMINI_MODEL_NOT_FOUND',
            model: 'gemini-2.5-flash',
            modelNotFound: true,
          },
        },
        404
      )
    );

    await expect(geminiService.generateCartoonConcepts(articles, 'Melbourne')).rejects.toMatchObject({
      code: 'CARTOON_ERROR',
      statusCode: 404,
      message: expect.stringContaining('is not available'),
      details: expect.objectContaining({ modelNotFound: true, userFacing: true }),
    });
  });

  it('shows the real reason in the user-facing message instead of a generic one', async () => {
    mockFetch.mockResolvedValueOnce(
      json(
        {
          error: {
            message: 'Gemini API access denied. Your API key was reported as leaked',
            statusCode: 403,
            code: 'GEMINI_ACCESS_DENIED',
          },
        },
        403
      )
    );

    let userMessage = '';
    try {
      await geminiService.generateCartoonConcepts(articles, 'Melbourne');
    } catch (err) {
      userMessage = AppErrorHandler.getUserMessage(AppErrorHandler.handleError(err));
    }

    expect(userMessage).toContain('Gemini API access denied');
    expect(userMessage).toContain('reported as leaked');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty article list before calling the API', async () => {
    await expect(geminiService.generateCartoonConcepts([], 'Melbourne')).rejects.toMatchObject({
      code: 'CARTOON_ERROR',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { geminiService } from '../geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import { buildModelUrl, DEFAULT_TEXT_MODELS } from '../gemini/api';
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

describe('geminiService.generateCartoonConcepts (regression: retired model)', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  it('still produces concepts when the preferred model has been retired', async () => {
    mockFetch
      .mockResolvedValueOnce(
        json({ error: { code: 404, message: 'models/x is not found', status: 'NOT_FOUND' } }, 404)
      )
      .mockResolvedValueOnce(
        json({ candidates: [{ content: { parts: [{ text: JSON.stringify(concepts) }] }, finishReason: 'STOP' }] })
      );

    const data = await geminiService.generateCartoonConcepts(articles, 'Melbourne');

    expect(data.ideas.map((c) => c.title)).toEqual(['Duck Tax', 'Rubber Bridge']);
    expect(data.winner).toBe('Duck Tax');
    expect(data.location).toBe('Melbourne');
    expect(String(mockFetch.mock.calls[0][0])).toBe(buildModelUrl(DEFAULT_TEXT_MODELS[0]));
    expect(String(mockFetch.mock.calls[1][0])).toBe(buildModelUrl(DEFAULT_TEXT_MODELS[1]));
    const body = JSON.parse(String(mockFetch.mock.calls[1][1].body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('shows the real reason in the user-facing message instead of a generic one', async () => {
    mockFetch.mockResolvedValueOnce(
      json({ error: { code: 403, message: 'Your API key was reported as leaked', status: 'PERMISSION_DENIED' } }, 403)
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

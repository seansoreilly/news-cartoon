import { describe, it, expect } from 'vitest';
import {
  conceptsRequest,
  comicScriptRequest,
  cartoonImageRequest,
  humorScoreRequest,
  batchAnalysisRequest,
} from '../requests';
import type { NewsArticle } from '../../../types/news';

const article = {
  title: 'Headline',
  description: 'd'.repeat(5000),
  url: 'https://example.com/a',
  source: { name: 'Src' },
  publishedAt: '2025-01-01',
} as unknown as NewsArticle;
const concept = { title: 'T', premise: 'P', why_funny: 'W', location: 'Melbourne' };

describe('typed generate requests', () => {
  it('never include prompt/kind/generationConfig and only send whitelisted article fields', () => {
    const body = conceptsRequest([article], 'Melbourne');
    expect(body).toEqual({
      task: 'concepts',
      articles: [{ title: 'Headline', description: 'd'.repeat(2000) }],
      location: 'Melbourne',
    });
  });

  it('builds comic-script, image, humor and batch requests', () => {
    expect(comicScriptRequest(concept, [article], 2)).toMatchObject({ task: 'comic-script', panelCount: 2, concept });
    const img = cartoonImageRequest(
      concept,
      {
        panels: [{ panelNumber: 1, visualDescription: 'v', visibleText: [{ type: 'sign', content: 'HI' }], characters: ['a'], setting: 's' }],
        description: 'ignored',
        generatedAt: 1,
      },
      4
    );
    expect(img).toEqual({
      task: 'cartoon-image',
      concept,
      script: { panels: [{ panelNumber: 1, visualDescription: 'v', visibleText: [{ type: 'sign', content: 'HI' }], characters: ['a'], setting: 's' }] },
      panelCount: 4,
    });
    expect(humorScoreRequest('t')).toEqual({ task: 'humor-score', title: 't' });
    expect(batchAnalysisRequest([{ title: 'a', content: 'c'.repeat(3000) }])).toEqual({
      task: 'batch-analysis',
      articles: [{ title: 'a', content: 'c'.repeat(2000) }],
    });
  });
});

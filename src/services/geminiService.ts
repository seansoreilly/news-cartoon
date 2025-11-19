import type { NewsArticle } from '../types/news';
import type { CartoonConcept, CartoonData, ComicScript, CartoonImage } from '../types/cartoon';
import { createCartoonError } from '../types/error';
import { ImageGenerationRateLimiter } from '../utils/rateLimiter';
import { GeminiApiClient } from './gemini/api';
import { ImageCacheService } from './gemini/cache';
import {
  buildConceptPrompt,
  buildComicPrompt,
  buildImagePrompt,
  buildHumorScorePrompt,
  buildBatchAnalysisPrompt
} from './gemini/prompts';
import {
  parseConceptResponse,
  parseComicScript,
  parseImageResponse,
  parseBatchAnalysisResponse,
  extractTextElements,
  validateTextElements
} from './gemini/parsers';

class GeminiService {
  private apiClient: GeminiApiClient;
  private imageCache: ImageCacheService;

  constructor() {
    this.apiClient = new GeminiApiClient();
    this.imageCache = new ImageCacheService();
  }

  async generateCartoonConcepts(
    articles: NewsArticle[],
    location: string
  ): Promise<CartoonData> {
    if (!articles || articles.length === 0) {
      throw createCartoonError('No articles provided for concept generation');
    }

    const prompt = buildConceptPrompt(articles, location);

    try {
      const response = await this.apiClient.callApi(prompt);
      const concepts = parseConceptResponse(response, location);

      return {
        topic: articles[0]?.title || 'News Topic',
        location,
        ideas: concepts.slice(0, 5),
        ranking: concepts.slice(0, 5).map((c) => c.title),
        winner: concepts[0]?.title || '',
        generatedAt: Date.now(),
      };
    } catch (error) {
      throw createCartoonError(
        'Failed to generate cartoon concepts',
        { originalError: String(error) }
      );
    }
  }

  async generateComicPrompt(
    concept: CartoonConcept,
    articles: NewsArticle[],
    panelCount: number = 4
  ): Promise<ComicScript> {
    console.log('[generateComicPrompt] Starting comic prompt generation...');
    console.log('[generateComicPrompt] Concept title:', concept.title);
    console.log('[generateComicPrompt] Articles count:', articles.length);
    console.log('[generateComicPrompt] Panel count requested:', panelCount);

    const prompt = buildComicPrompt(concept, articles, panelCount);
    console.log('[generateComicPrompt] Prompt text length:', prompt.length);

    try {
      console.log('[generateComicPrompt] Calling Gemini API for prompt...');
      const response = await this.apiClient.callApi(prompt);
      console.log('[generateComicPrompt] Received response from Gemini');

      console.log('[generateComicPrompt] Parsing prompt response...');
      const panels = parseComicScript(response, panelCount);
      console.log('[generateComicPrompt] Parsed panels count:', panels.length);

      const comicPrompt = {
        panels,
        description: `Comic prompt for: ${concept.title}`,
        generatedAt: Date.now(),
        newsContext: articles.map((a) => a.title).join('; '),
      };

      console.log('[generateComicPrompt] ✅ Comic prompt generated successfully');
      return comicPrompt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[generateComicPrompt] ❌ Comic prompt generation failed:', {
        message: errorMessage,
        stack: errorStack,
        error,
      });
      throw createCartoonError(
        'Failed to generate comic prompt',
        { originalError: errorMessage, stack: errorStack }
      );
    }
  }

  async generateCartoonImage(concept: CartoonConcept, articles: NewsArticle[], panelCount: number = 4): Promise<CartoonImage> {
    console.log('=== Starting image generation ===');
    console.log('Concept:', JSON.stringify(concept, null, 2));
    console.log('Articles count:', articles.length);
    console.log('Panel count requested:', panelCount);

    // Check rate limiting
    if (!ImageGenerationRateLimiter.canGenerateImage()) {
      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();
      console.log('Rate limit hit. Time until next:', timeUntilNext);
      throw createCartoonError(
        `Rate limit exceeded. Try again in ${Math.ceil(timeUntilNext / 1000)} seconds.`,
        { statusCode: 429, code: 'RATE_LIMIT_ERROR' }
      );
    }

    // Check cache
    const cacheKey = this.imageCache.buildCacheKey(concept);
    console.log('Cache key:', cacheKey);
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      console.log('✅ Found cached image, returning from cache');
      return cached;
    }
    console.log('No cached image found, generating new one...');

    console.log('Generating comic prompt...');
    const prompt = await this.generateComicPrompt(concept, articles, panelCount);
    console.log('Comic prompt generated:', prompt);
    console.log('Panel count being used for image generation:', panelCount);

    // Extract and validate text elements before building prompt
    const textElements = extractTextElements(prompt);
    validateTextElements(textElements);

    const imagePrompt = buildImagePrompt(concept, prompt, panelCount);
    console.log('Image prompt length:', imagePrompt.length, 'characters');

    try {
      console.log('Calling Vision API...');
      const response = await this.apiClient.callVisionApi(imagePrompt);
      console.log('Vision API response received');

      console.log('Parsing image response...');
      const imageData = parseImageResponse(response);
      console.log('Image data parsed successfully, base64 length:', imageData.length);

      // Record rate limit
      ImageGenerationRateLimiter.recordImageGeneration();
      console.log('Rate limit recorded');

      // Cache the result
      const cartoonImage: CartoonImage = {
        base64Data: imageData,
        mimeType: 'image/png',
        generatedAt: Date.now(),
      };
      this.imageCache.set(cacheKey, cartoonImage);
      console.log('Image cached successfully');

      console.log('=== Image generation complete ===');
      return cartoonImage;
    } catch (error) {
      console.error('Image generation failed:', error);
      throw createCartoonError(
        'Failed to generate cartoon image',
        { originalError: String(error) }
      );
    }
  }

  clearImageCache(): void {
    this.imageCache.clear();
  }

  async generateHumorScore(title: string, description?: string): Promise<number> {
    const prompt = buildHumorScorePrompt(title, description);

    try {
      const response = await this.apiClient.callApi(prompt);
      const scoreText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const score = parseInt(scoreText || '0', 10);
      return isNaN(score) ? 50 : Math.min(100, Math.max(1, score));
    } catch (error) {
      console.error('[generateHumorScore] Error:', error);
      return 50; // Default to middle score on error
    }
  }

  async batchAnalyzeArticles(articles: Array<{ title: string; description?: string; content?: string }>): Promise<Array<{ summary: string; humorScore: number }>> {
    console.log(`[batchAnalyzeArticles] Analyzing ${articles.length} articles...`);

    // Process in smaller batches to avoid API limits and improve reliability
    const BATCH_SIZE = 3;
    const results: Array<{ summary: string; humorScore: number }> = [];

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, Math.min(i + BATCH_SIZE, articles.length));
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

      console.log(`[batchAnalyzeArticles] Processing batch ${batchNumber}/${totalBatches} (articles ${i + 1}-${Math.min(i + BATCH_SIZE, articles.length)})`);

      const prompt = buildBatchAnalysisPrompt(batch);

      try {
        const response = await this.apiClient.callApi(prompt);
        const batchResults = parseBatchAnalysisResponse(response);

        // Ensure we have the right number of results
        if (batchResults.length < batch.length) {
          console.warn(`[batchAnalyzeArticles] Batch ${batchNumber}: Expected ${batch.length} results, got ${batchResults.length}. Padding with defaults.`);
          while (batchResults.length < batch.length) {
            batchResults.push({ summary: '', humorScore: 50 });
          }
        }

        // Take only the needed number of results
        results.push(...batchResults.slice(0, batch.length));
        console.log(`[batchAnalyzeArticles] ✅ Batch ${batchNumber} successful (${batchResults.length} articles)`);

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < articles.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[batchAnalyzeArticles] Batch ${batchNumber} error:`, error);
        // Add fallback for this batch
        batch.forEach(() => results.push({ summary: '', humorScore: 50 }));
      }
    }

    const successCount = results.filter(r => r.summary && r.summary.length > 0).length;
    console.log(`[batchAnalyzeArticles] ✅ Completed: ${successCount}/${articles.length} articles with AI summaries`);

    return results;
  }
}

export const geminiService = new GeminiService();

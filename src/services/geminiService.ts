import type { NewsArticle } from '../types/news';
import type { CartoonConcept, CartoonData, ComicScript, CartoonImage } from '../types/cartoon';
import { createCartoonError } from '../types/error';
import { ImageGenerationRateLimiter } from '../utils/rateLimiter';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const VISION_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    responseModalities?: string[];
    aspectRatio?: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code?: number;
  };
}

interface ImageCache {
  data: CartoonImage;
  timestamp: number;
}

class GeminiService {
  private apiKey: string;
  private baseUrl: string;
  private visionBaseUrl: string;
  private imageCache: Map<string, ImageCache> = new Map();
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.apiKey = API_KEY;
    this.baseUrl = BASE_URL;
    this.visionBaseUrl = VISION_BASE_URL;
  }

  async generateCartoonConcepts(
    articles: NewsArticle[],
    location: string
  ): Promise<CartoonData> {
    if (!articles || articles.length === 0) {
      throw createCartoonError('No articles provided for concept generation');
    }

    const prompt = this.buildConceptPrompt(articles, location);

    try {
      const response = await this.callGeminiApi(prompt);
      const concepts = this.parseConceptResponse(response, location);

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

  async generateComicScript(
    concept: CartoonConcept,
    articles: NewsArticle[],
    panelCount: number = 4
  ): Promise<ComicScript> {
    console.log('[generateComicScript] Starting comic script generation...');
    console.log('[generateComicScript] Concept title:', concept.title);
    console.log('[generateComicScript] Articles count:', articles.length);
    console.log('[generateComicScript] Panel count requested:', panelCount);

    const prompt = this.buildScriptPrompt(concept, articles, panelCount);
    console.log('[generateComicScript] Script prompt length:', prompt.length);

    try {
      console.log('[generateComicScript] Calling Gemini API for script...');
      const response = await this.callGeminiApi(prompt);
      console.log('[generateComicScript] Received response from Gemini');

      console.log('[generateComicScript] Parsing script response...');
      const panels = this.parseScriptResponse(response);
      console.log('[generateComicScript] Parsed panels count:', panels.length);

      const script = {
        panels,
        description: `Comic script for: ${concept.title}`,
        generatedAt: Date.now(),
        newsContext: articles.map((a) => a.title).join('; '),
      };

      console.log('[generateComicScript] ✅ Comic script generated successfully');
      return script;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[generateComicScript] ❌ Comic script generation failed:', {
        message: errorMessage,
        stack: errorStack,
        error,
      });
      throw createCartoonError(
        'Failed to generate comic script',
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
    const cacheKey = this.buildImageCacheKey(concept);
    console.log('Cache key:', cacheKey);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('✅ Found cached image, returning from cache');
      return cached;
    }
    console.log('No cached image found, generating new one...');

    console.log('Generating comic script...');
    const script = await this.generateComicScript(concept, articles, panelCount);
    console.log('Comic script generated:', script);

    const prompt = this.buildImagePrompt(concept, script, panelCount);
    console.log('Image prompt length:', prompt.length, 'characters');

    try {
      console.log('Calling Vision API...');
      const response = await this.callVisionApi(prompt);
      console.log('Vision API response received');

      console.log('Parsing image response...');
      const imageData = this.parseImageResponse(response);
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
      this.setCache(cacheKey, cartoonImage);
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

  private buildImageCacheKey(concept: CartoonConcept): string {
    return `image_${concept.title.replace(/\s+/g, '_').toLowerCase()}`;
  }

  private getFromCache(key: string): CartoonImage | null {
    const entry = this.imageCache.get(key);
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION_MS;
    if (isExpired) {
      this.imageCache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: CartoonImage): void {
    this.imageCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearImageCache(): void {
    this.imageCache.clear();
  }

  private buildImagePrompt(concept: CartoonConcept, script: ComicScript, panelCount: number = 4): string {
    const script_section = `
COMIC STRIP SCRIPT (follow this structure):
${script.panels.join('\n')}

Follow this script precisely to ensure visual coherence and proper humor delivery.
`;

    const panelDescription = panelCount === 1
      ? 'IMPORTANT: Create a SINGLE PANEL political cartoon. Do NOT create multiple panels.'
      : `IMPORTANT: Create a ${panelCount}-panel comic strip laid out horizontally in a row.`;

    return `Create a professional newspaper comic strip cartoon image in editorial style:

Title: "${concept.title}"
Concept: ${concept.premise}
Setting: ${concept.location}
${script_section}

${panelDescription}

TEXT RENDERING REQUIREMENTS (CRITICAL FOR SPELLING ACCURACY):
- If any text appears in the cartoon (titles, captions, speech bubbles), spell it EXACTLY as written above
- Use clear, bold, sans-serif fonts (similar to Helvetica or Arial style)
- Make text large and well-spaced for maximum legibility
- Avoid stylized, decorative, or script fonts that could introduce spelling errors
- Ensure all text is readable at a glance
- Double-check spelling of all words that appear as text in the image
- If space is limited, simplify text rather than distort spellings

Art style requirements:
- Clean, precise line art with sharp details
- Professional newspaper cartoon quality
- Expressive, well-defined characters
- Clever visual humor and wit
- Clear visual storytelling
- Bright, vibrant but balanced colors
- Polished, contemporary cartoon style
- Professional editorial cartoon aesthetics

The cartoon should be:
- Easily readable and understandable at a glance
- Visually appealing and humorous
- Appropriate for all ages
- Similar quality to professional newspaper editorial cartoons

Focus on visual comedy, clever visual puns, and clear communication of the concept. Emulate the sharp wit and visual sophistication of professional editorial cartoons.
`;
  }

  private async callVisionApi(
    prompt: string,
    retryCount = 0
  ): Promise<GeminiResponse> {
    console.log(`[callVisionApi] Starting API call (retry ${retryCount}/${MAX_RETRIES})`);

    if (!this.apiKey) {
      console.error('[callVisionApi] No API key configured');
      throw createCartoonError(
        'Gemini API key not configured. Set VITE_GOOGLE_API_KEY environment variable.'
      );
    }

    console.log('[callVisionApi] API key present, length:', this.apiKey.length);
    console.log('[callVisionApi] Using Vision URL:', this.visionBaseUrl);

    // Configure for image generation with response modalities
    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    };

    console.log('[callVisionApi] Request config:', {
      url: this.visionBaseUrl,
      hasApiKey: !!this.apiKey,
      promptLength: prompt.length,
      responseModalities: request.generationConfig?.responseModalities,
    });

    try {
      console.log('[callVisionApi] Sending POST request to Gemini API...');
      const response = await fetch(this.visionBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      console.log('[callVisionApi] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
          console.log(`[callVisionApi] Rate limited, retrying in ${delay}ms...`);
          await this.sleep(delay);
          return this.callVisionApi(prompt, retryCount + 1);
        }

        const errorText = await response.text();
        console.error('[callVisionApi] API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      console.log('[callVisionApi] Parsing JSON response...');
      const data = (await response.json()) as GeminiResponse;

      console.log('[callVisionApi] Response structure:', {
        hasCandidates: !!data.candidates,
        candidatesCount: data.candidates?.length || 0,
        hasError: !!data.error,
      });

      if (data.error) {
        console.error('[callVisionApi] API returned error:', data.error);
        throw new Error(`API Error: ${data.error.message}`);
      }

      console.log('[callVisionApi] API call successful');
      return data;
    } catch (error) {
      console.error(`[callVisionApi] Error during API call:`, error);

      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`[callVisionApi] Retrying after error, delay: ${delay}ms`);
        await this.sleep(delay);
        return this.callVisionApi(prompt, retryCount + 1);
      }

      console.error('[callVisionApi] Max retries exceeded, throwing error');
      throw error;
    }
  }

  private parseImageResponse(response: GeminiResponse): string {
    console.log('[parseImageResponse] Starting response parsing...');

    // Extract image data from Gemini Image Generation API response
    // The response structure is: candidates[0].content.parts[0].inlineData.data
    // which contains base64 encoded image data

    console.log('[parseImageResponse] Response structure check:', {
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length || 0,
    });

    if (!response.candidates || response.candidates.length === 0) {
      console.error('[parseImageResponse] No candidates in response');
      throw createCartoonError('No candidates in API response');
    }

    const candidate = response.candidates[0];
    console.log('[parseImageResponse] Candidate structure:', {
      hasContent: !!candidate.content,
      hasParts: !!candidate.content?.parts,
      partsLength: candidate.content?.parts?.length || 0,
    });

    const part = candidate.content?.parts?.[0];
    if (!part) {
      console.error('[parseImageResponse] No parts in candidate content');
      throw createCartoonError('No parts in API response candidate');
    }

    console.log('[parseImageResponse] Part type check:', {
      hasInlineData: 'inlineData' in part,
      hasText: 'text' in part,
      partKeys: Object.keys(part),
    });

    // Check for inlineData (image generation response)
    if (part && 'inlineData' in part && part.inlineData) {
      console.log('[parseImageResponse] Found inlineData:', {
        hasMimeType: !!part.inlineData.mimeType,
        mimeType: part.inlineData.mimeType,
        hasData: !!part.inlineData.data,
        dataLength: part.inlineData.data?.length || 0,
        dataPreview: part.inlineData.data?.substring(0, 50) + '...',
      });

      if (part.inlineData.data) {
        console.log('[parseImageResponse] ✅ Successfully extracted image data');
        return part.inlineData.data;
      } else {
        console.error('[parseImageResponse] inlineData exists but data field is empty');
        throw createCartoonError('Image data field is empty in API response');
      }
    }

    // Fallback to text field for debugging
    if (part && 'text' in part && part.text) {
      console.warn('[parseImageResponse] ⚠️ Received text instead of image data:', {
        textLength: part.text.length,
        textPreview: part.text.substring(0, 200),
      });
      throw createCartoonError('API returned text description instead of image. Ensure you are using an image generation model.');
    }

    // Log the actual response structure for debugging
    console.error('[parseImageResponse] ❌ Unexpected response structure:', JSON.stringify(response, null, 2));
    throw createCartoonError('Could not extract image data from API response');
  }

  private buildConceptPrompt(articles: NewsArticle[], location: string): string {
    const headlines = articles
      .map((a) => {
        const desc = a.description || '';
        return `- ${a.title}\n  ${desc}`;
      })
      .join('\n');

    return `You are a brilliant editorial cartoonist creating professional newspaper-style cartoons.

Based on news headlines from ${location}:

${headlines}

Generate 5 cartoon concepts. Each should have title, premise, and why_funny.
Return only valid JSON array.`;
  }

  private buildScriptPrompt(
    concept: CartoonConcept,
    articles: NewsArticle[],
    panelCount: number = 4
  ): string {
    const news_section = articles.length > 0 ? `
ACTUAL NEWS STORY CONTEXT (ground your humor in these real details):
${articles.map(a => a.title).join('\n')}

Your comic strip should reference or play off these actual news story details to make the humor more relevant and grounded in reality.
` : '';

    const panelDescription = panelCount === 1
      ? 'a single panel political cartoon'
      : `a ${panelCount}-panel comic strip`;

    return `Create a detailed comic strip script for this cartoon concept:

Title: ${concept.title}
Concept: ${concept.premise}
Setting: ${concept.location}
${news_section}

Write ${panelDescription} with:
1. Panel descriptions (what visually appears in each panel)
2. Character positions and expressions
3. Dialogue or speech bubbles (if applicable)
4. Visual gags or details that make it funny
5. Color notes and visual emphasis
6. Key visual elements that should be prominent

Format as a structured script that clearly shows the visual progression and humor.
Make it detailed enough for an artist to visualize and draw the complete comic strip.

If you have news context above, incorporate specific details from that story to make the humor more grounded and relevant.
`;
  }

  private async callGeminiApi(
    prompt: string,
    retryCount = 0
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      throw createCartoonError(
        'Gemini API key not configured. Set VITE_GOOGLE_API_KEY environment variable.'
      );
    }

    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
          return this.callGeminiApi(prompt, retryCount + 1);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GeminiResponse;

      if (data.error) {
        throw new Error(`API Error: ${data.error.message}`);
      }

      return data;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await this.sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
        return this.callGeminiApi(prompt, retryCount + 1);
      }

      throw error;
    }
  }

  private parseConceptResponse(response: GeminiResponse, location: string): CartoonConcept[] {
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw createCartoonError('Could not parse cartoon concepts from API response');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        title?: string;
        premise?: string;
        why_funny?: string;
      }>;

      return parsed.map((concept) => ({
        title: concept.title || 'Untitled',
        premise: concept.premise || 'A cartoon concept',
        why_funny: concept.why_funny || 'Political commentary',
        location,
      }));
    } catch (error) {
      throw createCartoonError(
        'Failed to parse cartoon concepts JSON',
        { parseError: String(error) }
      );
    }
  }

  private parseScriptResponse(response: GeminiResponse): string[] {
    console.log('[parseScriptResponse] Starting to parse script response...');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[parseScriptResponse] Response text length:', text.length);
    console.log('[parseScriptResponse] Response text preview:', text.substring(0, 500));

    // First, try to parse as JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('[parseScriptResponse] Found JSON match, attempting JSON parse...');
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          panels?: Array<{
            description?: string;
          }>;
        };

        console.log('[parseScriptResponse] Parsed JSON successfully:', {
          hasPanels: !!parsed.panels,
          panelsCount: parsed.panels?.length || 0,
        });

        if (parsed.panels && Array.isArray(parsed.panels) && parsed.panels.length > 0) {
          const panels = parsed.panels
            .map((p) => p.description || 'Visual description goes here')
            .slice(0, 4);

          console.log('[parseScriptResponse] Successfully extracted panels from JSON:', panels.length);
          return panels;
        }
      } catch (error) {
        console.warn('[parseScriptResponse] JSON parse failed, trying markdown format:', error);
      }
    }

    // Fallback to markdown format parsing
    console.log('[parseScriptResponse] Attempting to parse as markdown format...');

    // Match panel sections in markdown format
    // Pattern: **Panel N** followed by bullet points
    const panelRegex = /\*\*Panel\s+\d+\*\*[\s\S]*?(?=\*\*Panel\s+\d+\*\*|$)/gi;
    const panelMatches = text.match(panelRegex);

    if (panelMatches && panelMatches.length > 0) {
      console.log('[parseScriptResponse] Found', panelMatches.length, 'markdown panels');

      const panels = panelMatches.map(panelText => {
        // Extract all the bullet point content from this panel
        const lines = panelText.split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('*') && !line.startsWith('**Panel'))
          .map(line => line.replace(/^\*\s*/, '').replace(/\*\*(.+?)\*\*:?\s*/g, '$1: '))
          .filter(line => line.length > 0);

        return lines.join(' ');
      }).filter(panel => panel.length > 0);

      if (panels.length > 0) {
        console.log('[parseScriptResponse] Successfully extracted', panels.length, 'panels from markdown');
        console.log('[parseScriptResponse] Panel previews:', panels.map(p => p.substring(0, 100)));
        return panels.slice(0, 4);
      }
    }

    // Final fallback: look for simple "Panel" lines
    console.warn('[parseScriptResponse] Markdown parsing failed, using simple line fallback');
    const panelLines = text.split('\n').filter(line => line.trim().startsWith('Panel'));
    if (panelLines.length > 0) {
      console.log('[parseScriptResponse] Found', panelLines.length, 'simple panel lines');
      return panelLines.slice(0, 4);
    }

    // Ultimate fallback
    console.error('[parseScriptResponse] All parsing methods failed, using default panels');
    return [
      'Panel 1: Opening scene introducing the situation',
      'Panel 2: Building tension with character reaction',
      'Panel 3: Escalating the conflict',
      'Panel 4: The punchline reveals the commentary',
    ];
  }

  async generateHumorScore(title: string, description?: string): Promise<number> {
    const prompt = `Rate this news article's potential for a funny editorial cartoon on a scale of 1-100.

Title: ${title}
${description ? `Description: ${description}` : ''}

Consider:
- Absurdity, irony, or contradiction
- Visual comedy potential
- Political/social satire opportunities
- Exaggeration possibilities

Respond with ONLY a number between 1 and 100, nothing else.`;

    try {
      const response = await this.callGeminiApi(prompt);
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
      const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

      console.log(`[batchAnalyzeArticles] Processing batch ${batchNumber}/${totalBatches} (articles ${i+1}-${Math.min(i+BATCH_SIZE, articles.length)})`);

      const prompt = `You are an expert editorial cartoonist analyzing news articles for their cartoon potential.

Analyze these ${batch.length} news articles and for each one provide:
1. A 1-2 paragraph summary highlighting the key satirical angle and comedic elements that would make it funny as a cartoon
2. A humor score from 1-100 based on cartoon potential (absurdity, irony, visual comedy, satire opportunities)

Articles:
${batch.map((article, idx) => `
Article ${idx + 1}:
Title: ${article.title}
Description: ${article.description || 'No description'}
${article.content ? `Content excerpt: ${article.content.substring(0, 300)}...` : ''}
`).join('\n---\n')}

Respond ONLY with a valid JSON array with EXACTLY ${batch.length} entries (one for each article above), in this format:
[
  {"summary": "The satirical angle here is...", "humorScore": 75},
  {"summary": "This story offers comedic potential because...", "humorScore": 82}${batch.length > 2 ? ',\n  {"summary": "...", "humorScore": 65}' : ''}
]`;

      try {
        const response = await this.callGeminiApi(prompt);
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        console.log(`[batchAnalyzeArticles] Batch ${batchNumber} response preview:`, responseText.substring(0, 150));

        // Clean the response text - remove markdown code block markers if present
        let cleanedResponse = responseText;
        if (responseText.includes('```json')) {
          cleanedResponse = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        } else if (responseText.includes('```')) {
          cleanedResponse = responseText.replace(/```\s*/g, '');
        }

        // Extract JSON from response - look for array pattern
        const jsonMatch = cleanedResponse.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) {
          console.error(`[batchAnalyzeArticles] Batch ${batchNumber}: No JSON array found in response`);
          // Add fallback for this batch
          batch.forEach(() => results.push({ summary: '', humorScore: 50 }));
          continue;
        }

        let batchResults: Array<{ summary: string; humorScore: number }>;
        try {
          // Clean up the matched JSON string - handle trailing commas more thoroughly
          const jsonStr = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1')  // Remove all trailing commas before } or ]
            .replace(/[\n\r]+/g, ' '); // Replace newlines with spaces

          batchResults = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error(`[batchAnalyzeArticles] Batch ${batchNumber}: Failed to parse JSON`, parseError);
          console.log(`[batchAnalyzeArticles] Attempted to parse:`, jsonMatch[0].substring(0, 200));
          batch.forEach(() => results.push({ summary: '', humorScore: 50 }));
          continue;
        }

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
          await this.sleep(1000);
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const geminiService = new GeminiService();

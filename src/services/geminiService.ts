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
      const panels = this.parseScriptResponse(response, panelCount);
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

    // Log extracted text elements for debugging
    const textElements = this.extractTextElements(script);
    console.log('[Text Extraction] Found text elements:', textElements.length);
    textElements.forEach(elem => {
      console.log(`  Panel ${elem.panel} (${elem.type}): "${elem.text}" [${this.spellOutText(elem.text)}]`);
    });

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

  /**
   * Extract and format text elements from comic script panels
   */
  private extractTextElements(script: ComicScript): Array<{ panel: number; text: string; type: string }> {
    const textElements: Array<{ panel: number; text: string; type: string }> = [];

    script.panels.forEach((panel, index) => {
      // Check if panel is a string
      const panelText = typeof panel === 'string' ? panel : panel.description;

      // Extract text in quotes or dialogue
      const quotedText = panelText.match(/"([^"]+)"/g) || [];
      quotedText.forEach((text: string) => {
        const cleaned = text.replace(/"/g, '').toUpperCase().trim();
        if (cleaned && cleaned.split(' ').length <= 4) { // Limit to 4 words max
          textElements.push({
            panel: index + 1,
            text: cleaned,
            type: 'dialogue'
          });
        }
      });

      // Extract sign/label text (words like "sign:", "label:", "text:" followed by content)
      const labelMatch = panelText.match(/\b(?:sign|label|text|caption):\s*([^,.!?]+)/gi) || [];
      labelMatch.forEach((match: string) => {
        const text = match.split(':')[1]?.trim().toUpperCase();
        if (text && text.split(' ').length <= 3) {
          textElements.push({
            panel: index + 1,
            text,
            type: 'label'
          });
        }
      });
    });

    return textElements;
  }

  /**
   * Create character-by-character spelling for critical text
   */
  private spellOutText(text: string): string {
    return text.split('').join('-');
  }


  private buildImagePrompt(concept: CartoonConcept, script: ComicScript, panelCount: number = 4): string {
    // Extract all text elements from the script
    const textElements = this.extractTextElements(script);

    // Build text manifest with spelling
    const textManifest = textElements.length > 0 ? `
=== EXACT TEXT TO RENDER (CRITICAL - FOLLOW PRECISELY) ===
${textElements.map(elem =>
  `Panel ${elem.panel} ${elem.type}: "${elem.text}" [spelled: ${this.spellOutText(elem.text)}]`
).join('\n')}

IMPORTANT: These are the ONLY text elements that should appear. Render each EXACTLY as shown above.
===================================
` : '';

    const script_section = `
VISUAL SCRIPT STRUCTURE:
${script.panels.map((panel, i) => `Panel ${i + 1}: ${panel}`).join('\n')}
`;

    const panelDescription = panelCount === 1
      ? 'FORMAT: Single panel editorial cartoon (ONE panel only, no divisions)'
      : `FORMAT: ${panelCount}-panel comic strip in horizontal layout`;

    // Triple-redundancy prompt structure
    return `${textManifest}

CARTOON GENERATION INSTRUCTIONS:

${panelDescription}

Title Concept: "${concept.title}"
Core Premise: ${concept.premise}
Setting: ${concept.location}

${script_section}

=== TEXT ACCURACY RULES (MANDATORY) ===
1. ONLY include text explicitly listed in the TEXT MANIFEST above
2. Spell every word EXACTLY as shown - no variations
3. Use BOLD, SIMPLE, SANS-SERIF fonts only (like Impact or Arial Black)
4. Make all text LARGE and CLEAR - no small text
5. Maximum 3-4 words per speech bubble or sign
6. If you cannot fit text clearly, use fewer words rather than distorting spelling
7. ALL CAPS for all text elements
8. No cursive, script, or decorative fonts
9. Each letter must be distinct and separate
10. Double-check: Every word must match the TEXT MANIFEST spelling exactly
===================================

VISUAL STYLE REQUIREMENTS:
- Clean, sharp line art with clear details
- Professional editorial cartoon quality
- Expressive character faces and body language
- Visual humor through expressions and situations
- Bright, newspaper-appropriate colors
- Clear visual flow and composition
- Focus on visual storytelling over text

${textElements.length > 0 ? `
=== TEXT VERIFICATION CHECKLIST ===
Confirm each text element appears EXACTLY as specified:
${textElements.map(elem => `☐ Panel ${elem.panel}: "${elem.text}"`).join('\n')}
===================================
` : ''}

REMEMBER: Text accuracy is the #1 priority. Every word must be spelled EXACTLY as provided in the TEXT MANIFEST section above.`;
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

    // Log full response structure for debugging
    console.log('[parseImageResponse] Full response structure:', JSON.stringify(response, null, 2));

    // Extract image data from Gemini Image Generation API response
    // The response structure varies based on the model and generation config

    console.log('[parseImageResponse] Response structure check:', {
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length || 0,
    });

    if (!response.candidates || response.candidates.length === 0) {
      console.error('[parseImageResponse] No candidates in response');
      throw createCartoonError('No candidates in API response');
    }

    const candidate = response.candidates[0];

    // First check if candidate itself has the inline data (some API versions)
    // Using unknown type to handle API response variations safely
    const candidateExtended = candidate as typeof candidate & {
      inlineData?: { data?: string; mimeType?: string };
      parts?: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    };

    if ('inlineData' in candidateExtended && candidateExtended.inlineData) {
      console.log('[parseImageResponse] Found inlineData directly in candidate');
      const data = candidateExtended.inlineData.data;
      if (data) {
        console.log('[parseImageResponse] ✅ Successfully extracted image data from candidate');
        return data;
      }
    }

    // Check standard structure: candidate.content.parts[0]
    console.log('[parseImageResponse] Candidate structure:', {
      hasContent: !!candidate.content,
      hasParts: !!candidate.content?.parts,
      partsLength: candidate.content?.parts?.length || 0,
      candidateKeys: Object.keys(candidate),
    });

    // If no content, check if there's a direct parts array
    const parts = candidate.content?.parts || candidateExtended.parts || [];

    if (parts.length === 0) {
      console.error('[parseImageResponse] No parts found in candidate');
      console.error('[parseImageResponse] Candidate keys:', Object.keys(candidate));
      console.error('[parseImageResponse] Full candidate:', JSON.stringify(candidate, null, 2));
      throw createCartoonError('No parts in API response candidate');
    }

    const part = parts[0];
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
    console.error('[parseImageResponse] ❌ Unexpected response structure');
    console.error('[parseImageResponse] Full response:', JSON.stringify(response, null, 2));
    throw createCartoonError('Could not extract image data from API response. Check console for full response structure.');
  }

  private buildConceptPrompt(articles: NewsArticle[], location: string): string {
    const headlines = articles
      .map((a) => {
        const desc = a.description || '';
        return `- ${a.title}\n  ${desc}`;
      })
      .join('\n');

    return `You are a brilliant editorial cartoonist specializing in VISUAL humor and sharp satire.

NEWS HEADLINES from ${location}:
${headlines}

COMEDY TECHNIQUE INSTRUCTIONS:
Generate 5 cartoon concepts using DIFFERENT comedy techniques from this list:

1. VISUAL PUN: Transform a key element into its literal visual representation
2. ROLE REVERSAL: Swap expected positions (e.g., computers interviewing humans for jobs)
3. EXAGGERATION: Take one aspect to absurd extremes (e.g., tiny problem shown as mountain)
4. JUXTAPOSITION: Place contrasting elements side by side for ironic effect
5. ANTHROPOMORPHISM: Give human traits to objects/concepts involved in the story
6. ANACHRONISM: Show modern problem in historical setting or vice versa
7. PERSPECTIVE SHIFT: Show from POV of unexpected character (the road's view of traffic)
8. SCALE INVERSION: Make important things tiny, trivial things enormous

REQUIREMENTS FOR EACH CONCEPT:
- Must be funny WITHOUT dialogue (visual gag primary)
- Should make viewers think "I never looked at it that way"
- Include specific visual details that enhance the humor
- Focus on IRONY and ABSURDITY, not just illustration
- Make it work as a SILENT film scene

AVOID:
- Concepts that require text to be funny
- Direct illustration without twist
- Offensive stereotypes
- Purely verbal puns

Generate exactly 5 concepts as JSON array with these fields:
- title: Catchy name for the cartoon
- premise: VISUAL description of what viewers will SEE (not read)
- why_funny: The comedic technique used and why it creates humor

Focus on SHOWING the absurdity, not telling it.`;
  }

  private buildScriptPrompt(
    concept: CartoonConcept,
    articles: NewsArticle[],
    panelCount: number = 4
  ): string {
    const news_section = articles.length > 0 ? `
NEWS CONTEXT:
${articles.map(a => a.title).join('\n')}
` : '';

    const panelDescription = panelCount === 1
      ? 'a single panel political cartoon'
      : `a ${panelCount}-panel comic strip`;

    return `Create a comic strip script with EXACTLY ${panelCount} panel${panelCount === 1 ? '' : 's'}:

Title: ${concept.title}
Concept: ${concept.premise}
Setting: ${concept.location}
${news_section}

IMPORTANT: Generate EXACTLY ${panelCount} panel${panelCount === 1 ? '' : 's'} - no more, no less.

CRITICAL TEXT RULES:
- Maximum 2 text elements per panel (speech bubble, sign, caption)
- Maximum 3 words per text element
- Use SIMPLE, COMMON words only
- Prefer visual humor over verbal jokes
- If dialogue needed, keep it SHORT and CLEAR
- Avoid puns that require exact spelling
- Focus on VISUAL storytelling

Write ${panelDescription} with:
1. Visual description of what appears in each panel
2. Character actions and expressions (focus on VISUAL humor)
3. Any text (keep MINIMAL - format as: "text here" for dialogue or Sign: TEXT for labels)
4. Visual gags that work WITHOUT text
5. Clear visual progression

${this.getExampleFormat(panelCount)}

Remember: LESS TEXT = BETTER. Focus on VISUAL comedy. Maximum 3 words per text element!`;
  }

  private getExampleFormat(panelCount: number): string {
    const examples: Record<number, string> = {
      1: `EXAMPLE FORMAT (1 panel):
Panel 1: A massive computer server shaped like a bird flying south. Sign: "MELBOURNE". Confused kangaroos watching from below.`,

      2: `EXAMPLE FORMAT (2 panels):
Panel 1: Politician at podium looking confident. Sign: "TRUST ME"
Panel 2: Same politician tangled in his own red tape. Caption: OOPS`,

      3: `EXAMPLE FORMAT (3 panels):
Panel 1: Tech CEO showing tiny phone. "REVOLUTIONARY!"
Panel 2: Phone grows enormous in user's hands
Panel 3: User crushed under giant phone. Sign: HELP`,

      4: `EXAMPLE FORMAT (4 panels):
Panel 1: A politician at podium looking confused. Sign: "VOTE NOW"
Panel 2: Politician holds up chart upside down. "IT WORKS!"
Panel 3: Crowd facepalming. One person says: "REALLY?"
Panel 4: Politician shrugging with big smile. Caption: THE END`,

      5: `EXAMPLE FORMAT (5 panels):
Panel 1: Robot interviewing human. Sign: "JOBS"
Panel 2: Human sweating nervously
Panel 3: Robot checking "NOT COMPATIBLE"
Panel 4: Human looking dejected
Panel 5: Robot hiring another robot. "PERFECT!"`,

      6: `EXAMPLE FORMAT (6 panels):
Panel 1: Small problem appears (ant-sized)
Panel 2: Manager points at it dramatically
Panel 3: Problem grows slightly bigger
Panel 4: Emergency meeting called
Panel 5: Problem now building-sized
Panel 6: Everyone ignoring giant problem. "WHAT PROBLEM?"`
    };

    return examples[panelCount] || examples[4];
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

  private parseScriptResponse(response: GeminiResponse, expectedPanelCount: number = 4): string[] {
    console.log('[parseScriptResponse] Starting to parse script response...');
    console.log('[parseScriptResponse] Expected panel count:', expectedPanelCount);

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
            .slice(0, expectedPanelCount);

          console.log('[parseScriptResponse] Successfully extracted panels from JSON:', panels.length);
          return panels;
        }
      } catch (error) {
        console.warn('[parseScriptResponse] JSON parse failed, trying markdown format:', error);
      }
    }

    // Improved markdown parsing for various Panel formats
    console.log('[parseScriptResponse] Attempting to parse panel sections...');

    const panels: string[] = [];

    // Try multiple panel detection patterns
    // Pattern 1: **Panel N:** or **Panel N**
    // Pattern 2: Panel N: (without asterisks)
    // Pattern 3: Panel 1 (without colon)
    const panelSplitRegex = /(?:^|\n)(?:\*\*)?Panel\s+\d+(?:\*\*)?:?\s*/gmi;
    const panelSections = text.split(panelSplitRegex).filter(s => s.trim().length > 0);

    if (panelSections.length > 0) {
      console.log('[parseScriptResponse] Found', panelSections.length, 'panel sections');

      // For each section, combine all content until the next panel marker
      panelSections.forEach((section, index) => {
        if (index >= expectedPanelCount) return; // Max panels based on user selection

        // Clean up the section text
        const panelContent = section
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            // Remove bullet points if present
            if (line.startsWith('*')) {
              line = line.replace(/^\*+\s*/, '');
            }
            // Remove bold markdown
            line = line.replace(/\*\*(.+?)\*\*/g, '$1');
            return line;
          })
          .join(' ');

        if (panelContent.length > 0) {
          panels.push(panelContent);
          console.log(`[parseScriptResponse] Panel ${index + 1} content:`, panelContent.substring(0, 100));
        }
      });
    }

    if (panels.length > 0) {
      console.log('[parseScriptResponse] Successfully extracted', panels.length, 'panels');
      return panels.slice(0, expectedPanelCount);
    }

    // Fallback: Extract any structured content that looks like panel descriptions
    console.warn('[parseScriptResponse] Panel parsing failed, trying line-by-line extraction');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Look for lines that describe visual content
    const visualLines = lines.filter(line =>
      line.includes('Visual:') ||
      line.includes('Characters:') ||
      line.includes('Text:') ||
      line.includes('Action:') ||
      line.includes('Scene:')
    );

    if (visualLines.length > 0) {
      console.log('[parseScriptResponse] Found', visualLines.length, 'visual description lines');
      // Group them into panels (assuming equal distribution)
      const panelSize = Math.ceil(visualLines.length / expectedPanelCount);
      for (let i = 0; i < Math.min(expectedPanelCount, Math.ceil(visualLines.length / panelSize)); i++) {
        const panelLines = visualLines.slice(i * panelSize, (i + 1) * panelSize);
        panels.push(panelLines.join(' '));
      }
      return panels;
    }

    // Default panels if parsing fails
    console.error('[parseScriptResponse] All parsing methods failed, using default panels');
    const defaultPanels = [
      'A scene showing the main concept with visual humor',
      'Characters reacting to the situation',
      'The conflict or tension escalates',
      'The punchline or resolution with editorial commentary',
      'Additional development of the humor',
      'Final twist or concluding visual gag',
    ];
    return defaultPanels.slice(0, expectedPanelCount);
  }

  async generateHumorScore(title: string, description?: string): Promise<number> {
    const prompt = `You are a comedy analyst evaluating news for editorial cartoon potential.

Title: ${title}
${description ? `Description: ${description}` : ''}

Score this on multiple humor dimensions (0-20 each):

1. ABSURDITY: How bizarre/unexpected is this situation?
2. IRONY: Is there contradiction between expectation and reality?
3. VISUAL POTENTIAL: Can this be shown without words?
4. RELATABILITY: Will everyday people find this familiar yet silly?
5. BENIGN VIOLATION: Is it wrong but ultimately harmless?

Add the scores for a total out of 100.

Consider these comedy goldmines:
- Human incompetence in positions of power
- Technology failing in ironic ways
- Animals/objects behaving like humans
- Bureaucracy taken to absurd extremes
- Modern problems that would confuse ancestors
- David vs Goliath situations
- "First world problems" taken seriously

Respond with ONLY the total number (1-100).`;

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

import type { NewsArticle } from '../types/news';
import type { CartoonConcept, CartoonData, ComicScript, CartoonImage, ComicScriptPanel, ComicPanel } from '../types/cartoon';
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
    console.log('Panel count being used for image generation:', panelCount);

    // Extract and validate text elements before building prompt
    const textElements = this.extractTextElements(script);
    this.validateTextElements(textElements);

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

  /**
   * Extract and format text elements from comic script panels
   * Handles both new ComicScriptPanel format and legacy string format
   */
  private extractTextElements(script: ComicScript): Array<{ panel: number; text: string; type: string }> {
    const textElements: Array<{ panel: number; text: string; type: string }> = [];

    script.panels.forEach((panel, index) => {
      const panelNum = index + 1;

      // Handle new ComicScriptPanel format with explicit visibleText
      if (panel && typeof panel === 'object' && 'visibleText' in panel) {
        const scriptPanel = panel as ComicScriptPanel;
        if (Array.isArray(scriptPanel.visibleText)) {
          scriptPanel.visibleText.forEach((textElem) => {
            if (textElem.content && textElem.content.trim()) {
              const cleaned = textElem.content.trim().toUpperCase();
              if (cleaned.split(' ').length <= 4) {
                textElements.push({
                  panel: panelNum,
                  text: cleaned,
                  type: textElem.type || 'sign',
                });
                console.log(`[extractTextElements] Panel ${panelNum}: Found text from ${textElem.type}: "${cleaned}"`);
              }
            }
          });
        }
      } else {
        // Handle legacy string format
        const panelText = typeof panel === 'string' ? panel : (panel as ComicPanel)?.description || '';

        // Extract text in quotes or dialogue
        const quotedText = panelText.match(/"([^"]+)"/g) || [];
        quotedText.forEach((text: string) => {
          const cleaned = text.replace(/"/g, '').toUpperCase().trim();
          if (cleaned && cleaned.split(' ').length <= 4) {
            textElements.push({
              panel: panelNum,
              text: cleaned,
              type: 'dialogue',
            });
          }
        });

        // Extract sign/label text (words like "sign:", "label:", "text:" followed by content)
        const labelMatch = panelText.match(/\b(?:sign|label|text|caption):\s*([^,.!?]+)/gi) || [];
        labelMatch.forEach((match: string) => {
          const text = match.split(':')[1]?.trim().toUpperCase();
          if (text && text.split(' ').length <= 3) {
            textElements.push({
              panel: panelNum,
              text,
              type: 'label',
            });
          }
        });
      }
    });

    console.log('[extractTextElements] Extracted', textElements.length, 'text elements total');
    return textElements;
  }

  /**
   * Validate text elements before sending to vision API
   * Ensures all text is properly formatted and within limits
   */
  private validateTextElements(textElements: Array<{ panel: number; text: string; type: string }>): void {
    console.log('[validateTextElements] Validating', textElements.length, 'text elements');

    const issues: string[] = [];

    textElements.forEach((elem) => {
      // Check if text is empty
      if (!elem.text || elem.text.trim().length === 0) {
        issues.push(`Panel ${elem.panel}: Empty text element`);
        return;
      }

      // Check word count (max 4 words)
      const wordCount = elem.text.split(/\s+/).length;
      if (wordCount > 4) {
        issues.push(`Panel ${elem.panel}: Text exceeds 4 words ("${elem.text}" = ${wordCount} words)`);
      }

      // Check if text is all caps
      if (elem.text !== elem.text.toUpperCase()) {
        console.warn(`[validateTextElements] Panel ${elem.panel}: Text not in ALL CAPS: "${elem.text}"`);
      }

      // Warn about special characters that might render poorly
      if (/[^\w\s\-'!?.]/.test(elem.text)) {
        console.warn(`[validateTextElements] Panel ${elem.panel}: Contains special characters: "${elem.text}"`);
      }
    });

    // Log validation results
    if (issues.length === 0) {
      console.log('[validateTextElements] ✅ All text elements valid');
    } else {
      console.warn('[validateTextElements] ⚠️ Issues found:');
      issues.forEach(issue => console.warn(`  - ${issue}`));
    }
  }

  private buildImagePrompt(concept: CartoonConcept, script: ComicScript, panelCount: number = 4): string {
    // Extract all text elements from the script
    const textElements = this.extractTextElements(script);

    // Validate text before building prompt
    console.log('[buildImagePrompt] Building image prompt with', textElements.length, 'text elements');
    textElements.forEach(elem => {
      console.log(`  - Panel ${elem.panel}: "${elem.text}" (${elem.type})`);
    });

    // Build text manifest with letter-by-letter spelling format
    const textManifest = textElements.length > 0 ? `
TEXT TO RENDER IN IMAGE:
${textElements.map(elem => {
  const spelled = this.spellOutTextWithBrackets(elem.text);
  return `Panel ${elem.panel} (${elem.type}): [${spelled}]`;
}).join('\n')}
` : '';

    const panelDescription = panelCount === 1
      ? 'Single panel editorial cartoon'
      : `${panelCount}-panel comic strip (horizontal layout)`;

    // Simplified, clear prompt structure
    return `Generate a cartoon image: ${panelDescription}

CONCEPT:
Title: ${concept.title}
Premise: ${concept.premise}
Location: ${concept.location}

VISUAL DESCRIPTION:
${script.panels.map((panel, i) => {
  if (typeof panel === 'string') return `Panel ${i + 1}: ${panel}`;
  if ('visualDescription' in panel) return `Panel ${i + 1}: ${(panel as ComicScriptPanel).visualDescription}`;
  return `Panel ${i + 1}: ${(panel as ComicPanel).description || 'Visual scene'}`;
}).join('\n')}

${textManifest}
TEXT RENDERING RULES:
1. ONLY text shown above should appear in the image
2. Each letter must be CLEAR and READABLE
3. Use BOLD, SANS-SERIF font (like Impact or Arial Black)
4. Text must be ALL CAPS
5. Make text LARGE and PROMINENT
6. Maximum 3 words per text element
7. If text doesn't fit clearly, use fewer words

VISUAL STYLE:
- Professional editorial cartoon quality
- Sharp, clean line art
- Expressive character faces and body language
- Bright, newspaper-appropriate colors
- Visual humor through situations, not just text
- Clear visual flow and composition

TEXT VERIFICATION: Render EXACTLY as shown in text list above. Every word must match perfectly.`;
  }

  /**
   * Create bracket-formatted spelling: "HELLO" -> "[H] [E] [L] [L] [O]"
   */
  private spellOutTextWithBrackets(text: string): string {
    return text.split('').map(char => `[${char}]`).join(' ');
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

    return `Create a comic strip script with EXACTLY ${panelCount} panel${panelCount === 1 ? '' : 's'}.

Title: ${concept.title}
Concept: ${concept.premise}
Setting: ${concept.location}
${news_section}

RESPOND WITH VALID JSON ONLY. No markdown, no explanation. Pure JSON array.

Format each panel as a JSON object with these EXACT fields:
{
  "panelNumber": 1,
  "visualDescription": "What the viewer SEES (no dialogue, just visual details)",
  "visibleText": [
    {"type": "sign", "content": "TEXT ON SIGN"},
    {"type": "dialogue", "content": "DIALOGUE"}
  ],
  "characters": ["list", "of", "characters"],
  "setting": "Where this takes place"
}

CRITICAL RULES:
1. EXACTLY ${panelCount} panel(s) - no more, no less
2. Maximum 3 words per text element (dialogue, sign, caption)
3. ONLY text in "visibleText" array will be rendered - nothing else
4. Keep visualDescription SHORT and VISUAL-FOCUSED (2-3 sentences max)
5. Use SIMPLE, COMMON words only
6. ALL TEXT MUST BE IN ALL CAPS

EXAMPLE FOR ${panelCount} PANEL${panelCount === 1 ? '' : 'S'}:
${this.getExampleScriptJson(panelCount)}

Generate the JSON array now:`;
  }

  private getExampleScriptJson(panelCount: number): string {
    const examples: Record<number, string> = {
      1: `[
  {
    "panelNumber": 1,
    "visualDescription": "A massive computer server shaped like a bird flying south for winter. Confused kangaroos watch from below.",
    "visibleText": [{"type": "sign", "content": "MELBOURNE"}],
    "characters": ["kangaroos", "server"],
    "setting": "Australian outback"
  }
]`,

      2: `[
  {
    "panelNumber": 1,
    "visualDescription": "Politician standing at podium, looking very confident and proud.",
    "visibleText": [{"type": "sign", "content": "TRUST ME"}],
    "characters": ["politician"],
    "setting": "podium stage"
  },
  {
    "panelNumber": 2,
    "visualDescription": "Same politician now tangled completely in red tape, struggling.",
    "visibleText": [{"type": "caption", "content": "OOPS"}],
    "characters": ["politician"],
    "setting": "same stage"
  }
]`,

      3: `[
  {
    "panelNumber": 1,
    "visualDescription": "Tech CEO proudly showing off a tiny phone to audience.",
    "visibleText": [{"type": "dialogue", "content": "REVOLUTIONARY!"}],
    "characters": ["CEO", "audience"],
    "setting": "product launch stage"
  },
  {
    "panelNumber": 2,
    "visualDescription": "Same phone growing impossibly larger in the CEO's hands.",
    "visibleText": [],
    "characters": ["CEO"],
    "setting": "stage"
  },
  {
    "panelNumber": 3,
    "visualDescription": "User completely crushed under the now-giant phone.",
    "visibleText": [{"type": "sign", "content": "HELP"}],
    "characters": ["user"],
    "setting": "street"
  }
]`,

      4: `[
  {
    "panelNumber": 1,
    "visualDescription": "Politician at podium looking very confused.",
    "visibleText": [{"type": "sign", "content": "VOTE NOW"}],
    "characters": ["politician"],
    "setting": "podium"
  },
  {
    "panelNumber": 2,
    "visualDescription": "Politician holds up a chart but it's completely upside down.",
    "visibleText": [{"type": "dialogue", "content": "IT WORKS!"}],
    "characters": ["politician"],
    "setting": "podium"
  },
  {
    "panelNumber": 3,
    "visualDescription": "Crowd facepalming in disbelief.",
    "visibleText": [{"type": "dialogue", "content": "REALLY?"}],
    "characters": ["crowd"],
    "setting": "audience area"
  },
  {
    "panelNumber": 4,
    "visualDescription": "Politician shrugging happily, completely oblivious.",
    "visibleText": [{"type": "caption", "content": "THE END"}],
    "characters": ["politician"],
    "setting": "podium"
  }
]`,

      5: `[
  {"panelNumber": 1, "visualDescription": "Robot interviewing nervous human at desk.", "visibleText": [{"type": "sign", "content": "JOBS"}], "characters": ["robot", "human"], "setting": "office"},
  {"panelNumber": 2, "visualDescription": "Human sweating nervously under intense robot stare.", "visibleText": [], "characters": ["robot", "human"], "setting": "office"},
  {"panelNumber": 3, "visualDescription": "Robot clipboard shows large red X mark.", "visibleText": [{"type": "sign", "content": "NOT QUALIFIED"}], "characters": ["robot", "human"], "setting": "office"},
  {"panelNumber": 4, "visualDescription": "Human looking dejected, shoulders slumped.", "visibleText": [], "characters": ["human"], "setting": "office"},
  {"panelNumber": 5, "visualDescription": "Robot shaking hands with another identical robot.", "visibleText": [{"type": "dialogue", "content": "PERFECT!"}], "characters": ["robot1", "robot2"], "setting": "office"}
]`,

      6: `[
  {"panelNumber": 1, "visualDescription": "Tiny problem appears (ant-sized) in office.", "visibleText": [], "characters": [], "setting": "office"},
  {"panelNumber": 2, "visualDescription": "Manager points at small problem dramatically.", "visibleText": [], "characters": ["manager"], "setting": "office"},
  {"panelNumber": 3, "visualDescription": "Problem grows to size of a cat.", "visibleText": [], "characters": ["manager"], "setting": "office"},
  {"panelNumber": 4, "visualDescription": "Emergency meeting called, people in panic.", "visibleText": [{"type": "sign", "content": "EMERGENCY"}], "characters": ["team"], "setting": "meeting room"},
  {"panelNumber": 5, "visualDescription": "Problem now massive, building-sized.", "visibleText": [], "characters": [], "setting": "office building"},
  {"panelNumber": 6, "visualDescription": "Everyone ignoring the giant problem casually.", "visibleText": [{"type": "caption", "content": "WHAT PROBLEM?"}], "characters": ["people"], "setting": "office"}
]`,
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

  private parseScriptResponse(response: GeminiResponse, expectedPanelCount: number = 4): ComicScriptPanel[] {
    console.log('[parseScriptResponse] Starting to parse new JSON script format...');
    console.log('[parseScriptResponse] Expected panel count:', expectedPanelCount);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[parseScriptResponse] Response text length:', text.length);
    console.log('[parseScriptResponse] Response text preview:', text.substring(0, 500));

    // Try to parse as JSON array (new format)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      console.log('[parseScriptResponse] Found JSON array, parsing new format...');
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          panelNumber?: number;
          visualDescription?: string;
          visibleText?: Array<{ type: string; content: string }>;
          characters?: string[];
          setting?: string;
        }>;

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('[parseScriptResponse] Successfully parsed JSON array with', parsed.length, 'panels');

          const panels: ComicScriptPanel[] = parsed.slice(0, expectedPanelCount).map((panel, index) => {
            console.log(`[parseScriptResponse] Panel ${index + 1}:`, {
              hasVisualDescription: !!panel.visualDescription,
              textElementCount: panel.visibleText?.length || 0,
            });

            const visibleText = Array.isArray(panel.visibleText)
              ? panel.visibleText.map(v => ({
                  type: (v.type as 'dialogue' | 'sign' | 'caption' | 'label') || 'sign',
                  content: v.content || '',
                }))
              : [];

            return {
              panelNumber: panel.panelNumber || index + 1,
              visualDescription: panel.visualDescription || 'Visual description goes here',
              visibleText,
              characters: Array.isArray(panel.characters) ? panel.characters : [],
              setting: panel.setting || 'Scene',
            };
          });

          console.log('[parseScriptResponse] Successfully extracted', panels.length, 'panels with structured data');
          return panels;
        }
      } catch (error) {
        console.warn('[parseScriptResponse] JSON parsing failed:', error);
      }
    }

    // Fallback: Create default panels if parsing completely fails
    console.warn('[parseScriptResponse] Could not parse JSON, using default panels');
    const defaultPanels: ComicScriptPanel[] = [];
    for (let i = 1; i <= expectedPanelCount; i++) {
      defaultPanels.push({
        panelNumber: i,
        visualDescription: `Panel ${i}: A scene showing the cartoon concept with visual humor`,
        visibleText: [],
        characters: [],
        setting: 'Scene',
      });
    }
    return defaultPanels;
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

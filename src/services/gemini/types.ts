import type { CartoonImage } from '../../types/cartoon';

export interface GeminiGenerationConfig {
    responseModalities?: string[];
    responseMimeType?: string;
    aspectRatio?: string;
    temperature?: number;
}

export interface GenerateArticle {
    title: string;
    description?: string;
    content?: string;
}

export type GeneratePanel =
    | string
    | {
          panelNumber?: number;
          newsContext?: string;
          visualDescription?: string;
          description?: string;
          setting?: string;
          visibleText?: Array<{ content: string; type?: 'dialogue' | 'sign' | 'caption' | 'label' }>;
          characters?: string[];
      };

/**
 * Body of POST /api/gemini/generate. The server owns the prompt text and
 * generationConfig; see api/_shared/generateRequest.js for the contract.
 */
export type GenerateRequest =
    | { task: 'concepts'; articles: GenerateArticle[]; location: string }
    | {
          task: 'comic-script';
          concept: { title: string; premise: string; why_funny?: string; location: string };
          articles: GenerateArticle[];
          panelCount?: number;
      }
    | {
          task: 'cartoon-image';
          concept: { title: string; premise: string; why_funny?: string; location: string };
          script: { panels: GeneratePanel[] };
          panelCount?: number;
      }
    | { task: 'humor-score'; title: string; description?: string }
    | { task: 'batch-analysis'; articles: GenerateArticle[] };

export interface GeminiRequest {
    contents: Array<{
        parts: Array<{
            text: string;
        }>;
    }>;
    generationConfig?: GeminiGenerationConfig;
}

export interface GeminiResponsePart {
    text?: string;
    /** Gemini 3 "thinking" models may emit reasoning parts flagged as thoughts. */
    thought?: boolean;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

export interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: GeminiResponsePart[];
        };
        finishReason?: string;
    }>;
    promptFeedback?: {
        blockReason?: string;
    };
    error?: {
        message: string;
        code?: number;
        status?: string;
    };
}

export interface ImageCacheEntry {
    data: CartoonImage;
    timestamp: number;
}

import type { CartoonImage } from '../../types/cartoon';

export interface GeminiGenerationConfig {
    responseModalities?: string[];
    responseMimeType?: string;
    aspectRatio?: string;
    temperature?: number;
}

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

import type { CartoonImage } from '../../types/cartoon';

export interface GeminiRequest {
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

export interface GeminiResponse {
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

export interface ImageCacheEntry {
    data: CartoonImage;
    timestamp: number;
}

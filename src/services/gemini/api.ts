import { createCartoonError } from '../../types/error';
import type { GeminiRequest, GeminiResponse } from './types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
// Default to latest Google Generative Language models; override via env when needed
const TEXT_MODEL =
  import.meta.env.VITE_GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';
// "Nano Banana Pro" codename maps to Gemini 3 Pro Image preview model
const IMAGE_MODEL =
  import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent`;
const VISION_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export class GeminiApiClient {
    private apiKey: string;
    private baseUrl: string;
    private visionBaseUrl: string;

    constructor() {
        this.apiKey = API_KEY;
        this.baseUrl = BASE_URL;
        this.visionBaseUrl = VISION_BASE_URL;
    }

    async callApi(prompt: string, retryCount = 0): Promise<GeminiResponse> {
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
                    await sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
                    return this.callApi(prompt, retryCount + 1);
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
                await sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
                return this.callApi(prompt, retryCount + 1);
            }

            throw error;
        }
    }

    async callVisionApi(prompt: string, retryCount = 0): Promise<GeminiResponse> {
        console.log(`[callVisionApi] Starting API call (retry ${retryCount}/${MAX_RETRIES})`);

        if (!this.apiKey) {
            console.error('[callVisionApi] No API key configured');
            throw createCartoonError(
                'Gemini API key not configured. Set VITE_GOOGLE_API_KEY environment variable.'
            );
        }

        console.log('[callVisionApi] API key present, length:', this.apiKey.length);
        console.log('[callVisionApi] Using Vision URL:', this.visionBaseUrl);

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
                    await sleep(delay);
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
                await sleep(delay);
                return this.callVisionApi(prompt, retryCount + 1);
            }

            console.error('[callVisionApi] Max retries exceeded, throwing error');
            throw error;
        }
    }
}

import { createCartoonError } from '../../types/error';
import type { ICartoonError } from '../../types/error';
import { logger } from '../../utils/logger';
import type { GeminiGenerationConfig, GeminiRequest, GeminiResponse } from './types';

/**
 * Model candidates, tried in order. The first entry is the preferred model;
 * the rest are fallbacks used only when Google reports the model as not found
 * (404 / NOT_FOUND), which is what happens when a preview model is retired.
 *
 * Google retires preview models on a schedule (gemini-3-pro-preview was shut
 * down 2026-03-09, gemini-3-pro-image-preview on 2026-06-25), so a single
 * hardcoded model ID is a time bomb. Keep at least one stable (GA) model in
 * each list.
 */
export const DEFAULT_TEXT_MODELS = [
    'gemini-3.1-pro-preview',
    'gemini-3.8-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
];

export const DEFAULT_IMAGE_MODELS = [
    'gemini-3-pro-image',
    'gemini-3.1-flash-image',
    'gemini-2.5-flash-image',
];

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Parse a model list from an env override. Accepts a single model ID or a
 * comma-separated list. Falls back to the defaults when unset.
 */
export const resolveModelList = (envValue: string | undefined, defaults: string[]): string[] => {
    const fromEnv = (envValue || '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
    if (fromEnv.length === 0) return [...defaults];
    // Env override goes first; keep defaults as fallbacks (without duplicates).
    return [...fromEnv, ...defaults.filter((d) => !fromEnv.includes(d))];
};

export const buildModelUrl = (model: string): string => `${API_ROOT}/${model}:generateContent`;

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

type GeminiErrorBody = {
    error?: { message?: string; status?: string; code?: number };
};

const isAppError = (value: unknown): value is ICartoonError => {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof (value as ICartoonError).code === 'string' &&
        typeof (value as ICartoonError).message === 'string'
    );
};

/**
 * Build a user-presentable ICartoonError from a non-2xx Gemini response.
 * The Gemini error body is JSON: { error: { code, message, status } }.
 */
export const buildHttpError = (
    status: number,
    statusText: string,
    bodyText: string,
    model: string
): ICartoonError => {
    let apiMessage = '';
    let apiStatus = '';
    try {
        const body = JSON.parse(bodyText) as GeminiErrorBody;
        apiMessage = body.error?.message || '';
        apiStatus = body.error?.status || '';
    } catch {
        apiMessage = bodyText.slice(0, 300);
    }

    const modelNotFound = status === 404 || apiStatus === 'NOT_FOUND';
    let message: string;
    if (modelNotFound) {
        message = `Gemini model "${model}" is not available (it may have been retired). ${apiMessage}`.trim();
    } else if (status === 429 || apiStatus === 'RESOURCE_EXHAUSTED') {
        message = `Gemini API quota or rate limit exceeded. ${apiMessage}`.trim();
    } else if (status === 400 && /api key/i.test(apiMessage)) {
        message = `Gemini API key rejected. ${apiMessage}`.trim();
    } else if (status === 403 || apiStatus === 'PERMISSION_DENIED') {
        message = `Gemini API access denied. ${apiMessage}`.trim();
    } else {
        message = `Gemini API error ${status}${statusText ? ` ${statusText}` : ''}${apiMessage ? `: ${apiMessage}` : ''}`;
    }

    const error = createCartoonError(message, {
        statusCode: status,
        apiStatus,
        apiMessage,
        model,
        modelNotFound,
        userFacing: true,
    });
    error.statusCode = status;
    return error;
};

const isRetryableStatus = (status: number): boolean => {
    return status === 429 || status === 408 || (status >= 500 && status < 600);
};

export class GeminiApiClient {
    private apiKey: string;
    private textModels: string[];
    private imageModels: string[];

    constructor(options?: { apiKey?: string; textModels?: string[]; imageModels?: string[] }) {
        // Read env lazily (not at module load) so test setup and runtime
        // overrides applied after import are honoured.
        this.apiKey = options?.apiKey ?? (import.meta.env.VITE_GOOGLE_API_KEY || '');
        this.textModels =
            options?.textModels ??
            resolveModelList(import.meta.env.VITE_GEMINI_TEXT_MODEL, DEFAULT_TEXT_MODELS);
        this.imageModels =
            options?.imageModels ??
            resolveModelList(import.meta.env.VITE_GEMINI_IMAGE_MODEL, DEFAULT_IMAGE_MODELS);
    }

    /** The text model currently in use (first candidate that has not been ruled out). */
    get textModel(): string {
        return this.textModels[0];
    }

    /** The image model currently in use (first candidate that has not been ruled out). */
    get imageModel(): string {
        return this.imageModels[0];
    }

    async callApi(prompt: string, generationConfig?: GeminiGenerationConfig): Promise<GeminiResponse> {
        const request: GeminiRequest = {
            contents: [{ parts: [{ text: prompt }] }],
        };
        if (generationConfig) {
            request.generationConfig = generationConfig;
        }
        return this.generateWithFallback(this.textModels, request, 'callApi');
    }

    async callVisionApi(prompt: string): Promise<GeminiResponse> {
        const request: GeminiRequest = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseModalities: ['IMAGE'],
            },
        };
        logger.debug('[callVisionApi] Request config:', {
            models: this.imageModels,
            hasApiKey: !!this.apiKey,
            promptLength: prompt.length,
        });
        return this.generateWithFallback(this.imageModels, request, 'callVisionApi');
    }

    /**
     * Try each model in order. A model that Google reports as not found is
     * dropped from the list for the rest of the session so we don't pay the
     * 404 round-trip on every call. Any other error aborts immediately.
     */
    private async generateWithFallback(
        models: string[],
        request: GeminiRequest,
        tag: string
    ): Promise<GeminiResponse> {
        if (!this.apiKey) {
            throw createCartoonError(
                'Gemini API key not configured. Set VITE_GOOGLE_API_KEY environment variable.',
                { userFacing: true, code: 'GEMINI_API_KEY_MISSING' }
            );
        }

        let lastError: unknown = null;
        // Iterate over a snapshot; we mutate `models` as we rule candidates out.
        for (const model of [...models]) {
            try {
                return await this.generateWithRetry(model, request, tag);
            } catch (error) {
                lastError = error;
                const notFound = isAppError(error) && error.details?.modelNotFound === true;
                if (!notFound) {
                    throw error;
                }
                logger.warn(`[${tag}] Model "${model}" not available, trying next fallback`, {
                    remaining: models.filter((m) => m !== model),
                });
                if (models.length > 1) {
                    models.splice(models.indexOf(model), 1);
                }
            }
        }

        if (isAppError(lastError)) {
            throw lastError;
        }
        throw createCartoonError('No Gemini model available', {
            userFacing: true,
            originalError: String(lastError),
        });
    }

    private async generateWithRetry(
        model: string,
        request: GeminiRequest,
        tag: string,
        retryCount = 0
    ): Promise<GeminiResponse> {
        const url = buildModelUrl(model);
        logger.debug(`[${tag}] POST ${url} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify(request),
            });
        } catch (networkError) {
            // fetch() only rejects on network-level failures (offline, DNS, CORS).
            if (retryCount < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
                return this.generateWithRetry(model, request, tag, retryCount + 1);
            }
            throw createCartoonError(
                `Could not reach the Gemini API: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
                { userFacing: true, model }
            );
        }

        if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            if (isRetryableStatus(response.status) && retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
                logger.debug(`[${tag}] HTTP ${response.status} from ${model}, retrying in ${delay}ms`);
                await sleep(delay);
                return this.generateWithRetry(model, request, tag, retryCount + 1);
            }
            const error = buildHttpError(response.status, response.statusText, bodyText, model);
            logger.error(`[${tag}] Gemini API error:`, error);
            throw error;
        }

        const data = (await response.json()) as GeminiResponse;

        if (data.error) {
            throw createCartoonError(`Gemini API error: ${data.error.message}`, {
                userFacing: true,
                apiStatus: data.error.status,
                model,
            });
        }

        return data;
    }
}

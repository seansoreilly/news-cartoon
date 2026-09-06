import { createCartoonError } from '../../types/error';
import type { ICartoonError } from '../../types/error';
import { logger } from '../../utils/logger';
import type { GeminiGenerationConfig, GeminiResponse } from './types';

/**
 * Browser-side Gemini client.
 *
 * All Gemini traffic goes through our own backend (`/api/gemini/generate`,
 * implemented in `api/_shared/gemini.js` and served by both the Vercel
 * function and the Express dev server). The browser never holds the Google
 * API key, and model selection / fallback / retries live on the server so
 * they can change without a client rebuild.
 */

export const GEMINI_PROXY_PATH = '/gemini/generate';

const MAX_NETWORK_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Same convention as newsService: same-origin in prod, Express on 3001 in dev. */
export const resolveApiBaseUrl = (): string => {
    const configured = import.meta.env.VITE_API_BASE_URL;
    if (configured && configured.trim() !== '') {
        return configured.replace(/\/+$/, '');
    }
    return import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
};

export const buildProxyUrl = (baseUrl: string = resolveApiBaseUrl()): string =>
    `${baseUrl.replace(/\/+$/, '')}${GEMINI_PROXY_PATH}`;

type ProxyErrorBody = {
    error?: {
        message?: string;
        statusCode?: number;
        apiStatus?: string;
        model?: string;
        modelNotFound?: boolean;
        code?: string;
    };
};

/**
 * Turn a non-2xx proxy response into a user-facing ICartoonError. The proxy
 * returns { error: { message, statusCode, code, model, modelNotFound } };
 * anything else (e.g. a Vercel gateway timeout page) gets a generic message
 * that still carries the HTTP status.
 */
export const buildProxyError = (status: number, statusText: string, bodyText: string): ICartoonError => {
    let parsed: ProxyErrorBody['error'] | undefined;
    try {
        parsed = (JSON.parse(bodyText) as ProxyErrorBody).error;
    } catch {
        parsed = undefined;
    }

    let message: string;
    if (parsed?.message) {
        message = parsed.message;
    } else if (status === 504 || status === 502 || status === 503) {
        message = `The cartoon server timed out or is unavailable (HTTP ${status}). Please try again.`;
    } else {
        message = `Cartoon server error ${status}${statusText ? ` ${statusText}` : ''}`;
    }

    const error = createCartoonError(message, {
        userFacing: true,
        statusCode: status,
        code: parsed?.code,
        apiStatus: parsed?.apiStatus,
        model: parsed?.model,
        modelNotFound: parsed?.modelNotFound === true,
    });
    error.statusCode = status;
    return error;
};

export class GeminiApiClient {
    private proxyUrl: string;

    constructor(options?: { baseUrl?: string }) {
        this.proxyUrl = buildProxyUrl(options?.baseUrl ?? resolveApiBaseUrl());
    }

    get url(): string {
        return this.proxyUrl;
    }

    async callApi(prompt: string, generationConfig?: GeminiGenerationConfig): Promise<GeminiResponse> {
        return this.post({ kind: 'text', prompt, generationConfig }, 'callApi');
    }

    async callVisionApi(prompt: string): Promise<GeminiResponse> {
        logger.debug('[callVisionApi] Requesting image via proxy', { promptLength: prompt.length });
        return this.post({ kind: 'image', prompt }, 'callVisionApi');
    }

    private async post(
        body: { kind: 'text' | 'image'; prompt: string; generationConfig?: GeminiGenerationConfig },
        tag: string,
        retryCount = 0
    ): Promise<GeminiResponse> {
        logger.debug(`[${tag}] POST ${this.proxyUrl} (attempt ${retryCount + 1}/${MAX_NETWORK_RETRIES + 1})`);

        let response: Response;
        try {
            response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch (networkError) {
            // fetch() only rejects on network-level failures (offline, DNS, CORS).
            if (retryCount < MAX_NETWORK_RETRIES) {
                await sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
                return this.post(body, tag, retryCount + 1);
            }
            throw createCartoonError(
                `Could not reach the cartoon server: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
                { userFacing: true }
            );
        }

        if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            const error = buildProxyError(response.status, response.statusText, bodyText);
            logger.error(`[${tag}] Proxy error:`, error);
            throw error;
        }

        const data = (await response.json()) as GeminiResponse;
        if (data.error) {
            throw createCartoonError(`Gemini API error: ${data.error.message}`, {
                userFacing: true,
                apiStatus: data.error.status,
            });
        }
        return data;
    }
}

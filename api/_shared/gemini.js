/**
 * Server-side Gemini client shared by the Vercel function
 * (api/gemini/generate.js) and the Express dev server (dev-server.js).
 *
 * The browser never talks to Google directly: it POSTs a prompt to
 * /api/gemini/generate and this module forwards it with the server-held key.
 * That keeps the key out of the JS bundle and lets the model list change
 * without touching the client.
 *
 * Google retires preview models on a schedule (gemini-3-pro-preview was shut
 * down 2026-03-09, gemini-3-pro-image-preview on 2026-06-25), so each request
 * walks an ordered list of models and falls back to the next one when Google
 * reports the current one as not found. Keep at least one stable (GA) model
 * in each list.
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

const DEFAULT_API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const MAX_PROMPT_CHARS = 60_000;

// Only these generationConfig keys are forwarded from the browser.
const ALLOWED_GENERATION_CONFIG_KEYS = ['responseMimeType', 'temperature', 'aspectRatio'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse a model list from an env override. Accepts a single model ID or a
 * comma-separated list. Env models go first; defaults stay as fallbacks.
 */
export const resolveModelList = (envValue, defaults) => {
  const fromEnv = String(envValue || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  if (fromEnv.length === 0) return [...defaults];
  return [...fromEnv, ...defaults.filter((d) => !fromEnv.includes(d))];
};

export const buildModelUrl = (model, apiRoot = DEFAULT_API_ROOT) => `${apiRoot}/${model}:generateContent`;

/**
 * Error thrown for any upstream failure. Serialises to the JSON the client
 * expects: { error: { message, statusCode, apiStatus, model, modelNotFound, code } }.
 */
export class GeminiApiError extends Error {
  constructor(message, { statusCode = 500, apiStatus = '', apiMessage = '', model = '', modelNotFound = false, code = 'GEMINI_ERROR' } = {}) {
    super(message);
    this.name = 'GeminiApiError';
    this.statusCode = statusCode;
    this.apiStatus = apiStatus;
    this.apiMessage = apiMessage;
    this.model = model;
    this.modelNotFound = modelNotFound;
    this.code = code;
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        statusCode: this.statusCode,
        apiStatus: this.apiStatus,
        model: this.model,
        modelNotFound: this.modelNotFound,
        code: this.code,
      },
    };
  }
}

/**
 * Build a descriptive GeminiApiError from a non-2xx Gemini response.
 * The Gemini error body is JSON: { error: { code, message, status } }.
 */
export const buildHttpError = (status, statusText, bodyText, model) => {
  let apiMessage = '';
  let apiStatus = '';
  try {
    const body = JSON.parse(bodyText);
    apiMessage = body?.error?.message || '';
    apiStatus = body?.error?.status || '';
  } catch {
    apiMessage = String(bodyText || '').slice(0, 300);
  }

  const modelNotFound = status === 404 || apiStatus === 'NOT_FOUND';
  let message;
  let code = 'GEMINI_ERROR';
  if (modelNotFound) {
    message = `Gemini model "${model}" is not available (it may have been retired). ${apiMessage}`.trim();
    code = 'GEMINI_MODEL_NOT_FOUND';
  } else if (status === 429 || apiStatus === 'RESOURCE_EXHAUSTED') {
    message = `Gemini API quota or rate limit exceeded. ${apiMessage}`.trim();
    code = 'GEMINI_RATE_LIMIT';
  } else if (status === 400 && /api key/i.test(apiMessage)) {
    message = `Gemini API key rejected. ${apiMessage}`.trim();
    code = 'GEMINI_API_KEY_INVALID';
  } else if (status === 403 || apiStatus === 'PERMISSION_DENIED') {
    message = `Gemini API access denied. ${apiMessage}`.trim();
    code = 'GEMINI_ACCESS_DENIED';
  } else {
    message = `Gemini API error ${status}${statusText ? ` ${statusText}` : ''}${apiMessage ? `: ${apiMessage}` : ''}`;
  }

  return new GeminiApiError(message, { statusCode: status, apiStatus, apiMessage, model, modelNotFound, code });
};

const isRetryableStatus = (status) => status === 429 || status === 408 || (status >= 500 && status < 600);

/**
 * Create a client bound to one API key and model lists. Models that Google
 * reports as not found are dropped from the list for the life of the client
 * (i.e. the warm serverless instance / dev-server process).
 */
export const createGeminiClient = ({
  apiKey,
  textModels = DEFAULT_TEXT_MODELS,
  imageModels = DEFAULT_IMAGE_MODELS,
  apiRoot = DEFAULT_API_ROOT,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) => {
  const lists = { text: [...textModels], image: [...imageModels] };

  const generateWithRetry = async (model, request, tag, retryCount = 0) => {
    const url = buildModelUrl(model, apiRoot);
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(request),
      });
    } catch (networkError) {
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
        return generateWithRetry(model, request, tag, retryCount + 1);
      }
      throw new GeminiApiError(`Could not reach the Gemini API: ${networkError?.message || networkError}`, {
        statusCode: 502,
        model,
        code: 'GEMINI_UNREACHABLE',
      });
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      if (isRetryableStatus(response.status) && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        logger.warn(`[${tag}] HTTP ${response.status} from ${model}, retrying in ${delay}ms`);
        await sleep(delay);
        return generateWithRetry(model, request, tag, retryCount + 1);
      }
      throw buildHttpError(response.status, response.statusText, bodyText, model);
    }

    const data = await response.json();
    if (data?.error) {
      throw new GeminiApiError(`Gemini API error: ${data.error.message}`, {
        statusCode: 502,
        apiStatus: data.error.status || '',
        model,
      });
    }
    return data;
  };

  const generateWithFallback = async (kind, request, tag) => {
    if (!apiKey) {
      throw new GeminiApiError(
        'Gemini API key not configured on the server. Set GOOGLE_API_KEY (or VITE_GOOGLE_API_KEY) in the server environment.',
        { statusCode: 500, code: 'GEMINI_API_KEY_MISSING' }
      );
    }

    const models = lists[kind];
    let lastError = null;
    for (const model of [...models]) {
      try {
        const data = await generateWithRetry(model, request, tag);
        return { data, model };
      } catch (error) {
        lastError = error;
        if (!(error instanceof GeminiApiError) || !error.modelNotFound) {
          throw error;
        }
        logger.warn(`[${tag}] Model "${model}" not available, trying next fallback`);
        if (models.length > 1) {
          models.splice(models.indexOf(model), 1);
        }
      }
    }
    throw lastError || new GeminiApiError('No Gemini model available', { statusCode: 500 });
  };

  return {
    /** Current model lists (first entry is the one that will be tried next). */
    get textModels() { return [...lists.text]; },
    get imageModels() { return [...lists.image]; },

    /**
     * @param {{ kind: 'text'|'image', prompt: string, generationConfig?: object }} params
     * @returns {Promise<{ data: object, model: string }>}
     */
    async generate({ kind, prompt, generationConfig }) {
      const request = { contents: [{ parts: [{ text: prompt }] }] };
      if (kind === 'image') {
        request.generationConfig = { responseModalities: ['IMAGE'] };
        return generateWithFallback('image', request, 'gemini:image');
      }
      if (generationConfig && typeof generationConfig === 'object') {
        const safe = {};
        for (const key of ALLOWED_GENERATION_CONFIG_KEYS) {
          if (generationConfig[key] !== undefined) safe[key] = generationConfig[key];
        }
        if (Object.keys(safe).length > 0) request.generationConfig = safe;
      }
      return generateWithFallback('text', request, 'gemini:text');
    },
  };
};

/** Build a client from process.env. */
export const createGeminiClientFromEnv = (env = process.env, overrides = {}) =>
  createGeminiClient({
    apiKey: env.GOOGLE_API_KEY || env.GEMINI_API_KEY || env.VITE_GOOGLE_API_KEY || '',
    textModels: resolveModelList(env.GEMINI_TEXT_MODELS || env.VITE_GEMINI_TEXT_MODEL, DEFAULT_TEXT_MODELS),
    imageModels: resolveModelList(env.GEMINI_IMAGE_MODELS || env.VITE_GEMINI_IMAGE_MODEL, DEFAULT_IMAGE_MODELS),
    apiRoot: env.GEMINI_API_ROOT || DEFAULT_API_ROOT,
    ...overrides,
  });

/**
 * Validate the JSON body of a generate request.
 * @returns {{ ok: true, value: {kind, prompt, generationConfig} } | { ok: false, message: string }}
 */
export const validateGenerateBody = (body) => {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }
  const kind = body.kind === 'image' ? 'image' : body.kind === 'text' || body.kind === undefined ? 'text' : null;
  if (!kind) {
    return { ok: false, message: 'kind must be "text" or "image"' };
  }
  if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return { ok: false, message: 'prompt must be a non-empty string' };
  }
  if (body.prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, message: `prompt exceeds ${MAX_PROMPT_CHARS} characters` };
  }
  const generationConfig =
    body.generationConfig && typeof body.generationConfig === 'object' ? body.generationConfig : undefined;
  return { ok: true, value: { kind, prompt: body.prompt, generationConfig } };
};

// ---------------------------------------------------------------------------
// Simple per-IP rate limit. In-memory, so it is per warm instance on Vercel
// (best effort), but it stops a single client hammering the key.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map();

export const checkRateLimit = (ip, now = Date.now()) => {
  const key = ip || 'unknown';
  const bucket = rateBuckets.get(key) || [];
  const recent = bucket.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(key, recent);
    return { allowed: false, retryAfterMs: RATE_WINDOW_MS - (now - recent[0]) };
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  // Keep the map from growing without bound.
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return { allowed: true, retryAfterMs: 0 };
};

export const resetRateLimits = () => rateBuckets.clear();

const clientIp = (req) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
};

let defaultClient = null;
const getDefaultClient = () => {
  if (!defaultClient) defaultClient = createGeminiClientFromEnv();
  return defaultClient;
};

/** For tests: swap the client used by the request handler. */
export const setDefaultClient = (client) => {
  defaultClient = client;
};

/**
 * (req, res) handler shared by the Vercel function and Express.
 * Expects a parsed JSON body on req.body.
 */
export const handleGenerateRequest = async (req, res, client = getDefaultClient()) => {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: { message: 'Method not allowed', statusCode: 405, code: 'METHOD_NOT_ALLOWED' } });
    return;
  }

  const limit = checkRateLimit(clientIp(req));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
    res.status(429).json({
      error: {
        message: 'Too many requests. Please wait a moment and try again.',
        statusCode: 429,
        code: 'PROXY_RATE_LIMIT',
      },
    });
    return;
  }

  const validation = validateGenerateBody(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: { message: validation.message, statusCode: 400, code: 'BAD_REQUEST' } });
    return;
  }

  const { kind, prompt, generationConfig } = validation.value;
  const startedAt = Date.now();
  try {
    const { data, model } = await client.generate({ kind, prompt, generationConfig });
    console.log(`[gemini:${kind}] ok via ${model} in ${Date.now() - startedAt}ms`);
    res.setHeader('X-Gemini-Model', model);
    res.status(200).json(data);
  } catch (error) {
    if (error instanceof GeminiApiError) {
      console.error(`[gemini:${kind}] ${error.code} (${error.statusCode}) ${error.message}`);
      res.status(error.statusCode || 500).json(error.toJSON());
      return;
    }
    console.error(`[gemini:${kind}] unexpected error:`, error);
    res.status(500).json({
      error: { message: 'Unexpected server error while calling Gemini', statusCode: 500, code: 'GEMINI_ERROR' },
    });
  }
};

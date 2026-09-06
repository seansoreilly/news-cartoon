/**
 * Server-side gallery (Supabase) client shared by the Vercel function
 * (api/gallery/index.js) and the Express dev server (dev-server.js).
 *
 * The browser never talks to Supabase directly: it GETs /api/gallery to list
 * cartoons and POSTs /api/gallery to publish one. This module holds the
 * Supabase URL and key, so neither is bundled into the client, and it talks to
 * Supabase over its plain REST / Storage HTTP APIs with fetch (no SDK needed).
 */

const DEFAULT_BUCKET = 'cartoons';
const DEFAULT_TABLE = 'cartoons';
const MAX_ITEMS = 50;
// Vercel caps request bodies at 4.5 MB. Base64 inflates by 4/3, so 3 MB of
// decoded image keeps the request comfortably under that.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TITLE_CHARS = 200;
const MAX_URL_CHARS = 2000;
const MAX_SOURCE_CHARS = 200;

const NOT_CONFIGURED_MESSAGE =
  'The gallery is not set up on this server yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.';

const firstDefined = (...values) => values.find((v) => typeof v === 'string' && v.trim() !== '')?.trim();

/**
 * Error thrown for validation and upstream failures. Serialises to the JSON
 * the client expects: { error: { message, statusCode, code } }.
 */
export class GalleryApiError extends Error {
  constructor(message, { statusCode = 500, code = 'GALLERY_ERROR', upstreamStatus = 0 } = {}) {
    super(message);
    this.name = 'GalleryApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }

  toJSON() {
    return { error: { message: this.message, statusCode: this.statusCode, code: this.code } };
  }
}

/**
 * Read the Supabase settings from the environment. Several names are accepted
 * so the Vercel Supabase integration (SUPABASE_URL / SUPABASE_*_KEY) and the
 * legacy VITE_* names both work without a settings change.
 */
export const resolveGalleryConfig = (env = process.env) => {
  const url = firstDefined(env.SUPABASE_URL, env.VITE_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL);
  const key = firstDefined(
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SUPABASE_SECRET_KEY,
    env.SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_API_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return {
    url: url ? url.replace(/\/+$/, '') : undefined,
    key,
    bucket: firstDefined(env.SUPABASE_GALLERY_BUCKET) || DEFAULT_BUCKET,
    table: firstDefined(env.SUPABASE_GALLERY_TABLE) || DEFAULT_TABLE,
  };
};

const IMAGE_SIGNATURES = [
  { contentType: 'image/png', extension: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { contentType: 'image/jpeg', extension: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { contentType: 'image/webp', extension: 'webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, also: { at: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
];

const matchesAt = (buffer, offset, bytes) => bytes.every((b, i) => buffer[offset + i] === b);

/**
 * Decode a base64 image (with or without a data: URL prefix) and sniff its
 * type from the magic bytes. Throws GalleryApiError on anything unusable.
 */
export const decodeImage = (input) => {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new GalleryApiError('image must be a base64 string', { statusCode: 400, code: 'BAD_REQUEST' });
  }
  const commaIndex = input.indexOf(',');
  const base64 = (input.startsWith('data:') && commaIndex !== -1 ? input.slice(commaIndex + 1) : input).replace(/\s+/g, '');
  if (base64.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new GalleryApiError('image is not valid base64', { statusCode: 400, code: 'BAD_REQUEST' });
  }
  // Check the size before decoding so a huge payload fails cheaply.
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new GalleryApiError(
      `Image is too large to publish (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB)`,
      { statusCode: 413, code: 'GALLERY_IMAGE_TOO_LARGE' }
    );
  }
  const buffer = Buffer.from(base64, 'base64');
  const signature = IMAGE_SIGNATURES.find(
    (s) => matchesAt(buffer, s.offset || 0, s.bytes) && (!s.also || matchesAt(buffer, s.also.at, s.also.bytes))
  );
  if (!signature) {
    throw new GalleryApiError('image must be a PNG, JPEG or WebP', { statusCode: 400, code: 'BAD_REQUEST' });
  }
  return { buffer, contentType: signature.contentType, extension: signature.extension };
};

const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export const validatePublishBody = (body) => {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }
  const title = cleanText(body.title, MAX_TITLE_CHARS);
  if (title === '') {
    return { ok: false, message: 'title must be a non-empty string' };
  }
  if (typeof body.image !== 'string' || body.image.trim() === '') {
    return { ok: false, message: 'image must be a base64 string' };
  }
  const newsUrl = cleanText(body.newsUrl, MAX_URL_CHARS);
  if (newsUrl !== '' && !/^https?:\/\//i.test(newsUrl)) {
    return { ok: false, message: 'newsUrl must be an http(s) URL' };
  }
  const newsSource = cleanText(body.newsSource, MAX_SOURCE_CHARS);
  return { ok: true, value: { image: body.image, title, newsUrl, newsSource } };
};

const readErrorMessage = async (response) => {
  const text = await response.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    // Storage errors look like { statusCode, error, message }; PostgREST like { code, message, details, hint }.
    return json?.message || json?.error || json?.hint || text || response.statusText;
  } catch {
    return text || response.statusText;
  }
};

const upstreamError = async (response, action) => {
  const detail = await readErrorMessage(response);
  if (response.status === 401 || response.status === 403) {
    return new GalleryApiError(`Supabase rejected the server's key while trying to ${action}: ${detail}`, {
      statusCode: 502,
      code: 'GALLERY_ACCESS_DENIED',
      upstreamStatus: response.status,
    });
  }
  if (response.status === 404) {
    return new GalleryApiError(`Supabase could not find the gallery bucket or table while trying to ${action}: ${detail}`, {
      statusCode: 502,
      code: 'GALLERY_NOT_FOUND',
      upstreamStatus: response.status,
    });
  }
  return new GalleryApiError(`Supabase failed to ${action} (HTTP ${response.status}): ${detail}`, {
    statusCode: 502,
    code: 'GALLERY_UPSTREAM_ERROR',
    upstreamStatus: response.status,
  });
};

/**
 * Build a gallery client. `fetchImpl` and `logger` are injectable for tests.
 */
export const createGalleryClient = ({ url, key, bucket = DEFAULT_BUCKET, table = DEFAULT_TABLE, fetchImpl, logger = console } = {}) => {
  const configured = Boolean(url && key);
  const doFetch = (...args) => (fetchImpl || fetch)(...args);
  const authHeaders = () => ({ apikey: key, Authorization: `Bearer ${key}` });
  const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

  const publicUrl = (imagePath) => `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodePath(imagePath)}`;

  const assertConfigured = () => {
    if (!configured) {
      throw new GalleryApiError(NOT_CONFIGURED_MESSAGE, { statusCode: 503, code: 'GALLERY_NOT_CONFIGURED' });
    }
  };

  const withNetworkGuard = async (action, fn) => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof GalleryApiError) throw error;
      logger.error(`[gallery] network failure while trying to ${action}:`, error);
      throw new GalleryApiError(`Could not reach Supabase to ${action}`, { statusCode: 502, code: 'GALLERY_UNREACHABLE' });
    }
  };

  const list = async () => {
    assertConfigured();
    const query = new URLSearchParams({ select: '*', order: 'created_at.desc', limit: String(MAX_ITEMS) });
    const response = await withNetworkGuard('list cartoons', () =>
      doFetch(`${url}/rest/v1/${encodeURIComponent(table)}?${query}`, { method: 'GET', headers: { ...authHeaders(), Accept: 'application/json' } })
    );
    if (!response.ok) throw await upstreamError(response, 'list cartoons');
    const rows = await response.json();
    if (!Array.isArray(rows)) {
      throw new GalleryApiError('Supabase returned an unexpected gallery payload', { statusCode: 502, code: 'GALLERY_UPSTREAM_ERROR' });
    }
    return rows.map((row) => ({ ...row, public_url: row.image_path ? publicUrl(row.image_path) : undefined }));
  };

  const removeObject = async (imagePath) => {
    try {
      await doFetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
        method: 'DELETE',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [imagePath] }),
      });
    } catch (error) {
      logger.warn(`[gallery] could not clean up ${imagePath} after a failed insert:`, error);
    }
  };

  const publish = async ({ buffer, contentType, extension, title, newsUrl, newsSource }) => {
    assertConfigured();
    const imagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${extension}`;

    const uploadResponse = await withNetworkGuard('upload the image', () =>
      doFetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(imagePath)}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': contentType, 'x-upsert': 'false' },
        body: buffer,
      })
    );
    if (!uploadResponse.ok) throw await upstreamError(uploadResponse, 'upload the image');

    const record = {
      title,
      image_path: imagePath,
      news_url: newsUrl || null,
      news_source: newsSource || null,
    };
    const insertResponse = await withNetworkGuard('save the cartoon record', () =>
      doFetch(`${url}/rest/v1/${encodeURIComponent(table)}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json', Accept: 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify([record]),
      })
    ).catch(async (error) => {
      await removeObject(imagePath);
      throw error;
    });
    if (!insertResponse.ok) {
      const error = await upstreamError(insertResponse, 'save the cartoon record');
      await removeObject(imagePath);
      throw error;
    }
    const inserted = await insertResponse.json().catch(() => []);
    const row = Array.isArray(inserted) && inserted[0] ? inserted[0] : record;
    return { ...row, public_url: publicUrl(imagePath) };
  };

  return { configured, bucket, table, list, publish, publicUrl };
};

export const createGalleryClientFromEnv = (env = process.env, overrides = {}) =>
  createGalleryClient({ ...resolveGalleryConfig(env), ...overrides });

// ---------------------------------------------------------------------------
// Per-IP publish limit. In-memory, so best effort on Vercel, but it stops a
// single client filling the bucket.
// ---------------------------------------------------------------------------
const PUBLISH_WINDOW_MS = 60_000;
const PUBLISH_MAX_REQUESTS = 10;
const publishBuckets = new Map();

export const checkPublishRateLimit = (ip, now = Date.now()) => {
  const key = ip || 'unknown';
  const recent = (publishBuckets.get(key) || []).filter((t) => now - t < PUBLISH_WINDOW_MS);
  if (recent.length >= PUBLISH_MAX_REQUESTS) {
    publishBuckets.set(key, recent);
    return { allowed: false, retryAfterMs: PUBLISH_WINDOW_MS - (now - recent[0]) };
  }
  recent.push(now);
  publishBuckets.set(key, recent);
  if (publishBuckets.size > 5000) {
    for (const [k, v] of publishBuckets) {
      if (v.every((t) => now - t >= PUBLISH_WINDOW_MS)) publishBuckets.delete(k);
    }
  }
  return { allowed: true, retryAfterMs: 0 };
};

export const resetPublishRateLimits = () => publishBuckets.clear();

const clientIp = (req) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
};

let defaultClient = null;
const getDefaultClient = () => {
  if (!defaultClient) defaultClient = createGalleryClientFromEnv();
  return defaultClient;
};

/** For tests: swap the client used by the request handler. */
export const setDefaultGalleryClient = (client) => {
  defaultClient = client;
};

const sendError = (res, error) => {
  res.status(error.statusCode || 500).json(error.toJSON());
};

/**
 * (req, res) handler shared by the Vercel function and Express.
 * GET  /api/gallery  -> { items: GalleryItem[] }
 * POST /api/gallery  -> { success: true, item: GalleryItem }   body: { image, title, newsUrl?, newsSource? }
 * Errors: { error: { message, statusCode, code } } with the matching HTTP status.
 */
export const handleGalleryRequest = async (req, res, client = getDefaultClient()) => {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const items = await client.list();
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ items });
    } catch (error) {
      if (error instanceof GalleryApiError) {
        if (error.code !== 'GALLERY_NOT_CONFIGURED') console.error(`[gallery:list] ${error.code} (${error.statusCode}) ${error.message}`);
        sendError(res, error);
        return;
      }
      console.error('[gallery:list] unexpected error:', error);
      sendError(res, new GalleryApiError('Unexpected server error while loading the gallery', { statusCode: 500 }));
    }
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: { message: 'Method not allowed', statusCode: 405, code: 'METHOD_NOT_ALLOWED' } });
    return;
  }

  if (!client.configured) {
    sendError(res, new GalleryApiError(NOT_CONFIGURED_MESSAGE, { statusCode: 503, code: 'GALLERY_NOT_CONFIGURED' }));
    return;
  }

  const limit = checkPublishRateLimit(clientIp(req));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
    res.status(429).json({
      error: { message: 'Too many publishes. Please wait a moment and try again.', statusCode: 429, code: 'PROXY_RATE_LIMIT' },
    });
    return;
  }

  const validation = validatePublishBody(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: { message: validation.message, statusCode: 400, code: 'BAD_REQUEST' } });
    return;
  }

  const startedAt = Date.now();
  try {
    const { image, title, newsUrl, newsSource } = validation.value;
    const decoded = decodeImage(image);
    const item = await client.publish({ ...decoded, title, newsUrl, newsSource });
    console.log(`[gallery:publish] ok ${item.image_path} (${decoded.buffer.length} bytes) in ${Date.now() - startedAt}ms`);
    res.status(201).json({ success: true, item });
  } catch (error) {
    if (error instanceof GalleryApiError) {
      console.error(`[gallery:publish] ${error.code} (${error.statusCode}) ${error.message}`);
      sendError(res, error);
      return;
    }
    console.error('[gallery:publish] unexpected error:', error);
    sendError(res, new GalleryApiError('Unexpected server error while publishing to the gallery', { statusCode: 500 }));
  }
};

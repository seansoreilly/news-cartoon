import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createGalleryClient,
  createGalleryClientFromEnv,
  resolveGalleryConfig,
  decodeImage,
  validatePublishBody,
  checkPublishRateLimit,
  resetPublishRateLimits,
  handleGalleryRequest,
  GalleryApiError,
  MAX_IMAGE_BYTES,
} from '../gallery.js';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PNG_BASE64 = PNG_BYTES.toString('base64');
const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  });

const quietLogger = { warn: () => {}, error: () => {}, log: () => {} };

const makeRes = () => {
  const res = {
    statusCode: 0,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
};

describe('resolveGalleryConfig', () => {
  it('prefers the server-side names and strips trailing slashes', () => {
    const config = resolveGalleryConfig({
      SUPABASE_URL: 'https://abc.supabase.co/',
      VITE_SUPABASE_URL: 'https://legacy.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
      VITE_SUPABASE_ANON_KEY: 'anon',
    });
    expect(config.url).toBe('https://abc.supabase.co');
    expect(config.key).toBe('service');
    expect(config.bucket).toBe('cartoons');
    expect(config.table).toBe('cartoons');
  });

  it('falls back to the legacy VITE_* names and honours bucket/table overrides', () => {
    const config = resolveGalleryConfig({
      VITE_SUPABASE_URL: 'https://legacy.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon',
      SUPABASE_GALLERY_BUCKET: 'images',
      SUPABASE_GALLERY_TABLE: 'gallery',
    });
    expect(config).toEqual({ url: 'https://legacy.supabase.co', key: 'anon', bucket: 'images', table: 'gallery' });
  });

  it('reports not configured when nothing is set', () => {
    const client = createGalleryClientFromEnv({});
    expect(client.configured).toBe(false);
  });
});

describe('decodeImage', () => {
  it('accepts a PNG data URL and sniffs the type', () => {
    const decoded = decodeImage(PNG_DATA_URL);
    expect(decoded.contentType).toBe('image/png');
    expect(decoded.extension).toBe('png');
    expect(decoded.buffer.equals(PNG_BYTES)).toBe(true);
  });

  it('accepts raw base64 without a prefix', () => {
    expect(decodeImage(PNG_BASE64).contentType).toBe('image/png');
  });

  it('detects JPEG', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]).toString('base64');
    expect(decodeImage(jpeg)).toMatchObject({ contentType: 'image/jpeg', extension: 'jpg' });
  });

  it('rejects non-image bytes', () => {
    const text = Buffer.from('hello world').toString('base64');
    expect(() => decodeImage(text)).toThrow(GalleryApiError);
    expect(() => decodeImage(text)).toThrow(/PNG, JPEG or WebP/);
  });

  it('rejects invalid base64 and empty input', () => {
    expect(() => decodeImage('not base64!!')).toThrow(/valid base64/);
    expect(() => decodeImage('')).toThrow(/base64 string/);
    expect(() => decodeImage(undefined)).toThrow(/base64 string/);
  });

  it('rejects oversized images before decoding', () => {
    const huge = 'A'.repeat(Math.ceil((MAX_IMAGE_BYTES + 1024) * (4 / 3)));
    try {
      decodeImage(huge);
      throw new Error('expected to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(GalleryApiError);
      expect(error.code).toBe('GALLERY_IMAGE_TOO_LARGE');
      expect(error.statusCode).toBe(413);
    }
  });
});

describe('validatePublishBody', () => {
  it('accepts a valid body and trims text fields', () => {
    const result = validatePublishBody({
      image: PNG_DATA_URL,
      title: '  Big News  ',
      newsUrl: 'https://example.com/a',
      newsSource: ' Example ',
    });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ image: PNG_DATA_URL, title: 'Big News', newsUrl: 'https://example.com/a', newsSource: 'Example' });
  });

  it('rejects a missing title or image', () => {
    expect(validatePublishBody({ image: PNG_DATA_URL }).message).toMatch(/title/);
    expect(validatePublishBody({ title: 'x' }).message).toMatch(/image/);
    expect(validatePublishBody(null).message).toMatch(/JSON object/);
  });

  it('rejects a non-http news URL but allows it to be blank', () => {
    expect(validatePublishBody({ image: PNG_DATA_URL, title: 'x', newsUrl: 'javascript:alert(1)' }).message).toMatch(/http/);
    expect(validatePublishBody({ image: PNG_DATA_URL, title: 'x', newsUrl: '' }).ok).toBe(true);
  });

  it('truncates over-long titles', () => {
    const result = validatePublishBody({ image: PNG_DATA_URL, title: 'x'.repeat(500) });
    expect(result.value.title).toHaveLength(200);
  });
});

describe('gallery client', () => {
  let fetchImpl;
  let client;

  beforeEach(() => {
    fetchImpl = vi.fn();
    client = createGalleryClient({ url: 'https://abc.supabase.co', key: 'secret', fetchImpl, logger: quietLogger });
  });

  it('lists rows newest-first with computed public URLs and auth headers', async () => {
    fetchImpl.mockResolvedValueOnce(jsonResponse([{ id: '1', title: 'A', image_path: 'a b.png', created_at: 'now' }]));
    const items = await client.list();
    expect(items).toEqual([
      {
        id: '1',
        title: 'A',
        image_path: 'a b.png',
        created_at: 'now',
        public_url: 'https://abc.supabase.co/storage/v1/object/public/cartoons/a%20b.png',
      },
    ]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://abc.supabase.co/rest/v1/cartoons?select=*&order=created_at.desc&limit=50');
    expect(init.headers.apikey).toBe('secret');
    expect(init.headers.Authorization).toBe('Bearer secret');
  });

  it('uploads the image then inserts the row', async () => {
    fetchImpl
      .mockResolvedValueOnce(jsonResponse({ Key: 'cartoons/x.png' }))
      .mockResolvedValueOnce(jsonResponse([{ id: '9', title: 'T', image_path: 'ignored.png', created_at: 'now' }], 201));

    const item = await client.publish({
      buffer: PNG_BYTES,
      contentType: 'image/png',
      extension: 'png',
      title: 'T',
      newsUrl: 'https://example.com',
      newsSource: 'Example',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [uploadUrl, uploadInit] = fetchImpl.mock.calls[0];
    expect(uploadUrl).toMatch(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/cartoons\/\d+-[a-z0-9]+\.png$/);
    expect(uploadInit.method).toBe('POST');
    expect(uploadInit.headers['Content-Type']).toBe('image/png');
    expect(uploadInit.body).toBe(PNG_BYTES);

    const [insertUrl, insertInit] = fetchImpl.mock.calls[1];
    expect(insertUrl).toBe('https://abc.supabase.co/rest/v1/cartoons');
    const inserted = JSON.parse(insertInit.body)[0];
    expect(inserted.title).toBe('T');
    expect(inserted.news_url).toBe('https://example.com');
    expect(inserted.news_source).toBe('Example');
    expect(inserted.image_path).toMatch(/\.png$/);
    expect(insertInit.headers.Prefer).toBe('return=representation');

    expect(item.id).toBe('9');
    expect(item.public_url).toContain('/storage/v1/object/public/cartoons/');
  });

  it('maps a rejected key to GALLERY_ACCESS_DENIED with Supabase\'s message', async () => {
    fetchImpl.mockResolvedValueOnce(jsonResponse({ message: 'Invalid API key' }, 401));
    await expect(client.list()).rejects.toMatchObject({
      code: 'GALLERY_ACCESS_DENIED',
      statusCode: 502,
      message: expect.stringContaining('Invalid API key'),
    });
  });

  it('maps a missing bucket to GALLERY_NOT_FOUND and skips the insert', async () => {
    fetchImpl.mockResolvedValueOnce(jsonResponse({ statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' }, 404));
    await expect(
      client.publish({ buffer: PNG_BYTES, contentType: 'image/png', extension: 'png', title: 'T', newsUrl: '', newsSource: '' })
    ).rejects.toMatchObject({ code: 'GALLERY_NOT_FOUND', message: expect.stringContaining('Bucket not found') });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('cleans up the uploaded object when the insert fails', async () => {
    fetchImpl
      .mockResolvedValueOnce(jsonResponse({ Key: 'ok' }))
      .mockResolvedValueOnce(jsonResponse({ code: '42P01', message: 'relation "cartoons" does not exist' }, 404))
      .mockResolvedValueOnce(jsonResponse([]));
    await expect(
      client.publish({ buffer: PNG_BYTES, contentType: 'image/png', extension: 'png', title: 'T', newsUrl: '', newsSource: '' })
    ).rejects.toMatchObject({ code: 'GALLERY_NOT_FOUND' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const [deleteUrl, deleteInit] = fetchImpl.mock.calls[2];
    expect(deleteUrl).toBe('https://abc.supabase.co/storage/v1/object/cartoons');
    expect(deleteInit.method).toBe('DELETE');
    expect(JSON.parse(deleteInit.body).prefixes[0]).toMatch(/\.png$/);
  });

  it('turns a network failure into GALLERY_UNREACHABLE', async () => {
    fetchImpl.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(client.list()).rejects.toMatchObject({ code: 'GALLERY_UNREACHABLE', statusCode: 502 });
  });

  it('throws GALLERY_NOT_CONFIGURED when url/key are missing', async () => {
    const bare = createGalleryClient({ fetchImpl, logger: quietLogger });
    expect(bare.configured).toBe(false);
    await expect(bare.list()).rejects.toMatchObject({ code: 'GALLERY_NOT_CONFIGURED', statusCode: 503 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('checkPublishRateLimit', () => {
  beforeEach(() => resetPublishRateLimits());

  it('allows 10 publishes a minute per IP then blocks', () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) expect(checkPublishRateLimit('1.1.1.1', now + i).allowed).toBe(true);
    const blocked = checkPublishRateLimit('1.1.1.1', now + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(checkPublishRateLimit('2.2.2.2', now + 10).allowed).toBe(true);
    expect(checkPublishRateLimit('1.1.1.1', now + 60_001).allowed).toBe(true);
  });
});

describe('handleGalleryRequest', () => {
  beforeEach(() => resetPublishRateLimits());

  const configuredClient = (overrides = {}) => ({
    configured: true,
    list: vi.fn().mockResolvedValue([{ id: '1', title: 'A', image_path: 'a.png', public_url: 'https://x/a.png' }]),
    publish: vi.fn().mockResolvedValue({ id: '2', title: 'T', image_path: 'new.png', public_url: 'https://x/new.png' }),
    ...overrides,
  });

  it('returns items for GET', async () => {
    const res = makeRes();
    await handleGalleryRequest({ method: 'GET', headers: {} }, res, configuredClient());
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('returns 503 GALLERY_NOT_CONFIGURED for GET and POST when unconfigured', async () => {
    const client = createGalleryClient({ fetchImpl: vi.fn(), logger: quietLogger });
    const getRes = makeRes();
    await handleGalleryRequest({ method: 'GET', headers: {} }, getRes, client);
    expect(getRes.statusCode).toBe(503);
    expect(getRes.body.error.code).toBe('GALLERY_NOT_CONFIGURED');
    expect(getRes.body.error.message).toMatch(/SUPABASE_URL/);

    const postRes = makeRes();
    await handleGalleryRequest({ method: 'POST', headers: {}, body: { image: PNG_DATA_URL, title: 'T' } }, postRes, client);
    expect(postRes.statusCode).toBe(503);
    expect(postRes.body.error.code).toBe('GALLERY_NOT_CONFIGURED');
  });

  it('publishes a valid POST and returns 201 with the item', async () => {
    const client = configuredClient();
    const res = makeRes();
    await handleGalleryRequest(
      { method: 'POST', headers: {}, body: { image: PNG_DATA_URL, title: ' T ', newsUrl: 'https://e.com', newsSource: 'E' } },
      res,
      client
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, item: expect.objectContaining({ id: '2' }) });
    const arg = client.publish.mock.calls[0][0];
    expect(arg.title).toBe('T');
    expect(arg.contentType).toBe('image/png');
    expect(arg.buffer.equals(PNG_BYTES)).toBe(true);
  });

  it('rejects an invalid body with 400 and does not call publish', async () => {
    const client = configuredClient();
    const res = makeRes();
    await handleGalleryRequest({ method: 'POST', headers: {}, body: { title: 'T' } }, res, client);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(client.publish).not.toHaveBeenCalled();
  });

  it('rejects a non-image payload with 400', async () => {
    const client = configuredClient();
    const res = makeRes();
    const text = Buffer.from('hello').toString('base64');
    await handleGalleryRequest({ method: 'POST', headers: {}, body: { title: 'T', image: text } }, res, client);
    expect(res.statusCode).toBe(400);
    expect(client.publish).not.toHaveBeenCalled();
  });

  it('passes upstream GalleryApiError status and code through', async () => {
    const client = configuredClient({
      publish: vi.fn().mockRejectedValue(new GalleryApiError('bucket missing', { statusCode: 502, code: 'GALLERY_NOT_FOUND' })),
    });
    const res = makeRes();
    await handleGalleryRequest({ method: 'POST', headers: {}, body: { image: PNG_DATA_URL, title: 'T' } }, res, client);
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toEqual({ message: 'bucket missing', statusCode: 502, code: 'GALLERY_NOT_FOUND' });
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const client = configuredClient({ list: vi.fn().mockRejectedValue(new Error('boom')) });
    const res = makeRes();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await handleGalleryRequest({ method: 'GET', headers: {} }, res, client);
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).not.toContain('boom');
  });

  it('rate-limits publishes per IP', async () => {
    const client = configuredClient();
    const req = { method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: { image: PNG_DATA_URL, title: 'T' } };
    for (let i = 0; i < 10; i++) await handleGalleryRequest(req, makeRes(), client);
    const res = makeRes();
    await handleGalleryRequest(req, res, client);
    expect(res.statusCode).toBe(429);
    expect(res.body.error.code).toBe('PROXY_RATE_LIMIT');
    expect(res.headers['Retry-After']).toBeDefined();
  });

  it('answers OPTIONS with 204 and other methods with 405', async () => {
    const options = makeRes();
    await handleGalleryRequest({ method: 'OPTIONS', headers: {} }, options, configuredClient());
    expect(options.statusCode).toBe(204);

    const del = makeRes();
    await handleGalleryRequest({ method: 'DELETE', headers: {} }, del, configuredClient());
    expect(del.statusCode).toBe(405);
    expect(del.headers.Allow).toBe('GET, POST');
  });
});

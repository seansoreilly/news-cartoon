import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createGeminiClient,
  buildHttpError,
  buildModelUrl,
  resolveModelList,
  validateGenerateBody,
  checkRateLimit,
  resetRateLimits,
  handleGenerateRequest,
  GeminiApiError,
} from '../gemini.js';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  });

const okResponse = (text) =>
  jsonResponse({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });

const notFoundBody = (model) => ({
  error: {
    code: 404,
    message: `models/${model} is not found for API version v1beta, or is not supported for generateContent.`,
    status: 'NOT_FOUND',
  },
});

const quietLogger = { warn: () => {}, error: () => {}, log: () => {} };

describe('server Gemini client', () => {
  let fetchImpl;

  beforeEach(() => {
    fetchImpl = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const urlOfCall = (n) => String(fetchImpl.mock.calls[n][0]);

  it('sends the key in a header and the prompt in the Gemini request shape', async () => {
    const client = createGeminiClient({ apiKey: 'secret', textModels: ['m'], fetchImpl, logger: quietLogger });
    fetchImpl.mockResolvedValueOnce(okResponse('hi'));

    const { data, model } = await client.generate({ kind: 'text', prompt: 'p', generationConfig: { responseMimeType: 'application/json', responseModalities: ['IMAGE'] } });

    expect(model).toBe('m');
    expect(data.candidates[0].content.parts[0].text).toBe('hi');
    expect(urlOfCall(0)).toBe(buildModelUrl('m'));
    const init = fetchImpl.mock.calls[0][1];
    expect(init.headers['x-goog-api-key']).toBe('secret');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toBe('p');
    // Only allow-listed generationConfig keys are forwarded.
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json' });
  });

  it('falls back to the next model when the preferred model has been retired (404)', async () => {
    const client = createGeminiClient({ apiKey: 'k', textModels: ['retired', 'live'], fetchImpl, logger: quietLogger });
    fetchImpl.mockResolvedValueOnce(jsonResponse(notFoundBody('retired'), 404)).mockResolvedValueOnce(okResponse('hello'));

    const { model } = await client.generate({ kind: 'text', prompt: 'p' });

    expect(model).toBe('live');
    expect(urlOfCall(0)).toBe(buildModelUrl('retired'));
    expect(urlOfCall(1)).toBe(buildModelUrl('live'));
  });

  it('remembers a retired model and skips it on subsequent calls', async () => {
    const client = createGeminiClient({ apiKey: 'k', textModels: ['retired', 'live'], fetchImpl, logger: quietLogger });
    fetchImpl
      .mockResolvedValueOnce(jsonResponse(notFoundBody('retired'), 404))
      .mockResolvedValueOnce(okResponse('first'))
      .mockResolvedValueOnce(okResponse('second'));

    await client.generate({ kind: 'text', prompt: 'one' });
    await client.generate({ kind: 'text', prompt: 'two' });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(urlOfCall(2)).toBe(buildModelUrl('live'));
    expect(client.textModels[0]).toBe('live');
  });

  it('throws a descriptive GeminiApiError when every model is unavailable', async () => {
    const client = createGeminiClient({ apiKey: 'k', textModels: ['a', 'b'], fetchImpl, logger: quietLogger });
    fetchImpl.mockResolvedValueOnce(jsonResponse(notFoundBody('a'), 404)).mockResolvedValueOnce(jsonResponse(notFoundBody('b'), 404));

    await expect(client.generate({ kind: 'text', prompt: 'p' })).rejects.toMatchObject({
      statusCode: 404,
      modelNotFound: true,
      code: 'GEMINI_MODEL_NOT_FOUND',
      message: expect.stringContaining('Gemini model "b" is not available'),
    });
  });

  it('does not retry or fall back on a 400 (bad API key)', async () => {
    const client = createGeminiClient({ apiKey: 'bad', textModels: ['a', 'b'], fetchImpl, logger: quietLogger });
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }, 400)
    );

    await expect(client.generate({ kind: 'text', prompt: 'p' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'GEMINI_API_KEY_INVALID',
      message: expect.stringContaining('API key not valid'),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries 429 with backoff and succeeds', async () => {
    const client = createGeminiClient({ apiKey: 'k', textModels: ['a'], fetchImpl, logger: quietLogger });
    fetchImpl
      .mockResolvedValueOnce(jsonResponse({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429))
      .mockResolvedValueOnce(okResponse('ok'));

    const promise = client.generate({ kind: 'text', prompt: 'p' });
    await vi.runAllTimersAsync();
    const { data } = await promise;

    expect(data.candidates[0].content.parts[0].text).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up on persistent 429 after max retries', async () => {
    const client = createGeminiClient({ apiKey: 'k', textModels: ['a'], fetchImpl, logger: quietLogger });
    fetchImpl.mockResolvedValue(jsonResponse({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429));

    const promise = client.generate({ kind: 'text', prompt: 'p' });
    const assertion = expect(promise).rejects.toMatchObject({ statusCode: 429, code: 'GEMINI_RATE_LIMIT' });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries network failures and reports 502 when they persist', async () => {
    const client = createGeminiClient({ apiKey: 'k', textModels: ['a'], fetchImpl, logger: quietLogger });
    fetchImpl.mockRejectedValue(new TypeError('fetch failed'));

    const promise = client.generate({ kind: 'text', prompt: 'p' });
    const assertion = expect(promise).rejects.toMatchObject({ statusCode: 502, code: 'GEMINI_UNREACHABLE' });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('fails fast with GEMINI_API_KEY_MISSING when no key is configured', async () => {
    const client = createGeminiClient({ apiKey: '', textModels: ['a'], fetchImpl, logger: quietLogger });
    await expect(client.generate({ kind: 'text', prompt: 'p' })).rejects.toMatchObject({ code: 'GEMINI_API_KEY_MISSING', statusCode: 500 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('uses the image list and forces IMAGE modality for image requests', async () => {
    const client = createGeminiClient({ apiKey: 'k', imageModels: ['old-img', 'new-img'], fetchImpl, logger: quietLogger });
    fetchImpl
      .mockResolvedValueOnce(jsonResponse(notFoundBody('old-img'), 404))
      .mockResolvedValueOnce(jsonResponse({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abc' } }] } }] }));

    const { data, model } = await client.generate({ kind: 'image', prompt: 'draw', generationConfig: { responseMimeType: 'application/json' } });

    expect(model).toBe('new-img');
    const body = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(body.generationConfig).toEqual({ responseModalities: ['IMAGE'] });
    expect(data.candidates[0].content.parts[0].inlineData.data).toBe('abc');
  });

  it('honours a custom apiRoot', async () => {
    const client = createGeminiClient({ apiKey: 'k', textModels: ['m'], apiRoot: 'http://stub/v1beta/models', fetchImpl, logger: quietLogger });
    fetchImpl.mockResolvedValueOnce(okResponse('x'));
    await client.generate({ kind: 'text', prompt: 'p' });
    expect(urlOfCall(0)).toBe('http://stub/v1beta/models/m:generateContent');
  });
});

describe('resolveModelList', () => {
  it('returns defaults when env is empty', () => {
    expect(resolveModelList(undefined, ['a', 'b'])).toEqual(['a', 'b']);
    expect(resolveModelList('  ', ['a', 'b'])).toEqual(['a', 'b']);
  });
  it('puts env models first and keeps defaults as fallbacks', () => {
    expect(resolveModelList('x', ['a', 'b'])).toEqual(['x', 'a', 'b']);
    expect(resolveModelList('b, y', ['a', 'b'])).toEqual(['b', 'y', 'a']);
  });
});

describe('buildHttpError', () => {
  it('flags NOT_FOUND bodies as modelNotFound even with a non-404 status', () => {
    const err = buildHttpError(400, 'Bad Request', JSON.stringify({ error: { status: 'NOT_FOUND', message: 'nope' } }), 'm');
    expect(err).toBeInstanceOf(GeminiApiError);
    expect(err.modelNotFound).toBe(true);
    expect(err.toJSON().error.model).toBe('m');
  });
  it('handles non-JSON bodies', () => {
    const err = buildHttpError(502, 'Bad Gateway', '<html>oops</html>', 'm');
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain('502');
  });
});

describe('validateGenerateBody', () => {
  it('accepts text and image kinds and defaults kind to text', () => {
    expect(validateGenerateBody({ prompt: 'p' })).toEqual({ ok: true, value: { kind: 'text', prompt: 'p', generationConfig: undefined } });
    expect(validateGenerateBody({ kind: 'image', prompt: 'p' }).value.kind).toBe('image');
  });
  it('rejects bad input', () => {
    expect(validateGenerateBody(null).ok).toBe(false);
    expect(validateGenerateBody({ kind: 'audio', prompt: 'p' }).ok).toBe(false);
    expect(validateGenerateBody({ prompt: '' }).ok).toBe(false);
    expect(validateGenerateBody({ prompt: 'x'.repeat(60_001) }).ok).toBe(false);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits());
  it('allows 30 requests per minute per IP then blocks', () => {
    const now = 1_000_000;
    for (let i = 0; i < 30; i++) expect(checkRateLimit('1.1.1.1', now + i).allowed).toBe(true);
    const blocked = checkRateLimit('1.1.1.1', now + 31);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(checkRateLimit('2.2.2.2', now + 31).allowed).toBe(true);
    expect(checkRateLimit('1.1.1.1', now + 61_000).allowed).toBe(true);
  });
});

describe('handleGenerateRequest', () => {
  const makeRes = () => {
    const res = { headers: {}, statusCode: 200, body: undefined };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    res.end = () => res;
    return res;
  };
  const makeReq = (body, method = 'POST') => ({ method, body, headers: { 'x-forwarded-for': '9.9.9.9' }, socket: {} });

  beforeEach(() => {
    resetRateLimits();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns Gemini JSON unchanged and names the model in a header', async () => {
    const client = { generate: vi.fn().mockResolvedValue({ data: { candidates: [] }, model: 'm' }) };
    const res = makeRes();
    await handleGenerateRequest(makeReq({ kind: 'text', prompt: 'p' }), res, client);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ candidates: [] });
    expect(res.headers['X-Gemini-Model']).toBe('m');
    expect(client.generate).toHaveBeenCalledWith({ kind: 'text', prompt: 'p', generationConfig: undefined });
  });

  it('maps GeminiApiError to its status and JSON shape', async () => {
    const err = new GeminiApiError('Gemini model "x" is not available', { statusCode: 404, model: 'x', modelNotFound: true, code: 'GEMINI_MODEL_NOT_FOUND' });
    const client = { generate: vi.fn().mockRejectedValue(err) };
    const res = makeRes();
    await handleGenerateRequest(makeReq({ prompt: 'p' }), res, client);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatchObject({ message: 'Gemini model "x" is not available', modelNotFound: true, code: 'GEMINI_MODEL_NOT_FOUND' });
  });

  it('rejects non-POST, invalid bodies, and rate-limited clients', async () => {
    const client = { generate: vi.fn() };

    let res = makeRes();
    await handleGenerateRequest(makeReq(undefined, 'GET'), res, client);
    expect(res.statusCode).toBe(405);

    res = makeRes();
    await handleGenerateRequest(makeReq({ prompt: '' }), res, client);
    expect(res.statusCode).toBe(400);

    for (let i = 0; i < 30; i++) checkRateLimit('9.9.9.9');
    res = makeRes();
    await handleGenerateRequest(makeReq({ prompt: 'p' }), res, client);
    expect(res.statusCode).toBe(429);
    expect(res.body.error.code).toBe('PROXY_RATE_LIMIT');

    expect(client.generate).not.toHaveBeenCalled();
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const client = { generate: vi.fn().mockRejectedValue(new Error('boom')) };
    const res = makeRes();
    await handleGenerateRequest(makeReq({ prompt: 'p' }), res, client);
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).not.toContain('boom');
  });
});

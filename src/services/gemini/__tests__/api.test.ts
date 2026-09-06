import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GeminiApiClient, buildHttpError, buildModelUrl, resolveModelList } from '../api';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  });

const okResponse = (text: string): Response =>
  jsonResponse({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });

const notFoundBody = (model: string) => ({
  error: {
    code: 404,
    message: `models/${model} is not found for API version v1beta, or is not supported for generateContent.`,
    status: 'NOT_FOUND',
  },
});

describe('GeminiApiClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const urlOfCall = (n: number): string => String(mockFetch.mock.calls[n][0]);

  it('falls back to the next model when the preferred model has been retired (404)', async () => {
    const client = new GeminiApiClient({
      apiKey: 'k',
      textModels: ['retired-model', 'live-model'],
    });
    mockFetch
      .mockResolvedValueOnce(jsonResponse(notFoundBody('retired-model'), 404))
      .mockResolvedValueOnce(okResponse('hello'));

    const result = await client.callApi('prompt');

    expect(result.candidates?.[0].content?.parts?.[0].text).toBe('hello');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(urlOfCall(0)).toBe(buildModelUrl('retired-model'));
    expect(urlOfCall(1)).toBe(buildModelUrl('live-model'));
  });

  it('remembers a retired model and skips it on subsequent calls', async () => {
    const client = new GeminiApiClient({
      apiKey: 'k',
      textModels: ['retired-model', 'live-model'],
    });
    mockFetch
      .mockResolvedValueOnce(jsonResponse(notFoundBody('retired-model'), 404))
      .mockResolvedValueOnce(okResponse('first'))
      .mockResolvedValueOnce(okResponse('second'));

    await client.callApi('one');
    await client.callApi('two');

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(urlOfCall(2)).toBe(buildModelUrl('live-model'));
    expect(client.textModel).toBe('live-model');
  });

  it('surfaces a descriptive error when every model is unavailable', async () => {
    const client = new GeminiApiClient({ apiKey: 'k', textModels: ['a', 'b'] });
    mockFetch
      .mockResolvedValueOnce(jsonResponse(notFoundBody('a'), 404))
      .mockResolvedValueOnce(jsonResponse(notFoundBody('b'), 404));

    await expect(client.callApi('prompt')).rejects.toMatchObject({
      code: 'CARTOON_ERROR',
      statusCode: 404,
      message: expect.stringContaining('Gemini model "b" is not available'),
      details: expect.objectContaining({ modelNotFound: true, userFacing: true }),
    });
  });

  it('does not retry or fall back on a 400 (bad API key) and keeps the API message', async () => {
    const client = new GeminiApiClient({ apiKey: 'bad', textModels: ['a', 'b'] });
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } },
        400
      )
    );

    await expect(client.callApi('prompt')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('API key not valid'),
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries 429 with backoff and succeeds', async () => {
    const client = new GeminiApiClient({ apiKey: 'k', textModels: ['a'] });
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429))
      .mockResolvedValueOnce(okResponse('ok'));

    const promise = client.callApi('prompt');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.candidates?.[0].content?.parts?.[0].text).toBe('ok');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('gives up on persistent 429 with a quota message after max retries', async () => {
    const client = new GeminiApiClient({ apiKey: 'k', textModels: ['a'] });
    mockFetch.mockResolvedValue(
      jsonResponse({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429)
    );

    const promise = client.callApi('prompt');
    const assertion = expect(promise).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining('quota or rate limit exceeded'),
    });
    await vi.runAllTimersAsync();
    await assertion;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries network failures and reports them clearly when they persist', async () => {
    const client = new GeminiApiClient({ apiKey: 'k', textModels: ['a'] });
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = client.callApi('prompt');
    const assertion = expect(promise).rejects.toMatchObject({
      message: expect.stringContaining('Could not reach the Gemini API'),
    });
    await vi.runAllTimersAsync();
    await assertion;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws a GEMINI_API_KEY_MISSING-flagged error without calling fetch when no key is set', async () => {
    const client = new GeminiApiClient({ apiKey: '', textModels: ['a'] });
    await expect(client.callApi('prompt')).rejects.toMatchObject({
      message: expect.stringContaining('API key not configured'),
      details: expect.objectContaining({ code: 'GEMINI_API_KEY_MISSING' }),
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes generationConfig through to the request body', async () => {
    const client = new GeminiApiClient({ apiKey: 'k', textModels: ['a'] });
    mockFetch.mockResolvedValueOnce(okResponse('[]'));

    await client.callApi('prompt', { responseMimeType: 'application/json' });

    const body = JSON.parse(String(mockFetch.mock.calls[0][1].body));
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json' });
    expect(body.contents[0].parts[0].text).toBe('prompt');
  });

  it('uses the image model list and IMAGE modality for vision calls', async () => {
    const client = new GeminiApiClient({
      apiKey: 'k',
      imageModels: ['old-image', 'new-image'],
    });
    mockFetch
      .mockResolvedValueOnce(jsonResponse(notFoundBody('old-image'), 404))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abc' } }] } }] })
      );

    const result = await client.callVisionApi('draw');

    expect(urlOfCall(1)).toBe(buildModelUrl('new-image'));
    const body = JSON.parse(String(mockFetch.mock.calls[1][1].body));
    expect(body.generationConfig.responseModalities).toEqual(['IMAGE']);
    expect(result.candidates?.[0].content?.parts?.[0].inlineData?.data).toBe('abc');
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
    expect(err.details?.modelNotFound).toBe(true);
    expect(err.message).toContain('"m" is not available');
  });

  it('handles non-JSON bodies', () => {
    const err = buildHttpError(502, 'Bad Gateway', '<html>oops</html>', 'm');
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain('502');
    expect(err.message).toContain('<html>oops</html>');
  });
});

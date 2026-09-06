import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GeminiApiClient, buildProxyError, buildProxyUrl, resolveApiBaseUrl } from '../api';

const jsonResponse = (body: unknown, status = 200, statusText = ''): Response =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });

const okResponse = (text: string): Response =>
  jsonResponse({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });

describe('GeminiApiClient (browser proxy client)', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const requestBody = (n: number) => JSON.parse(String(mockFetch.mock.calls[n][1].body));

  it('posts text requests to /api/gemini/generate with kind=text and generationConfig', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockResolvedValueOnce(okResponse('hello'));

    const result = await client.callApi('prompt', { responseMimeType: 'application/json' });

    expect(result.candidates?.[0].content?.parts?.[0].text).toBe('hello');
    expect(String(mockFetch.mock.calls[0][0])).toBe('http://backend/api/gemini/generate');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(requestBody(0)).toEqual({
      kind: 'text',
      prompt: 'prompt',
      generationConfig: { responseMimeType: 'application/json' },
    });
  });

  it('never sends an API key header', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockResolvedValueOnce(okResponse('x'));

    await client.callApi('prompt');

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-goog-api-key');
  });

  it('posts image requests with kind=image', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abc' } }] } }] })
    );

    const result = await client.callVisionApi('draw');

    expect(requestBody(0)).toEqual({ kind: 'image', prompt: 'draw' });
    expect(result.candidates?.[0].content?.parts?.[0].inlineData?.data).toBe('abc');
  });

  it('surfaces the proxy error message, status and flags', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            message: 'Gemini model "x" is not available (it may have been retired).',
            statusCode: 404,
            code: 'GEMINI_MODEL_NOT_FOUND',
            model: 'x',
            modelNotFound: true,
          },
        },
        404,
        'Not Found'
      )
    );

    await expect(client.callApi('prompt')).rejects.toMatchObject({
      code: 'CARTOON_ERROR',
      statusCode: 404,
      message: 'Gemini model "x" is not available (it may have been retired).',
      details: expect.objectContaining({ userFacing: true, modelNotFound: true, code: 'GEMINI_MODEL_NOT_FOUND' }),
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry HTTP errors from the proxy (the server already retried upstream)', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { message: 'Gemini API quota or rate limit exceeded.', statusCode: 429, code: 'GEMINI_RATE_LIMIT' } }, 429)
    );

    await expect(client.callApi('prompt')).rejects.toMatchObject({ statusCode: 429 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('gives a readable message for a non-JSON gateway timeout', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockResolvedValueOnce(new Response('<html>timeout</html>', { status: 504, statusText: 'Gateway Timeout' }));

    await expect(client.callApi('prompt')).rejects.toMatchObject({
      statusCode: 504,
      message: expect.stringContaining('timed out or is unavailable (HTTP 504)'),
    });
  });

  it('retries network failures and reports them clearly when they persist', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = client.callApi('prompt');
    const assertion = expect(promise).rejects.toMatchObject({
      message: expect.stringContaining('Could not reach the cartoon server'),
    });
    await vi.runAllTimersAsync();
    await assertion;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('treats an error object inside a 200 body as a failure', async () => {
    const client = new GeminiApiClient({ baseUrl: 'http://backend/api' });
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: { message: 'weird', status: 'INTERNAL' } }));

    await expect(client.callApi('prompt')).rejects.toMatchObject({
      message: 'Gemini API error: weird',
    });
  });
});

describe('resolveApiBaseUrl / buildProxyUrl', () => {
  it('uses the Express dev server outside production', () => {
    expect(resolveApiBaseUrl()).toBe('http://localhost:3001/api');
    expect(buildProxyUrl()).toBe('http://localhost:3001/api/gemini/generate');
  });

  it('strips trailing slashes from an explicit base', () => {
    expect(buildProxyUrl('https://example.com/api/')).toBe('https://example.com/api/gemini/generate');
  });
});

describe('buildProxyError', () => {
  it('falls back to a generic message when the body is not the proxy shape', () => {
    const err = buildProxyError(500, 'Internal Server Error', '{"unexpected":true}');
    expect(err.statusCode).toBe(500);
    expect(err.message).toContain('Cartoon server error 500');
    expect(err.details?.userFacing).toBe(true);
  });
});

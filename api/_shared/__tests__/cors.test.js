import { describe, it, expect } from 'vitest';
import locationHandler from '../../news/location.js';
import searchHandler from '../../news/search.js';
import contentHandler from '../../article/content.js';

const makeRes = () => {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(k, v) { res.headers[k] = v; },
    status(c) { res.statusCode = c; return res; },
    json() { return res; },
    end() { return res; },
  };
  return res;
};

describe('CORS headers on public handlers', () => {
  it.each([
    ['news/location', locationHandler],
    ['news/search', searchHandler],
    ['article/content', contentHandler],
  ])('%s does not send Allow-Credentials alongside a wildcard origin', async (_name, handler) => {
    const res = makeRes();
    await handler({ method: 'OPTIONS', query: {}, headers: {} }, res);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(res.headers).not.toHaveProperty('Access-Control-Allow-Credentials');
  });
});

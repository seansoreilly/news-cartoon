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
  ])('%s reflects only allowlisted origins and never sends credentials', async (_name, handler) => {
    const ok = makeRes();
    await handler({ method: 'OPTIONS', query: {}, headers: { origin: 'https://newscartoon.lol' } }, ok);
    expect(ok.headers['Access-Control-Allow-Origin']).toBe('https://newscartoon.lol');
    expect(ok.headers).not.toHaveProperty('Access-Control-Allow-Credentials');

    const evil = makeRes();
    await handler({ method: 'OPTIONS', query: {}, headers: { origin: 'https://evil.example' } }, evil);
    expect(evil.headers).not.toHaveProperty('Access-Control-Allow-Origin');

    const none = makeRes();
    await handler({ method: 'OPTIONS', query: {}, headers: {} }, none);
    expect(none.headers).not.toHaveProperty('Access-Control-Allow-Origin');
  });
});

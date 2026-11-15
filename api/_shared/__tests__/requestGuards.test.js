import { describe, it, expect } from 'vitest';
import { clientIp, isAllowedOrigin, createRateLimiter } from '../requestGuards.js';

describe('clientIp', () => {
  it('prefers platform-set headers over x-forwarded-for', () => {
    expect(clientIp({ headers: { 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '6.6.6.6, 2.2.2.2' } })).toBe('1.1.1.1');
    expect(clientIp({ headers: { 'x-real-ip': '3.3.3.3', 'x-forwarded-for': '6.6.6.6' } })).toBe('3.3.3.3');
  });
  it('trusts only the last x-forwarded-for entry (first is client-controlled)', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '6.6.6.6, 7.7.7.7, 2.2.2.2' } })).toBe('2.2.2.2');
  });
  it('falls back to the socket address', () => {
    expect(clientIp({ headers: {}, socket: { remoteAddress: '4.4.4.4' } })).toBe('4.4.4.4');
  });
});

describe('isAllowedOrigin', () => {
  it('allows the site and localhost only', () => {
    expect(isAllowedOrigin('https://newscartoon.lol')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('https://newscartoon.lol.evil.example')).toBe(false);
    expect(isAllowedOrigin('http://localhost.evil.example')).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
});

describe('createRateLimiter', () => {
  it('blocks after max requests in the window and recovers', () => {
    const l = createRateLimiter({ windowMs: 1000, max: 2 });
    expect(l.check('a', 0).allowed).toBe(true);
    expect(l.check('a', 1).allowed).toBe(true);
    expect(l.check('a', 2).allowed).toBe(false);
    expect(l.check('b', 2).allowed).toBe(true);
    expect(l.check('a', 1001).allowed).toBe(true);
  });
});

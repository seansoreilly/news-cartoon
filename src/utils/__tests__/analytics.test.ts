import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyError, isProductionHostname, track } from '../analytics';

const stubHost = (hostname: string, gtag?: () => void): void => {
  vi.stubGlobal('location', { hostname });
  window.gtag = gtag;
};

describe('isProductionHostname', () => {
  it.each(['newscartoon.lol', 'www.newscartoon.lol'])('accepts %s', (host) => {
    expect(isProductionHostname(host)).toBe(true);
  });

  it.each(['localhost', '127.0.0.1', 'news-cartoon-git-x.vercel.app', 'newscartoon.lol.evil.com'])(
    'rejects %s',
    (host) => {
      expect(isProductionHostname(host)).toBe(false);
    }
  );
});

describe('track', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete window.gtag;
  });

  it('sends the event to gtag on a production hostname', () => {
    const gtag = vi.fn();
    stubHost('newscartoon.lol', gtag);
    track('cartoon_generated', { mode: 'express' });
    expect(gtag).toHaveBeenCalledWith('event', 'cartoon_generated', { mode: 'express' });
  });

  it('does not send off the production hostname', () => {
    const gtag = vi.fn();
    stubHost('localhost', gtag);
    track('cartoon_generated', { mode: 'wizard' });
    expect(gtag).not.toHaveBeenCalled();
  });

  it('does not throw when gtag throws or is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stubHost('newscartoon.lol', () => {
      throw new Error('boom');
    });
    expect(() => track('gallery_published', {})).not.toThrow();
    stubHost('newscartoon.lol', undefined);
    expect(() => track('gallery_published', {})).not.toThrow();
  });
});

describe('classifyError', () => {
  it('buckets errors', () => {
    expect(
      classifyError({ code: 'ERROR', message: 'Rate limit exceeded. Please wait 5 seconds.', statusCode: 500 })
    ).toBe('rate_limit');
    expect(classifyError({ code: 'X', message: 'm', statusCode: 429 })).toBe('rate_limit');
    expect(classifyError({ code: 'VALIDATION_ERROR', message: 'm', statusCode: 400 })).toBe('validation');
    expect(classifyError({ code: 'ERROR', message: 'boom', statusCode: 500 })).toBe('other');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { decodeHtmlEntities, cleanDescription } from '../textUtils';

describe('decodeHtmlEntities', () => {
  it('decodes common entities', () => {
    expect(decodeHtmlEntities('Tom &amp; Jerry &quot;hi&quot;')).toBe('Tom & Jerry "hi"');
  });

  it('does not execute handlers from markup in the input', () => {
    const spy = vi.fn();
    (window as unknown as { __xss: () => void }).__xss = spy;
    const out = decodeHtmlEntities('<img src="x" onerror="window.__xss()">text');
    expect(out).toBe('text');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('cleanDescription', () => {
  it('strips tags and decodes entities', () => {
    expect(cleanDescription('<p>Fish &amp; chips</p>')).toBe('Fish & chips');
  });
});

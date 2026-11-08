import { describe, it, expect } from 'vitest';
import { toSafeHttpUrl } from '../safeUrl';

describe('toSafeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(toSafeHttpUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(toSafeHttpUrl(' http://example.com ')).toBe('http://example.com/');
  });

  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'file:///etc/passwd', '//example.com', 'example.com', '', 'not a url'])(
    'rejects %s',
    (value) => {
      expect(toSafeHttpUrl(value)).toBeUndefined();
    }
  );

  it('rejects non-strings', () => {
    expect(toSafeHttpUrl(undefined)).toBeUndefined();
    expect(toSafeHttpUrl(null)).toBeUndefined();
    expect(toSafeHttpUrl(42)).toBeUndefined();
  });
});

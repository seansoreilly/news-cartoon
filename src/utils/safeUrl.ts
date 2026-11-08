/**
 * Return the normalised URL if `value` parses as an http(s) URL, otherwise
 * undefined. Use before putting any stored/remote URL into an href so
 * `javascript:`, `data:` and similar schemes are never rendered as links.
 */
export const toSafeHttpUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Shared request guards for the public API handlers: client IP derivation,
 * a CORS origin allowlist and a small in-memory per-IP rate limiter.
 */

/**
 * Best-effort client IP. On Vercel the platform sets x-vercel-forwarded-for /
 * x-real-ip itself (clients cannot override them) and overwrites
 * x-forwarded-for. Elsewhere only the LAST x-forwarded-for entry (the one added
 * by our own proxy) is trusted; the first entry is client-controlled and would
 * let a caller dodge the per-IP limits by rotating a fake value.
 */
export const clientIp = (req) => {
  const h = req.headers || {};
  for (const name of ['x-vercel-forwarded-for', 'x-real-ip']) {
    const v = h[name];
    if (typeof v === 'string' && v.trim() !== '') return v.split(',')[0].trim();
  }
  const forwarded = h['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim() !== '') {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
};

export const ALLOWED_ORIGINS = [
  'https://newscartoon.lol',
  'https://www.newscartoon.lol',
];
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const isAllowedOrigin = (origin) =>
  typeof origin === 'string' && (ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin));

/**
 * Reflect CORS headers only for allowlisted origins. Same-origin requests (the
 * site's own frontend) need no CORS headers at all, so unknown origins simply
 * get none and the browser blocks cross-site reads.
 */
export const applyCors = (req, res, methods = 'GET,OPTIONS') => {
  const origin = req.headers?.origin;
  res.setHeader('Vary', 'Origin');
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  }
};

/** Sliding-window per-IP limiter factory (in-memory, per warm instance). */
export const createRateLimiter = ({ windowMs, max }) => {
  const buckets = new Map();
  const check = (ip, now = Date.now()) => {
    const key = ip || 'unknown';
    const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      buckets.set(key, recent);
      return { allowed: false, retryAfterMs: windowMs - (now - recent[0]) };
    }
    recent.push(now);
    buckets.set(key, recent);
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
    return { allowed: true, retryAfterMs: 0 };
  };
  return { check, reset: () => buckets.clear() };
};

/** Respond 429 when the limiter rejects; returns true if the request was rejected. */
export const rejectIfLimited = (limiter, req, res) => {
  const result = limiter.check(clientIp(req));
  if (result.allowed) return false;
  res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
  res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  return true;
};

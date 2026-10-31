/**
 * SSRF-hardened fetch for server-side requests to user-supplied URLs.
 *
 * Adapted from the calendar-aggregator safe-fetch reference. Differences: IP
 * ranges are checked numerically (not by regex over the hostname text), and a
 * DNS failure is a hard failure rather than "proceed".
 *
 *  - only http/https, no credentials in the URL
 *  - rejects private, loopback, link-local (169.254/16, fe80::/10), CGNAT,
 *    ULA, multicast/reserved, and IPv4-mapped/NAT64/6to4 IPv6 forms of those
 *  - resolves DNS and rejects if ANY result is private
 *  - follows redirects manually (max 5), re-validating every hop
 *
 * Residual risk: fetch() re-resolves DNS itself, so a rebinding attacker with
 * a very short TTL can still race the check. Closing that needs a pinned
 * dispatcher (undici) or an egress firewall.
 */
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

export const MAX_REDIRECTS = 5;

export class UnsafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata']);
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa'];

const parseIPv4 = (host) => {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts;
};

const isPrivateIPv4Octets = ([a, b, c]) =>
  a === 0 || // "this" network
  a === 10 ||
  a === 127 || // loopback
  (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64/10
  (a === 169 && b === 254) || // link-local + cloud metadata
  (a === 172 && b >= 16 && b <= 31) ||
  (a === 192 && b === 0 && (c === 0 || c === 2)) || // 192.0.0/24, TEST-NET-1
  (a === 192 && b === 168) ||
  (a === 192 && b === 88 && c === 99) || // 6to4 relay
  (a === 198 && (b === 18 || b === 19)) || // benchmarking
  (a === 198 && b === 51 && c === 100) || // TEST-NET-2
  (a === 203 && b === 0 && c === 113) || // TEST-NET-3
  a >= 224; // multicast, reserved, broadcast

/** Expand an IPv6 literal (no brackets, no zone) to 8 16-bit groups, or null. */
const parseIPv6 = (input) => {
  let host = input.split('%')[0];
  // Trailing dotted-quad (e.g. ::ffff:1.2.3.4) -> two hex groups.
  const lastColon = host.lastIndexOf(':');
  const tail = host.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    host = `${host.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const halves = host.split('::');
  if (halves.length > 2) return null;
  const toGroups = (s) => (s === '' ? [] : s.split(':'));
  const head = toGroups(halves[0]);
  const rest = halves.length === 2 ? toGroups(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  const nums = groups.map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN));
  return nums.length === 8 && nums.every((n) => !Number.isNaN(n)) ? nums : null;
};

const embeddedV4 = (g1, g2) => [g1 >> 8, g1 & 0xff, g2 >> 8, g2 & 0xff];

const isPrivateIPv6Groups = (g) => {
  if (g.every((n) => n === 0)) return true; // ::
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true; // ::1
  // IPv4-mapped ::ffff:a.b.c.d and deprecated IPv4-compatible ::a.b.c.d
  if (g.slice(0, 5).every((n) => n === 0) && (g[5] === 0xffff || g[5] === 0)) {
    return isPrivateIPv4Octets(embeddedV4(g[6], g[7]));
  }
  // NAT64 64:ff9b::/96 embeds an IPv4 address
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((n) => n === 0)) {
    return isPrivateIPv4Octets(embeddedV4(g[6], g[7]));
  }
  if (g[0] === 0x2002) return isPrivateIPv4Octets(embeddedV4(g[1], g[2])); // 6to4
  if ((g[0] & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true; // deprecated site-local fec0::/10
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  return false;
};

/** True if the host (hostname or IP literal, brackets allowed) must not be fetched. */
export const isPrivateAddress = (host) => {
  let h = String(host).toLowerCase().replace(/\.$/, '');
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);

  if (isIPv4(h)) {
    const octets = parseIPv4(h);
    return !octets || isPrivateIPv4Octets(octets);
  }
  if (isIPv6(h.split('%')[0]) || h.includes(':')) {
    const groups = parseIPv6(h);
    return !groups || isPrivateIPv6Groups(groups);
  }

  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (BLOCKED_SUFFIXES.some((s) => h.endsWith(s))) return true;
  // Single-label names ("intranet", "db") only resolve on internal networks.
  if (!h.includes('.')) return true;
  return false;
};

/** Parse and textually validate a URL. Throws UnsafeUrlError. */
export const assertSafeUrl = (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs are allowed');
  }
  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError('URLs with credentials are not allowed');
  }
  if (isPrivateAddress(parsed.hostname)) {
    throw new UnsafeUrlError('URL points to a private or reserved address');
  }
  return parsed;
};

/** Resolve the hostname and reject if any answer is private. */
const assertResolvedPublic = async (parsed, lookup) => {
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isIPv4(hostname) || hostname.includes(':')) return; // literal, already checked
  let records;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError('Could not resolve hostname');
  }
  if (!Array.isArray(records) || records.length === 0) throw new UnsafeUrlError('Could not resolve hostname');
  for (const { address } of records) {
    if (isPrivateAddress(address)) throw new UnsafeUrlError('URL resolves to a private or reserved address');
  }
};

/**
 * Guarded fetch: validates the URL and every redirect hop, follows up to
 * `maxRedirects` redirects manually. `fetchImpl` and `lookup` are injectable
 * for tests.
 */
export const safeFetch = async (url, init = {}, { fetchImpl = globalThis.fetch, lookup = dnsLookup, maxRedirects = MAX_REDIRECTS } = {}) => {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsed = assertSafeUrl(current);
    await assertResolvedPublic(parsed, lookup);

    const response = await fetchImpl(parsed.toString(), { ...init, redirect: 'manual' });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      // Drain the unused body so the connection can be released.
      await response.body?.cancel?.().catch(() => {});
      try {
        current = new URL(location, parsed).toString();
      } catch {
        throw new UnsafeUrlError('Invalid redirect location');
      }
      continue;
    }
    return response;
  }
  throw new UnsafeUrlError(`Too many redirects (max ${maxRedirects})`);
};

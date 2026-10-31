import { describe, it, expect, vi } from 'vitest';
import { isPrivateAddress, safeFetch, assertSafeUrl, UnsafeUrlError } from '../safeFetch.js';
import { handleArticleContentRequest } from '../articleContent.js';

const publicLookup = vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
const redirect = (location, status = 302) => new Response(null, { status, headers: { location } });
const page = (html = '<p>Hello <b>world</b></p>') => new Response(html, { status: 200 });

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1', '127.1.2.3', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '169.254.0.1', '100.64.0.1', '100.127.255.255', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '[::1]', '::', '[fe80::1]', 'febf::1', '[fc00::1]', 'fd12:3456::1', '[::ffff:127.0.0.1]', '::ffff:7f00:1',
    '::ffff:169.254.169.254', '::ffff:a9fe:a9fe', '64:ff9b::7f00:1', '2002:7f00:1::', 'ff02::1',
    'localhost', 'LOCALHOST.', 'foo.localhost', 'metadata.google.internal', 'db.internal', 'printer.local', 'intranet',
  ])('blocks %s', (host) => {
    expect(isPrivateAddress(host)).toBe(true);
  });

  it.each(['93.184.216.34', '8.8.8.8', '172.15.0.1', '172.32.0.1', '100.63.255.255', '100.128.0.1', '2606:4700::1111', '::ffff:8.8.8.8', 'example.com', 'news.google.com'])(
    'allows %s',
    (host) => {
      expect(isPrivateAddress(host)).toBe(false);
    }
  );
});

describe('assertSafeUrl', () => {
  it.each([
    'file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com', 'javascript:alert(1)', 'not a url',
    'http://127.0.0.1/', 'http://localhost:3001/api/health', 'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fe80::1]/', 'http://[fd00::1]/',
    'http://2130706433/', 'http://0x7f.0.0.1/', 'http://0177.0.0.1/', 'http://127.1/', 'http://100.64.0.1/',
    'http://user:pw@example.com/',
  ])('rejects %s', (u) => {
    expect(() => assertSafeUrl(u)).toThrow(UnsafeUrlError);
  });
  it('accepts public http and https URLs', () => {
    expect(assertSafeUrl('https://example.com/a?b=1').hostname).toBe('example.com');
    expect(assertSafeUrl('http://example.com').protocol).toBe('http:');
  });
});

describe('safeFetch', () => {
  it('never calls fetch for a blocked literal', async () => {
    const fetchImpl = vi.fn();
    await expect(safeFetch('http://169.254.169.254/', {}, { fetchImpl, lookup: publicLookup })).rejects.toThrow(UnsafeUrlError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects hostnames that resolve to private addresses (any record)', async () => {
    const fetchImpl = vi.fn();
    const lookup = vi.fn().mockResolvedValue([{ address: '93.184.216.34' }, { address: '10.0.0.5' }]);
    await expect(safeFetch('https://evil.example.com/', {}, { fetchImpl, lookup })).rejects.toThrow(/private/);
    const meta = vi.fn().mockResolvedValue([{ address: '::ffff:169.254.169.254' }]);
    await expect(safeFetch('https://evil.example.com/', {}, { fetchImpl, lookup: meta })).rejects.toThrow(/private/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed when DNS resolution fails', async () => {
    const fetchImpl = vi.fn();
    const lookup = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
    await expect(safeFetch('https://nope.example.com/', {}, { fetchImpl, lookup })).rejects.toThrow(/resolve/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('follows redirects manually and returns the final response', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect('/b')).mockResolvedValueOnce(redirect('https://other.example.com/c')).mockResolvedValueOnce(page());
    const res = await safeFetch('https://example.com/a', {}, { fetchImpl, lookup: publicLookup });
    expect(res.status).toBe(200);
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual(['https://example.com/a', 'https://example.com/b', 'https://other.example.com/c']);
    expect(fetchImpl.mock.calls.every((c) => c[1].redirect === 'manual')).toBe(true);
  });

  it.each(['http://169.254.169.254/latest/meta-data/', 'http://localhost/admin', 'http://[::1]/', 'file:///etc/passwd', 'http://10.0.0.1/'])(
    'rejects a redirect to %s',
    async (target) => {
      const fetchImpl = vi.fn().mockResolvedValueOnce(redirect(target, 301)).mockResolvedValue(page('secret'));
      await expect(safeFetch('https://example.com/a', {}, { fetchImpl, lookup: publicLookup })).rejects.toThrow(UnsafeUrlError);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  );

  it('rejects a redirect to a hostname that resolves privately', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect('https://rebind.example.net/'));
    const lookup = vi.fn().mockImplementation(async (h) => [{ address: h === 'rebind.example.net' ? '192.168.0.1' : '93.184.216.34' }]);
    await expect(safeFetch('https://example.com/a', {}, { fetchImpl, lookup })).rejects.toThrow(/private/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('stops after 5 redirects', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => redirect('https://example.com/loop'));
    await expect(safeFetch('https://example.com/loop', {}, { fetchImpl, lookup: publicLookup })).rejects.toThrow(/Too many redirects/);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it('allows exactly 5 redirects', async () => {
    const fetchImpl = vi.fn();
    for (let i = 0; i < 5; i++) fetchImpl.mockResolvedValueOnce(redirect(`/r${i}`));
    fetchImpl.mockResolvedValueOnce(page());
    const res = await safeFetch('https://example.com/', {}, { fetchImpl, lookup: publicLookup });
    expect(res.status).toBe(200);
  });
});

describe('handleArticleContentRequest', () => {
  const makeRes = () => {
    const res = { statusCode: 200, body: undefined };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
  };

  it('400s without a url', async () => {
    const res = makeRes();
    await handleArticleContentRequest({ query: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it.each(['http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1:3001/api/health', 'file:///etc/passwd', 'http://[::1]/'])(
    '400s for %s without fetching',
    async (url) => {
      const fetchImpl = vi.fn();
      const res = makeRes();
      await handleArticleContentRequest({ query: { url } }, res, { fetchImpl, lookup: publicLookup });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('URL is not allowed');
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  );

  it('400s for a redirect to a private address and never returns its body', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect('http://169.254.169.254/')).mockResolvedValue(page('TOKEN'));
    const res = makeRes();
    await handleArticleContentRequest({ query: { url: 'https://example.com/a' } }, res, { fetchImpl, lookup: publicLookup });
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain('TOKEN');
  });

  it('extracts text for a public page', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page('<html><script>x()</script><p>Hello <b>world</b></p></html>'));
    const res = makeRes();
    await handleArticleContentRequest({ query: { url: 'https://example.com/a' } }, res, { fetchImpl, lookup: publicLookup });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ content: 'Hello world', length: 11, url: 'https://example.com/a' });
  });
});

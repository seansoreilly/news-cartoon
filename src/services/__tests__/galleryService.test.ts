import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildGalleryUrl, fetchGalleryItems, uploadToGallery, readGalleryFailure } from '../galleryService';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const notConfigured = {
  error: {
    message: 'The gallery is not set up on this server yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.',
    statusCode: 503,
    code: 'GALLERY_NOT_CONFIGURED',
  },
};

describe('galleryService', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  describe('buildGalleryUrl', () => {
    it('appends /gallery to the API base and strips trailing slashes', () => {
      expect(buildGalleryUrl('http://localhost:3001/api')).toBe('http://localhost:3001/api/gallery');
      expect(buildGalleryUrl('/api/')).toBe('/api/gallery');
    });

    it('never points at Supabase directly', () => {
      expect(buildGalleryUrl()).not.toContain('supabase');
      expect(buildGalleryUrl()).toMatch(/\/api\/gallery$/);
    });
  });

  describe('readGalleryFailure', () => {
    it('extracts the proxy error envelope', async () => {
      await expect(readGalleryFailure(jsonResponse(notConfigured, 503))).resolves.toEqual({
        message: notConfigured.error.message,
        statusCode: 503,
        code: 'GALLERY_NOT_CONFIGURED',
      });
    });

    it('falls back to a generic message for non-JSON gateway errors', async () => {
      const failure = await readGalleryFailure(new Response('<html>Bad gateway</html>', { status: 502 }));
      expect(failure.code).toBe('GALLERY_ERROR');
      expect(failure.statusCode).toBe(502);
      expect(failure.message).toContain('502');
    });
  });

  describe('fetchGalleryItems', () => {
    it('GETs the proxy and returns its items', async () => {
      const items = [{ id: '1', title: 'A', image_path: 'a.png', created_at: 'now', public_url: 'https://x/a.png' }];
      mockFetch.mockResolvedValueOnce(jsonResponse({ items }));

      const result = await fetchGalleryItems();

      expect(result).toEqual({ items });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/api\/gallery$/);
      expect(init.method).toBe('GET');
    });

    it('surfaces the server message and code when the gallery is not configured', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(notConfigured, 503));
      const result = await fetchGalleryItems();
      expect(result.items).toEqual([]);
      expect(result.code).toBe('GALLERY_NOT_CONFIGURED');
      expect(result.error).toContain('not set up');
    });

    it('reports a network failure without throwing', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const result = await fetchGalleryItems();
      expect(result.items).toEqual([]);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.error).toContain('Failed to fetch');
    });

    it('tolerates a malformed success payload', async () => {
      mockFetch.mockResolvedValueOnce(new Response('not json', { status: 200 }));
      const result = await fetchGalleryItems();
      expect(result.items).toEqual([]);
      expect(result.code).toBe('GALLERY_ERROR');
    });
  });

  describe('uploadToGallery', () => {
    it('POSTs the image and metadata as JSON and resolves success with the item', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ success: true, item: { id: 'x', title: 'T', image_path: 'x.png', created_at: 'now' } }, 201)
      );

      const result = await uploadToGallery('data:image/png;base64,AAAA', 'T', 'https://e.com', 'E');

      expect(result.success).toBe(true);
      expect(result.item?.id).toBe('x');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/api\/gallery$/);
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body)).toEqual({ image: 'data:image/png;base64,AAAA', title: 'T', newsUrl: 'https://e.com', newsSource: 'E' });
    });

    it('returns the proxy error code, status and message on failure', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(notConfigured, 503));
      const result = await uploadToGallery('data:image/png;base64,AAAA', 'T', '', '');
      expect(result).toEqual({
        success: false,
        error: notConfigured.error.message,
        code: 'GALLERY_NOT_CONFIGURED',
        statusCode: 503,
      });
    });

    it('passes through the size-guard error', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: { message: 'Image is too large to publish (max 3 MB)', statusCode: 413, code: 'GALLERY_IMAGE_TOO_LARGE' } }, 413)
      );
      const result = await uploadToGallery('data:image/png;base64,AAAA', 'T', '', '');
      expect(result.success).toBe(false);
      expect(result.code).toBe('GALLERY_IMAGE_TOO_LARGE');
      expect(result.statusCode).toBe(413);
    });

    it('handles a network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const result = await uploadToGallery('data:image/png;base64,AAAA', 'T', '', '');
      expect(result.success).toBe(false);
      expect(result.code).toBe('NETWORK_ERROR');
    });
  });
});

import type { GalleryItem } from '../types/gallery';
import { logger } from '../utils/logger';
import { resolveApiBaseUrl } from './gemini/api';

/**
 * Thin client for our own gallery endpoint. The browser never talks to
 * Supabase directly: api/_shared/gallery.js (Vercel function + dev-server.js)
 * holds the Supabase URL and key and does the storage upload / DB insert.
 */
export const GALLERY_PATH = '/gallery';

export const buildGalleryUrl = (baseUrl: string = resolveApiBaseUrl()): string =>
  `${baseUrl.replace(/\/+$/, '')}${GALLERY_PATH}`;

export interface GalleryFailure {
  message: string;
  code: string;
  statusCode: number;
}

export interface GalleryListResult {
  items: GalleryItem[];
  error?: string;
  code?: string;
}

export interface GalleryPublishResult {
  success: boolean;
  item?: GalleryItem;
  error?: string;
  code?: string;
  statusCode?: number;
}

const fallbackMessage = (status: number): string => {
  if (status === 502 || status === 503 || status === 504) {
    return `The gallery server timed out or is unavailable (HTTP ${status})`;
  }
  return `The gallery request failed (HTTP ${status})`;
};

/** Turn a non-OK proxy response into a structured failure. */
export const readGalleryFailure = async (response: Response): Promise<GalleryFailure> => {
  const bodyText = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string; code?: string; statusCode?: number } };
    if (parsed?.error && typeof parsed.error.message === 'string') {
      return {
        message: parsed.error.message,
        code: typeof parsed.error.code === 'string' ? parsed.error.code : 'GALLERY_ERROR',
        statusCode: typeof parsed.error.statusCode === 'number' ? parsed.error.statusCode : response.status,
      };
    }
  } catch {
    // Not JSON (e.g. a gateway HTML page); fall through to the generic message.
  }
  return { message: fallbackMessage(response.status), code: 'GALLERY_ERROR', statusCode: response.status };
};

const networkFailure = (err: unknown, action: string): GalleryFailure => ({
  message: err instanceof Error && err.message ? `Could not reach the server to ${action}: ${err.message}` : `Could not reach the server to ${action}`,
  code: 'NETWORK_ERROR',
  statusCode: 0,
});

export const fetchGalleryItems = async (): Promise<GalleryListResult> => {
  const url = buildGalleryUrl();
  let response: Response;
  try {
    response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch (err) {
    logger.error('Error fetching gallery:', err);
    const failure = networkFailure(err, 'load the gallery');
    return { items: [], error: failure.message, code: failure.code };
  }

  if (!response.ok) {
    const failure = await readGalleryFailure(response);
    logger.error(`Gallery list failed: ${failure.code} (${failure.statusCode}) ${failure.message}`);
    return { items: [], error: failure.message, code: failure.code };
  }

  try {
    const data = (await response.json()) as { items?: GalleryItem[] };
    return { items: Array.isArray(data.items) ? data.items : [] };
  } catch (err) {
    logger.error('Error parsing gallery response:', err);
    return { items: [], error: 'The gallery server returned an unreadable response.', code: 'GALLERY_ERROR' };
  }
};

export const uploadToGallery = async (
  base64Image: string,
  title: string,
  newsUrl: string,
  newsSource: string
): Promise<GalleryPublishResult> => {
  const url = buildGalleryUrl();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ image: base64Image, title, newsUrl, newsSource }),
    });
  } catch (err) {
    logger.error('Gallery upload failed:', err);
    const failure = networkFailure(err, 'publish the cartoon');
    return { success: false, error: failure.message, code: failure.code, statusCode: failure.statusCode };
  }

  if (!response.ok) {
    const failure = await readGalleryFailure(response);
    logger.error(`Gallery publish failed: ${failure.code} (${failure.statusCode}) ${failure.message}`);
    return { success: false, error: failure.message, code: failure.code, statusCode: failure.statusCode };
  }

  try {
    const data = (await response.json()) as { success?: boolean; item?: GalleryItem };
    return { success: data.success !== false, item: data.item };
  } catch {
    // A 2xx without a readable body still means the publish went through.
    return { success: true };
  }
};

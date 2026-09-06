import { handleGalleryRequest } from '../_shared/gallery.js';

/**
 * GET  /api/gallery  -> { items: GalleryItem[] }
 * POST /api/gallery  -> { success: true, item }  body: { image, title, newsUrl?, newsSource? }
 *
 * Talks to Supabase with the server-held URL and key so neither is bundled
 * into the browser. Errors are returned as { error: { message, statusCode, code } }
 * with the matching HTTP status. See api/_shared/gallery.js.
 */
export default async function handler(req, res) {
  return handleGalleryRequest(req, res);
}

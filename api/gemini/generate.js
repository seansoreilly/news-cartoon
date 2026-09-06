import { handleGenerateRequest } from '../_shared/gemini.js';

/**
 * POST /api/gemini/generate
 * Body: { kind: 'text' | 'image', prompt: string, generationConfig?: { responseMimeType?, temperature?, aspectRatio? } }
 *
 * Proxies the request to Google Gemini with the server-held API key and
 * returns Google's response JSON unchanged. Errors are returned as
 * { error: { message, statusCode, apiStatus, model, modelNotFound, code } }
 * with the matching HTTP status. See api/_shared/gemini.js.
 */
export default async function handler(req, res) {
  return handleGenerateRequest(req, res);
}

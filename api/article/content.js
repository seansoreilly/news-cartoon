import { applyCors, createRateLimiter, rejectIfLimited } from '../_shared/requestGuards.js';
import { handleArticleContentRequest } from '../_shared/articleContent.js';

// Best effort (per warm instance); the Vercel WAF rule is the durable control.
const limiter = createRateLimiter({ windowMs: 60_000, max: 15 });

export default async function handler(req, res) {
  applyCors(req, res, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (rejectIfLimited(limiter, req, res)) return;

  return handleArticleContentRequest(req, res);
}

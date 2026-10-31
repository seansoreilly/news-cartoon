/**
 * Request contract for POST /api/gemini/generate.
 *
 * Body: { task, ...fields } where task is one of GENERATE_TASKS. The server
 * owns the prompt text and the generationConfig; the client supplies only
 * bounded structured data. Unknown tasks and unknown fields (at any level)
 * are rejected, so a raw `prompt` / `kind` / `generationConfig` is a 400.
 *
 *   concepts       { articles: [{title, description?}] (1-20), location }
 *   comic-script   { concept, articles: [{title, description?}] (0-10), panelCount? (1-4) }
 *   cartoon-image  { concept, script: { panels }, panelCount? (1-4) }  -> image
 *   humor-score    { title, description? }
 *   batch-analysis { articles: [{title, description?, content?}] (1-10) }
 */
import {
  buildConceptPrompt,
  buildComicPrompt,
  buildImagePrompt,
  buildHumorScorePrompt,
  buildBatchAnalysisPrompt,
} from './prompts.js';

export const GENERATE_TASKS = ['concepts', 'comic-script', 'cartoon-image', 'humor-score', 'batch-analysis'];

export const LIMITS = {
  title: 300,
  description: 2000,
  content: 2000,
  location: 200,
  premise: 1500,
  whyFunny: 1000,
  panelText: 4000,
  visibleTextContent: 200,
  smallString: 200,
  conceptArticles: 20,
  comicArticles: 10,
  batchArticles: 10,
  panels: 8,
  visibleTexts: 12,
  characters: 20,
};

const VISIBLE_TEXT_TYPES = ['dialogue', 'sign', 'caption', 'label'];

class InvalidRequest extends Error {}
const fail = (message) => {
  throw new InvalidRequest(message);
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const exactKeys = (obj, path, required, optional = []) => {
  if (!isPlainObject(obj)) fail(`${path} must be an object`);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) fail(`${path}: unknown field "${key}"`);
  }
  for (const key of required) {
    if (obj[key] === undefined) fail(`${path}.${key} is required`);
  }
};

const str = (value, path, max, { optional = false, allowEmpty = false } = {}) => {
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string') fail(`${path} must be a string`);
  if (!allowEmpty && value.trim().length === 0) fail(`${path} must not be empty`);
  if (value.length > max) fail(`${path} exceeds ${max} characters`);
  return value;
};

const list = (value, path, min, max) => {
  if (!Array.isArray(value)) fail(`${path} must be an array`);
  if (value.length < min) fail(`${path} must contain at least ${min} item(s)`);
  if (value.length > max) fail(`${path} must contain at most ${max} items`);
  return value;
};

const panelCountOf = (value) => {
  if (value === undefined) return 4;
  if (!Number.isInteger(value) || value < 1 || value > 4) fail('panelCount must be an integer from 1 to 4');
  return value;
};

const articleOf = (a, path, { content = false } = {}) => {
  exactKeys(a, path, ['title'], content ? ['description', 'content'] : ['description']);
  const out = { title: str(a.title, `${path}.title`, LIMITS.title) };
  const description = str(a.description, `${path}.description`, LIMITS.description, { optional: true, allowEmpty: true });
  if (description !== undefined) out.description = description;
  if (content) {
    const c = str(a.content, `${path}.content`, LIMITS.content, { optional: true, allowEmpty: true });
    if (c !== undefined) out.content = c;
  }
  return out;
};

const conceptOf = (c, path) => {
  exactKeys(c, path, ['title', 'premise', 'location'], ['why_funny']);
  return {
    title: str(c.title, `${path}.title`, LIMITS.title),
    premise: str(c.premise, `${path}.premise`, LIMITS.premise),
    why_funny: str(c.why_funny, `${path}.why_funny`, LIMITS.whyFunny, { optional: true, allowEmpty: true }) ?? '',
    location: str(c.location, `${path}.location`, LIMITS.location, { allowEmpty: true }),
  };
};

const panelOf = (p, path) => {
  if (typeof p === 'string') return str(p, path, LIMITS.panelText, { allowEmpty: true });
  exactKeys(p, path, [], [
    'panelNumber', 'newsContext', 'visualDescription', 'visibleText', 'characters', 'setting', 'description',
  ]);
  const out = {};
  if (p.panelNumber !== undefined) {
    if (!Number.isInteger(p.panelNumber) || p.panelNumber < 0 || p.panelNumber > 100) fail(`${path}.panelNumber is invalid`);
    out.panelNumber = p.panelNumber;
  }
  for (const key of ['newsContext', 'visualDescription', 'description', 'setting']) {
    const v = str(p[key], `${path}.${key}`, LIMITS.panelText, { optional: true, allowEmpty: true });
    if (v !== undefined) out[key] = v;
  }
  if (p.visibleText !== undefined) {
    out.visibleText = list(p.visibleText, `${path}.visibleText`, 0, LIMITS.visibleTexts).map((t, i) => {
      const tp = `${path}.visibleText[${i}]`;
      exactKeys(t, tp, ['content'], ['type']);
      const entry = { content: str(t.content, `${tp}.content`, LIMITS.visibleTextContent, { allowEmpty: true }) };
      if (t.type !== undefined) {
        if (!VISIBLE_TEXT_TYPES.includes(t.type)) fail(`${tp}.type is invalid`);
        entry.type = t.type;
      }
      return entry;
    });
  }
  if (p.characters !== undefined) {
    out.characters = list(p.characters, `${path}.characters`, 0, LIMITS.characters).map((c, i) =>
      str(c, `${path}.characters[${i}]`, LIMITS.smallString, { allowEmpty: true })
    );
  }
  return out;
};

const TASKS = {
  concepts: (b) => {
    exactKeys(b, 'request', ['task', 'articles', 'location']);
    const articles = list(b.articles, 'articles', 1, LIMITS.conceptArticles).map((a, i) => articleOf(a, `articles[${i}]`));
    const location = str(b.location, 'location', LIMITS.location);
    return {
      kind: 'text',
      prompt: buildConceptPrompt(articles, location),
      generationConfig: { responseMimeType: 'application/json' },
    };
  },
  'comic-script': (b) => {
    exactKeys(b, 'request', ['task', 'concept', 'articles'], ['panelCount']);
    const concept = conceptOf(b.concept, 'concept');
    const articles = list(b.articles, 'articles', 0, LIMITS.comicArticles).map((a, i) => articleOf(a, `articles[${i}]`));
    return { kind: 'text', prompt: buildComicPrompt(concept, articles, panelCountOf(b.panelCount)) };
  },
  'cartoon-image': (b) => {
    exactKeys(b, 'request', ['task', 'concept', 'script'], ['panelCount']);
    const concept = conceptOf(b.concept, 'concept');
    exactKeys(b.script, 'script', ['panels']);
    const panels = list(b.script.panels, 'script.panels', 1, LIMITS.panels).map((p, i) => panelOf(p, `script.panels[${i}]`));
    return { kind: 'image', prompt: buildImagePrompt(concept, { panels }, panelCountOf(b.panelCount)) };
  },
  'humor-score': (b) => {
    exactKeys(b, 'request', ['task', 'title'], ['description']);
    const title = str(b.title, 'title', LIMITS.title);
    const description = str(b.description, 'description', LIMITS.description, { optional: true, allowEmpty: true });
    return { kind: 'text', prompt: buildHumorScorePrompt(title, description) };
  },
  'batch-analysis': (b) => {
    exactKeys(b, 'request', ['task', 'articles']);
    const articles = list(b.articles, 'articles', 1, LIMITS.batchArticles).map((a, i) =>
      articleOf(a, `articles[${i}]`, { content: true })
    );
    return { kind: 'text', prompt: buildBatchAnalysisPrompt(articles) };
  },
};

/**
 * Validate a request body and render the server-owned prompt.
 * @returns {{ ok: true, value: { kind: 'text'|'image', prompt: string, generationConfig?: object } } | { ok: false, message: string }}
 */
export const buildGenerateRequest = (body) => {
  if (!isPlainObject(body)) return { ok: false, message: 'Request body must be a JSON object' };
  if (typeof body.task !== 'string' || !Object.prototype.hasOwnProperty.call(TASKS, body.task)) {
    return { ok: false, message: `task must be one of: ${GENERATE_TASKS.join(', ')}` };
  }
  try {
    return { ok: true, value: TASKS[body.task](body) };
  } catch (error) {
    if (error instanceof InvalidRequest) return { ok: false, message: error.message };
    throw error;
  }
};

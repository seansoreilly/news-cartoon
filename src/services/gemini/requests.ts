import type { NewsArticle } from '../../types/news';
import type { CartoonConcept, ComicScript, ComicScriptPanel, ComicPanel } from '../../types/cartoon';
import type { GenerateRequest, GenerateArticle, GeneratePanel } from './types';

/**
 * Builders for the typed /api/gemini/generate request bodies. The server owns
 * the prompt text (api/_shared/prompts.js); the client only sends bounded data.
 * Limits mirror api/_shared/generateRequest.js LIMITS: values are clamped here
 * so an unusually long RSS description degrades gracefully instead of 400ing.
 */
const MAX = {
    title: 300,
    description: 2000,
    content: 2000,
    location: 200,
    premise: 1500,
    whyFunny: 1000,
    panelText: 4000,
    visibleText: 200,
    smallString: 200,
    visibleTexts: 12,
    characters: 20,
    panels: 8,
    conceptArticles: 20,
    comicArticles: 10,
    batchArticles: 10,
} as const;

const clamp = (value: string, max: number): string => (value.length > max ? value.slice(0, max) : value);
const clampOpt = (value: string | undefined, max: number): string | undefined =>
    value === undefined ? undefined : clamp(value, max);

const withOptional = <T extends object>(base: T, extra: Record<string, string | undefined>): T => {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(extra)) if (v !== undefined) out[k] = v;
    return out as T;
};

const toArticle = (a: { title: string; description?: string; content?: string }, withContent = false): GenerateArticle =>
    withOptional<GenerateArticle>(
        { title: clamp(a.title || '', MAX.title) || 'Untitled' },
        {
            description: clampOpt(a.description, MAX.description),
            ...(withContent ? { content: clampOpt(a.content, MAX.content) } : {}),
        }
    );

const toConcept = (c: CartoonConcept): GenerateRequestConcept =>
    withOptional<GenerateRequestConcept>(
        {
            title: clamp(c.title || '', MAX.title) || 'Untitled',
            premise: clamp(c.premise || '', MAX.premise) || 'No premise',
            location: clamp(c.location || '', MAX.location),
        },
        { why_funny: clampOpt(c.why_funny, MAX.whyFunny) }
    );

type GenerateRequestConcept = Extract<GenerateRequest, { task: 'comic-script' }>['concept'];

const toPanel = (panel: ComicScript['panels'][number]): GeneratePanel => {
    if (typeof panel === 'string') return clamp(panel, MAX.panelText);
    const p = panel as Partial<ComicScriptPanel> & Partial<ComicPanel>;
    const out: Exclude<GeneratePanel, string> = {};
    if (typeof p.panelNumber === 'number') out.panelNumber = p.panelNumber;
    if (typeof p.visualDescription === 'string') out.visualDescription = clamp(p.visualDescription, MAX.panelText);
    if (typeof p.description === 'string') out.description = clamp(p.description, MAX.panelText);
    if (typeof p.setting === 'string') out.setting = clamp(p.setting, MAX.panelText);
    if (Array.isArray(p.visibleText)) {
        out.visibleText = p.visibleText.slice(0, MAX.visibleTexts).map((t) => {
            const entry: { content: string; type?: 'dialogue' | 'sign' | 'caption' | 'label' } = {
                content: clamp(String(t.content ?? ''), MAX.visibleText),
            };
            if (t.type) entry.type = t.type;
            return entry;
        });
    }
    if (Array.isArray(p.characters)) {
        out.characters = p.characters.slice(0, MAX.characters).map((c) => clamp(String(c), MAX.smallString));
    }
    return out;
};

export const conceptsRequest = (articles: NewsArticle[], location: string): GenerateRequest => ({
    task: 'concepts',
    articles: articles.slice(0, MAX.conceptArticles).map((a) => toArticle(a)),
    location: clamp(location, MAX.location),
});

export const comicScriptRequest = (
    concept: CartoonConcept,
    articles: NewsArticle[],
    panelCount: number
): GenerateRequest => ({
    task: 'comic-script',
    concept: toConcept(concept),
    articles: articles.slice(0, MAX.comicArticles).map((a) => toArticle(a)),
    panelCount,
});

export const cartoonImageRequest = (
    concept: CartoonConcept,
    script: ComicScript,
    panelCount: number
): GenerateRequest => ({
    task: 'cartoon-image',
    concept: toConcept(concept),
    script: { panels: script.panels.slice(0, MAX.panels).map(toPanel) },
    panelCount,
});

export const humorScoreRequest = (title: string, description?: string): GenerateRequest =>
    withOptional<GenerateRequest>(
        { task: 'humor-score', title: clamp(title, MAX.title) || 'Untitled' },
        { description: clampOpt(description, MAX.description) }
    );

export const batchAnalysisRequest = (
    batch: Array<{ title: string; description?: string; content?: string }>
): GenerateRequest => ({
    task: 'batch-analysis',
    articles: batch.slice(0, MAX.batchArticles).map((a) => toArticle(a, true)),
});

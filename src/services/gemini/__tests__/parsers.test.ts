import { describe, it, expect } from 'vitest';
import { parseConceptResponse, extractJsonArray, getResponseText, describeEmptyResponse } from '../parsers';
import type { GeminiResponse } from '../types';

const textResponse = (...texts: string[]): GeminiResponse => ({
  candidates: [{ content: { parts: texts.map((text) => ({ text })) }, finishReason: 'STOP' }],
});

const concepts = [
  { title: 'A', premise: 'p1', why_funny: 'w1' },
  { title: 'B', premise: 'p2', why_funny: 'w2' },
];

describe('getResponseText', () => {
  it('joins multiple text parts and skips thought parts', () => {
    const response: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'thinking...', thought: true }, { text: 'foo' }, { text: 'bar' }],
          },
        },
      ],
    };
    expect(getResponseText(response)).toBe('foobar');
  });

  it('returns empty string when there are no candidates', () => {
    expect(getResponseText({})).toBe('');
    expect(getResponseText({ candidates: [] })).toBe('');
    expect(getResponseText({ candidates: [{ content: {} }] })).toBe('');
  });
});

describe('extractJsonArray', () => {
  it('parses a bare array', () => {
    expect(extractJsonArray(JSON.stringify(concepts))).toEqual(concepts);
  });

  it('parses an array inside markdown fences', () => {
    expect(extractJsonArray('```json\n' + JSON.stringify(concepts) + '\n```')).toEqual(concepts);
  });

  it('unwraps an object wrapper', () => {
    expect(extractJsonArray(JSON.stringify({ concepts }))).toEqual(concepts);
  });

  it('finds an array embedded in prose', () => {
    expect(extractJsonArray('Here you go:\n' + JSON.stringify(concepts) + '\nEnjoy!')).toEqual(concepts);
  });

  it('returns null for unparseable text', () => {
    expect(extractJsonArray('no json here')).toBeNull();
    expect(extractJsonArray('[ truncated , {')).toBeNull();
  });
});

describe('parseConceptResponse', () => {
  it('parses concepts and attaches the location', () => {
    const result = parseConceptResponse(textResponse(JSON.stringify(concepts)), 'Melbourne');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ title: 'A', premise: 'p1', why_funny: 'w1', location: 'Melbourne' });
  });

  it('handles the array split across multiple parts', () => {
    const json = JSON.stringify(concepts);
    const half = Math.floor(json.length / 2);
    const result = parseConceptResponse(textResponse(json.slice(0, half), json.slice(half)), 'X');
    expect(result.map((c) => c.title)).toEqual(['A', 'B']);
  });

  it('fills defaults for missing fields and drops non-object entries', () => {
    const result = parseConceptResponse(textResponse(JSON.stringify([{ title: 'Only' }, null, 'junk'])), 'X');
    expect(result).toEqual([{ title: 'Only', premise: 'A cartoon concept', why_funny: 'Political commentary', location: 'X' }]);
  });

  it('explains a safety block instead of a generic parse failure', () => {
    const blocked: GeminiResponse = { promptFeedback: { blockReason: 'SAFETY' }, candidates: [] };
    expect(() => parseConceptResponse(blocked, 'X')).toThrow(/blocked by Gemini \(SAFETY\)/);
  });

  it('explains an early finish (e.g. MAX_TOKENS) with no text', () => {
    const truncated: GeminiResponse = { candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] };
    expect(() => parseConceptResponse(truncated, 'X')).toThrow(/stopped generating early \(MAX_TOKENS\)/);
  });

  it('throws a user-facing error when the text has no JSON array', () => {
    expect(() => parseConceptResponse(textResponse('Sorry, I cannot do that.'), 'X')).toThrow(
      /Could not parse cartoon concepts/
    );
  });

  it('throws when the array is empty', () => {
    expect(() => parseConceptResponse(textResponse('[]'), 'X')).toThrow(/no cartoon concepts/);
  });
});

describe('describeEmptyResponse', () => {
  it('reports missing candidates', () => {
    expect(describeEmptyResponse({})).toMatch(/no candidates/);
  });
  it('reports an empty candidate', () => {
    expect(describeEmptyResponse({ candidates: [{ content: { parts: [] } }] })).toMatch(/empty response/);
  });
});

import type { GeminiResponse } from './types';
import type { CartoonConcept, ComicScriptPanel, ComicPanel, ComicScript } from '../../types/cartoon';
import { createCartoonError } from '../../types/error';
import { logger } from '../../utils/logger';

export const parseConceptResponse = (response: GeminiResponse, location: string): CartoonConcept[] => {
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw createCartoonError('Could not parse cartoon concepts from API response');
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
            title?: string;
            premise?: string;
            why_funny?: string;
        }>;

        return parsed.map((concept) => ({
            title: concept.title || 'Untitled',
            premise: concept.premise || 'A cartoon concept',
            why_funny: concept.why_funny || 'Political commentary',
            location,
        }));
    } catch (error) {
        throw createCartoonError(
            'Failed to parse cartoon concepts JSON',
            { parseError: String(error) }
        );
    }
};

export const parseComicScript = (response: GeminiResponse, expectedPanelCount: number = 4): ComicScriptPanel[] => {
    logger.debug('[parseComicScript] Starting to parse new JSON prompt format...');
    logger.debug('[parseComicScript] Expected panel count:', expectedPanelCount);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    logger.debug('[parseComicScript] Response text length:', text.length);
    logger.debug('[parseComicScript] Response text preview:', text.substring(0, 500));

    // Try to parse as JSON array (new format)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        logger.debug('[parseComicScript] Found JSON array, parsing new format...');
        try {
            const parsed = JSON.parse(jsonMatch[0]) as Array<{
                panelNumber?: number;
                visualDescription?: string;
                visibleText?: Array<{ type: string; content: string }>;
                characters?: string[];
                setting?: string;
            }>;

            if (Array.isArray(parsed) && parsed.length > 0) {
                logger.debug('[parseComicScript] Successfully parsed JSON array with', parsed.length, 'panels');

                const panels: ComicScriptPanel[] = parsed.slice(0, expectedPanelCount).map((panel, index) => {
                    logger.debug(`[parseComicScript] Panel ${index + 1}:`, {
                        hasVisualDescription: !!panel.visualDescription,
                        textElementCount: panel.visibleText?.length || 0,
                    });

                    const visibleText = Array.isArray(panel.visibleText)
                        ? panel.visibleText.map(v => ({
                            type: (v.type as 'dialogue' | 'sign' | 'caption' | 'label') || 'sign',
                            content: v.content || '',
                        }))
                        : [];

                    return {
                        panelNumber: panel.panelNumber || index + 1,
                        visualDescription: panel.visualDescription || 'Visual description goes here',
                        visibleText,
                        characters: Array.isArray(panel.characters) ? panel.characters : [],
                        setting: panel.setting || 'Scene',
                    };
                });

                logger.debug('[parseComicScript] Successfully extracted', panels.length, 'panels with structured data');
                return panels;
            }
        } catch (error) {
            logger.warn('[parseComicScript] JSON parsing failed:', error);
        }
    }

    // Fallback: Create default panels if parsing completely fails
    logger.warn('[parseComicScript] Could not parse JSON, using default panels');
    const defaultPanels: ComicScriptPanel[] = [];
    for (let i = 1; i <= expectedPanelCount; i++) {
        defaultPanels.push({
            panelNumber: i,
            visualDescription: `Panel ${i}: A scene showing the cartoon concept with visual humor`,
            visibleText: [],
            characters: [],
            setting: 'Scene',
        });
    }
    return defaultPanels;
};

export const parseImageResponse = (response: GeminiResponse): string => {
    logger.debug('[parseImageResponse] Starting response parsing...');

    // Log full response structure for debugging
    logger.debug('[parseImageResponse] Full response structure:', JSON.stringify(response, null, 2));

    // Extract image data from Gemini Image Generation API response
    // The response structure varies based on the model and generation config

    logger.debug('[parseImageResponse] Response structure check:', {
        hasCandidates: !!response.candidates,
        candidatesLength: response.candidates?.length || 0,
    });

    if (!response.candidates || response.candidates.length === 0) {
        console.error('[parseImageResponse] No candidates in response');
        throw createCartoonError('No candidates in API response');
    }

    const candidate = response.candidates[0];

    // First check if candidate itself has the inline data (some API versions)
    // Using unknown type to handle API response variations safely
    const candidateExtended = candidate as typeof candidate & {
        inlineData?: { data?: string; mimeType?: string };
        parts?: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    };

    if ('inlineData' in candidateExtended && candidateExtended.inlineData) {
        logger.debug('[parseImageResponse] Found inlineData directly in candidate');
        const data = candidateExtended.inlineData.data;
        if (data) {
            logger.debug('[parseImageResponse] ✅ Successfully extracted image data from candidate');
            return data;
        }
    }

    // Check standard structure: candidate.content.parts[0]
    logger.debug('[parseImageResponse] Candidate structure:', {
        hasContent: !!candidate.content,
        hasParts: !!candidate.content?.parts,
        partsLength: candidate.content?.parts?.length || 0,
        candidateKeys: Object.keys(candidate),
    });

    // If no content, check if there's a direct parts array
    const parts = candidate.content?.parts || candidateExtended.parts || [];

    if (parts.length === 0) {
        console.error('[parseImageResponse] No parts found in candidate');
        console.error('[parseImageResponse] Candidate keys:', Object.keys(candidate));
        console.error('[parseImageResponse] Full candidate:', JSON.stringify(candidate, null, 2));
        throw createCartoonError('No parts in API response candidate');
    }

    const part = parts[0];
    logger.debug('[parseImageResponse] Part type check:', {
        hasInlineData: 'inlineData' in part,
        hasText: 'text' in part,
        partKeys: Object.keys(part),
    });

    // Check for inlineData (image generation response)
    if (part && 'inlineData' in part && part.inlineData) {
        logger.debug('[parseImageResponse] Found inlineData:', {
            hasMimeType: !!part.inlineData.mimeType,
            mimeType: part.inlineData.mimeType,
            hasData: !!part.inlineData.data,
            dataLength: part.inlineData.data?.length || 0,
            dataPreview: part.inlineData.data?.substring(0, 50) + '...',
        });

        if (part.inlineData.data) {
            logger.debug('[parseImageResponse] ✅ Successfully extracted image data');
            return part.inlineData.data;
        } else {
            console.error('[parseImageResponse] inlineData exists but data field is empty');
            throw createCartoonError('Image data field is empty in API response');
        }
    }

    // Fallback to text field for debugging
    if (part && 'text' in part && part.text) {
        logger.warn('[parseImageResponse] ⚠️ Received text instead of image data:', {
            textLength: part.text.length,
            textPreview: part.text.substring(0, 200),
        });
        throw createCartoonError('API returned text description instead of image. Ensure you are using an image generation model.');
    }

    // Log the actual response structure for debugging
    console.error('[parseImageResponse] ❌ Unexpected response structure');
    console.error('[parseImageResponse] Full response:', JSON.stringify(response, null, 2));
    throw createCartoonError('Could not extract image data from API response. Check console for full response structure.');
};

export const parseBatchAnalysisResponse = (response: GeminiResponse): Array<{ summary: string; humorScore: number }> => {
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Clean the response text - remove markdown code block markers if present
    let cleanedResponse = responseText;
    if (responseText.includes('```json')) {
        cleanedResponse = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (responseText.includes('```')) {
        cleanedResponse = responseText.replace(/```\s*/g, '');
    }

    // Extract JSON from response - look for array pattern
    const jsonMatch = cleanedResponse.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
        console.error('[parseBatchAnalysisResponse] No JSON array found in response');
        // Return empty array to indicate failure for this batch
        return [];
    }

    try {
        // Clean up the matched JSON string - handle trailing commas more thoroughly
        const jsonStr = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1')  // Remove all trailing commas before } or ]
            .replace(/[\n\r]+/g, ' '); // Replace newlines with spaces

        const batchResults = JSON.parse(jsonStr) as Array<{ summary: string; humorScore: number }>;

        // Validate results structure
        if (!Array.isArray(batchResults)) {
            console.error('[parseBatchAnalysisResponse] Parsed JSON is not an array');
            return [];
        }

        return batchResults;
    } catch (parseError) {
        console.error('[parseBatchAnalysisResponse] Failed to parse JSON', parseError);
        logger.debug('[parseBatchAnalysisResponse] Attempted to parse:', jsonMatch[0].substring(0, 200));
        return [];
    }
};

/**
 * Extract and format text elements from comic script panels
 * Handles both new ComicScriptPanel format and legacy string format
 */
export const extractTextElements = (script: ComicScript): Array<{ panel: number; text: string; type: string }> => {
    const textElements: Array<{ panel: number; text: string; type: string }> = [];

    script.panels.forEach((panel, index) => {
        const panelNum = index + 1;

        // Handle new ComicScriptPanel format with explicit visibleText
        if (panel && typeof panel === 'object' && 'visibleText' in panel) {
            const scriptPanel = panel as ComicScriptPanel;
            if (Array.isArray(scriptPanel.visibleText)) {
                scriptPanel.visibleText.forEach((textElem) => {
                    if (textElem.content && textElem.content.trim()) {
                        const cleaned = textElem.content.trim().toUpperCase();
                        if (cleaned.split(' ').length <= 4) {
                            textElements.push({
                                panel: panelNum,
                                text: cleaned,
                                type: textElem.type || 'sign',
                            });
                            logger.debug(`[extractTextElements] Panel ${panelNum}: Found text from ${textElem.type}: "${cleaned}"`);
                        }
                    }
                });
            }
        } else {
            // Handle legacy string format
            const panelText = typeof panel === 'string' ? panel : (panel as ComicPanel)?.description || '';

            // Extract text in quotes or dialogue
            const quotedText = panelText.match(/"([^"]+)"/g) || [];
            quotedText.forEach((text: string) => {
                const cleaned = text.replace(/"/g, '').toUpperCase().trim();
                if (cleaned && cleaned.split(' ').length <= 4) {
                    textElements.push({
                        panel: panelNum,
                        text: cleaned,
                        type: 'dialogue',
                    });
                }
            });

            // Extract sign/label text (words like "sign:", "label:", "text:" followed by content)
            const labelMatch = panelText.match(/\b(?:sign|label|text|caption):\s*([^,.!?]+)/gi) || [];
            labelMatch.forEach((match: string) => {
                const text = match.split(':')[1]?.trim().toUpperCase();
                if (text && text.split(' ').length <= 3) {
                    textElements.push({
                        panel: panelNum,
                        text,
                        type: 'label',
                    });
                }
            });
        }
    });

    logger.debug('[extractTextElements] Extracted', textElements.length, 'text elements total');
    return textElements;
};

/**
 * Validate text elements before sending to vision API
 * Ensures all text is properly formatted and within limits
 */
export const validateTextElements = (textElements: Array<{ panel: number; text: string; type: string }>): void => {
    logger.debug('[validateTextElements] Validating', textElements.length, 'text elements');

    const issues: string[] = [];

    textElements.forEach((elem) => {
        // Check if text is empty
        if (!elem.text || elem.text.trim().length === 0) {
            issues.push(`Panel ${elem.panel}: Empty text element`);
            return;
        }

        // Check word count (max 4 words)
        const wordCount = elem.text.split(/\s+/).length;
        if (wordCount > 4) {
            issues.push(`Panel ${elem.panel}: Text exceeds 4 words ("${elem.text}" = ${wordCount} words)`);
        }

        // Check if text is all caps
        if (elem.text !== elem.text.toUpperCase()) {
            logger.warn(`[validateTextElements] Panel ${elem.panel}: Text not in ALL CAPS: "${elem.text}"`);
        }

        // Warn about special characters that might render poorly
        if (/[^\w\s\-'!?.]/.test(elem.text)) {
            logger.warn(`[validateTextElements] Panel ${elem.panel}: Contains special characters: "${elem.text}"`);
        }
    });

    // Log validation results
    if (issues.length === 0) {
        logger.debug('[validateTextElements] ✅ All text elements valid');
    } else {
        logger.warn('[validateTextElements] ⚠️ Issues found:');
        issues.forEach(issue => logger.warn(`  - ${issue}`));
    }
};

import { useState } from 'react';
import { useCartoonStore } from '../store/cartoonStore';
import { useNewsStore } from '../store/newsStore';
import { geminiService } from '../services/geminiService';
import { ImageGenerationRateLimiter } from '../utils/rateLimiter';
import { AppErrorHandler } from '../utils/errorHandler';
import { addWatermark } from '../utils/imageUtils';

import type { GenerationPhase } from '../store/cartoonStore';

export interface UseImageGenerationResult {
  generate: () => Promise<void>;
  isGenerating: boolean;
  secondsUntilNext: number;
  error: string | null;
  generationPhase: GenerationPhase;
}

export function useImageGeneration(): UseImageGenerationResult {
  const {
    cartoon,
    comicPrompt,
    selectedConceptIndex,
    setImagePath,
    setLoading,
    setError,
    generationPhase,
    setGenerationPhase,
  } = useCartoonStore();
  const { selectedArticles } = useNewsStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState(0);
  const [error, setLocalError] = useState<string | null>(null);

  const selectedConcept = cartoon && selectedConceptIndex !== null && cartoon.ideas[selectedConceptIndex]
    ? { ...cartoon.ideas[selectedConceptIndex], location: cartoon.location }
    : undefined;

  const generate = async (): Promise<void> => {
    if (!selectedConcept) {
      setLocalError('No cartoon concept selected');
      return;
    }
    if (!comicPrompt) {
      setLocalError('No cartoon script generated');
      return;
    }

    setIsGenerating(true);
    setLocalError(null);
    setLoading(true);

    try {
      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();
      if (timeUntilNext > 0) {
        const secs = Math.ceil(timeUntilNext / 1000);
        setSecondsUntilNext(secs);
        const timer = setInterval(() => {
          setSecondsUntilNext(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        throw new Error(
          `Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''}.`
        );
      }

      const panelCount = comicPrompt.panels ? comicPrompt.panels.length : 4;
      const cartoonImage = await geminiService.generateCartoonImage(
        selectedConcept,
        selectedArticles,
        panelCount,
        setGenerationPhase
      );
      const imageUrl = `data:${cartoonImage.mimeType};base64,${cartoonImage.base64Data}`;
      const watermarkedUrl = await addWatermark(imageUrl);
      setImagePath(watermarkedUrl);
      setLocalError(null);
    } catch (err) {
      const appError = AppErrorHandler.handleError(err);
      const userMessage = AppErrorHandler.getUserMessage(appError);
      setLocalError(userMessage);
      setError(userMessage);
    } finally {
      setIsGenerating(false);
      setLoading(false);
      setGenerationPhase(null);
    }
  };

  return { generate, isGenerating, secondsUntilNext, error, generationPhase };
}

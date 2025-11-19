import { useState } from 'react';
import { useCartoonStore } from '../store/cartoonStore';
import { useNewsStore } from '../store/newsStore';
import { geminiService } from '../services/geminiService';
import { ImageGenerationRateLimiter } from '../utils/rateLimiter';
import { AppErrorHandler } from '../utils/errorHandler';

export const useImageGenerator = () => {
  const { cartoon, comicPrompt, imagePath, setImagePath, setLoading, setError, selectedConceptIndex } = useCartoonStore();
  const { selectedArticles } = useNewsStore();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const selectedConcept = cartoon && selectedConceptIndex !== null && cartoon.ideas[selectedConceptIndex] ? {
    ...cartoon.ideas[selectedConceptIndex],
    location: cartoon.location,
  } : undefined;

  const handleGenerateImage = async () => {
    if (!selectedConcept) {
      setLocalError('No cartoon concept selected');
      return;
    }

    if (!comicPrompt) {
      setLocalError('No cartoon script generated');
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    setLoading(true);

    try {
      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();
      if (timeUntilNext > 0) {
        const secondsRemaining = Math.ceil(timeUntilNext / 1000);
        setTimeRemaining(secondsRemaining);
        const timer = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        throw new Error(
          `Rate limit exceeded. Please wait ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}.`
        );
      }

      const panelCount = comicPrompt.panels ? comicPrompt.panels.length : 4;
      const cartoonImage = await geminiService.generateCartoonImage(selectedConcept, selectedArticles, panelCount);
      const imageUrl = `data:${cartoonImage.mimeType};base64,${cartoonImage.base64Data}`;
      setImagePath(imageUrl);
      setLocalError(null);
    } catch (err) {
      const appError = AppErrorHandler.handleError(err);
      const userMessage = AppErrorHandler.getUserMessage(appError);
      setLocalError(userMessage);
      setError(userMessage);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imagePath || !selectedConcept) return;

    const link = document.createElement('a');
    link.href = imagePath;
    link.download = `cartoon-${selectedConcept.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerateImage = () => {
    geminiService.clearImageCache();
    setImagePath('');
    setLocalError(null);
  };

  return {
    cartoon,
    comicPrompt,
    imagePath,
    localLoading,
    localError,
    timeRemaining,
    selectedConcept,
    handleGenerateImage,
    handleDownload,
    handleRegenerateImage,
  };
};

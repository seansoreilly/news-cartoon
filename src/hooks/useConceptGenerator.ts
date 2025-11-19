import { useState } from 'react';
import { useNewsStore } from '../store/newsStore';
import { useLocationStore } from '../store/locationStore';
import { useCartoonStore } from '../store/cartoonStore';
import { geminiService } from '../services/geminiService';
import { AppErrorHandler } from '../utils/errorHandler';

export const useConceptGenerator = () => {
  const { selectedArticles } = useNewsStore();
  const { location } = useLocationStore();
  const { cartoon, setCartoon, setLoading, setError } = useCartoonStore();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGenerateConcepts = async () => {
    if (selectedArticles.length === 0) {
      setLocalError('Please select at least one article');
      return;
    }

    if (!location?.name) {
      setLocalError('Search keywords are required to generate concepts');
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    setLoading(true);

    try {
      const cartoonData = await geminiService.generateCartoonConcepts(
        selectedArticles,
        location.name
      );
      setCartoon(cartoonData);
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

  return {
    cartoon,
    localLoading,
    localError,
    handleGenerateConcepts,
    selectedArticles,
    location,
  };
};

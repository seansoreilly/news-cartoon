import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import { useNewsStore } from '../../store/newsStore';
import { geminiService } from '../../services/geminiService';
import { ImageGenerationRateLimiter } from '../../utils/rateLimiter';
import { AppErrorHandler } from '../../utils/errorHandler';

const ImageGenerator: React.FC = React.memo(() => {
  const { cartoon, imagePath, setImagePath, setLoading, setError } = useCartoonStore();
  const { selectedArticles } = useNewsStore();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [panelCount, setPanelCount] = useState<number>(4);

  const selectedConcept = cartoon ? {
    ...cartoon.ideas[0],
    location: cartoon.location,
  } : undefined;

  const handleGenerateImage = async () => {
    if (!selectedConcept) {
      setLocalError('No cartoon concept selected');
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
    // Clear the image cache so a new image will be generated
    geminiService.clearImageCache();
    setImagePath('');
    setLocalError(null);
  };

  if (!selectedConcept) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Cartoon Image</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">
            Select a cartoon concept to generate an image
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Cartoon Image</h2>

      {!imagePath ? (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">
              Selected Concept: {selectedConcept.title}
            </h3>
            <p className="text-gray-600 mb-4">{selectedConcept.premise}</p>
            <p className="text-sm text-gray-500 mb-4">Why it's funny: {selectedConcept.why_funny}</p>

            <div className="mb-4">
              <label htmlFor="panel-count" className="block text-sm font-medium text-gray-700 mb-2">
                Comic Style:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPanelCount(1)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    panelCount === 1
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={localLoading}
                >
                  Single Panel
                </button>
                <button
                  onClick={() => setPanelCount(4)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    panelCount === 4
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={localLoading}
                >
                  4-Panel Strip
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={localLoading || timeRemaining > 0}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-busy={localLoading}
            >
              {localLoading
                ? 'Generating Image...'
                : timeRemaining > 0
                  ? `Wait ${timeRemaining}s`
                  : 'Generate Image'}
            </button>

            {localError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-800 font-medium">{localError}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-green-200">
            <h3 className="font-semibold text-gray-800 mb-3">
              Generated Cartoon: {selectedConcept.title}
            </h3>

            <div className="mb-4 border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center min-h-64">
              <img src={imagePath} alt={selectedConcept.title} className="max-w-full h-auto" />
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleDownload}
                className="flex-1 min-w-[150px] bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Download Image
              </button>

              <button
                onClick={handleRegenerateImage}
                className="flex-1 min-w-[150px] bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Generate New Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ImageGenerator.displayName = 'ImageGenerator';

export default ImageGenerator;

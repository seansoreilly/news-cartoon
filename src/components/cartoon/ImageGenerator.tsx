import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import { useNewsStore } from '../../store/newsStore';
import { geminiService } from '../../services/geminiService';
import { ImageGenerationRateLimiter } from '../../utils/rateLimiter';
import { AppErrorHandler } from '../../utils/errorHandler';

const ImageGenerator: React.FC = React.memo(() => {
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

      // Extract panel count from the generated script
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
    // Clear the image cache so a new image will be generated
    geminiService.clearImageCache();
    setImagePath('');
    setLocalError(null);
  };

  // Don't show this section until a prompt has been generated
  if (!cartoon || !cartoon.ideas || cartoon.ideas.length === 0 || !comicPrompt) {
    return null;
  }

  if (!selectedConcept) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 md:p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-sm">4</span>
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Cartoon</h2>
      </div>

      {!imagePath ? (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">
              Selected Concept: {selectedConcept.title}
            </h3>
            <p className="text-gray-600 mb-4">{selectedConcept.premise}</p>
            <p className="text-sm text-gray-500 mb-4">Why it's funny: {selectedConcept.why_funny}</p>

            <button
              onClick={handleGenerateImage}
              disabled={localLoading || timeRemaining > 0 || !comicPrompt}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                !comicPrompt
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed animate-flash-green'
              }`}
              aria-busy={localLoading}
            >
              {localLoading
                ? 'Generating Cartoon...'
                : timeRemaining > 0
                  ? `Wait ${timeRemaining}s`
                  : 'Generate Cartoon'}
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
              Generate Cartoon: {selectedConcept.title}
            </h3>

            <div className="mb-4 border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center min-h-48 sm:min-h-56 md:min-h-64">
              <img
                src={imagePath}
                alt={selectedConcept.title}
                className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(imagePath, '_blank')}
                title="Click to open in new tab"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={handleDownload}
                className="w-full bg-blue-600 text-white px-3 sm:px-6 py-2 text-sm sm:text-base rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Download Cartoon
              </button>

              <button
                onClick={handleRegenerateImage}
                disabled={localLoading}
                className="w-full bg-gray-200 text-gray-800 px-3 sm:px-6 py-2 text-sm sm:text-base rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate New Cartoon
              </button>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 text-center">
                <strong>Disclaimer:</strong> This cartoon was generated by AI based on news content.
                It is intended for entertainment and editorial commentary purposes only, and is not
                intended to cause offense or misrepresent any individuals, groups, or organizations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ImageGenerator.displayName = 'ImageGenerator';

export default ImageGenerator;

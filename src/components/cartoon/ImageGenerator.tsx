import React from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import { geminiService } from '../../services/geminiService';
import { useGeneratedImageUrl } from '../../hooks/useGeneratedImageUrl';
import { useImageGeneration } from '../../hooks/useImageGeneration';
import { useGalleryPublish } from '../../hooks/useGalleryPublish';
import ShareButtons from '../common/ShareButtons';
import RecoverableError from '../common/RecoverableError';
import HalftoneSpinner from '../common/HalftoneSpinner';
import GenerationProgress from './GenerationProgress';

const ImageGenerator: React.FC = React.memo(() => {
  const { cartoon, comicPrompt, imagePath, setImagePath, selectedConceptIndex } = useCartoonStore();

  const selectedConcept = cartoon && selectedConceptIndex !== null && cartoon.ideas[selectedConceptIndex] ? {
    ...cartoon.ideas[selectedConceptIndex],
    location: cartoon.location,
  } : undefined;

  const { blobUrl } = useGeneratedImageUrl(imagePath ?? null);
  const { generate, isGenerating, secondsUntilNext, error: generationError, generationPhase } = useImageGeneration();
  const { publish, isPublishing, publishStatus, publishError, resetPublish } = useGalleryPublish();

  const handleDownload = (): void => {
    if (!imagePath || !selectedConcept) return;
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = `cartoon-${selectedConcept.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerateImage = (): void => {
    geminiService.clearImageCache();
    setImagePath('');
    resetPublish();
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
              onClick={generate}
              disabled={isGenerating || secondsUntilNext > 0 || !comicPrompt}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                !comicPrompt
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : `bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed ${isGenerating ? 'animate-flash-amber' : 'animate-flash-green'}`
              }`}
              aria-busy={isGenerating}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isGenerating && <HalftoneSpinner size="sm" />}
                {isGenerating
                  ? 'Generating Cartoon…'
                  : secondsUntilNext > 0
                    ? `Wait ${secondsUntilNext}s`
                    : 'Generate Cartoon'}
              </span>
            </button>

            <GenerationProgress phase={generationPhase} active={isGenerating} />

            {generationError && (
              <RecoverableError
                error={generationError}
                onRetry={generate}
                className="mt-4"
              />
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
              <a href={blobUrl || imagePath} target="_blank" rel="noopener noreferrer" title="Click to open in new tab">
                <img
                  src={imagePath}
                  alt={selectedConcept.title}
                  className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button
                onClick={handleDownload}
                className="w-full bg-blue-600 text-white px-3 sm:px-6 py-2 text-sm sm:text-base rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px]"
              >
                Download
              </button>

              <button
                onClick={publish}
                disabled={isPublishing || publishStatus === 'success'}
                className={`w-full px-3 sm:px-6 py-2 text-sm sm:text-base rounded-lg font-medium transition-colors min-h-[44px] min-w-[44px] ${
                  publishStatus === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isPublishing && <HalftoneSpinner size="sm" />}
                  {isPublishing ? 'Publishing…' : publishStatus === 'success' ? 'Published!' : 'Publish to Gallery'}
                </span>
              </button>

              <button
                onClick={handleRegenerateImage}
                disabled={isGenerating || isPublishing}
                className="w-full bg-gray-200 text-gray-800 px-3 sm:px-6 py-2 text-sm sm:text-base rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
              >
                Regenerate
              </button>
            </div>

            {publishError && (
              <RecoverableError
                error={publishError}
                onRetry={publish}
                className="mt-3"
              />
            )}

            {publishStatus === 'success' && (
              <div className="mt-3 bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-green-800 text-sm">
                  Cartoon published to gallery! <a href="/gallery" className="underline font-medium">View Gallery</a>
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col items-center justify-center space-y-2">
              <p className="text-sm text-gray-500 font-medium">Share your cartoon</p>
              <ShareButtons
                url={window.location.origin}
                title={`Check out this AI cartoon: ${selectedConcept.title}`}
                description={selectedConcept.premise}
              />
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

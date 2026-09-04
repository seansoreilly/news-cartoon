import React from 'react';
import { Link } from 'react-router-dom';
import LocationDetector from '../location/LocationDetector';
import ExpressProgress from './ExpressProgress';
import ShareButtons from '../common/ShareButtons';
import RecoverableError from '../common/RecoverableError';
import HalftoneSpinner from '../common/HalftoneSpinner';
import { useLocationStore } from '../../store/locationStore';
import { useNewsStore } from '../../store/newsStore';
import { useCartoonStore } from '../../store/cartoonStore';
import { useExpressGenerate } from '../../hooks/useExpressGenerate';
import { useGeneratedImageUrl } from '../../hooks/useGeneratedImageUrl';
import { useGalleryPublish } from '../../hooks/useGalleryPublish';
import { geminiService } from '../../services/geminiService';

const ExpressWorkflow: React.FC = () => {
  const location = useLocationStore((s) => s.location);
  const selectedArticles = useNewsStore((s) => s.selectedArticles);
  const { cartoon, imagePath, selectedConceptIndex, setImagePath } = useCartoonStore();
  const { run, retry, phase, error, isRunning, secondsUntilNext } = useExpressGenerate();
  const { blobUrl } = useGeneratedImageUrl(imagePath ?? null);
  const { publish, isPublishing, publishStatus, publishError, resetPublish } = useGalleryPublish();

  const hasLocation = Boolean(location?.name && location.name.trim() !== '');

  const selectedConcept =
    cartoon && selectedConceptIndex !== null && cartoon.ideas[selectedConceptIndex]
      ? { ...cartoon.ideas[selectedConceptIndex], location: cartoon.location }
      : undefined;

  const handleDownload = (): void => {
    if (!imagePath || !selectedConcept) return;
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = `cartoon-${selectedConcept.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerate = (): void => {
    geminiService.clearImageCache();
    setImagePath('');
    resetPublish();
  };

  const buttonDisabled = !hasLocation || isRunning || secondsUntilNext > 0;
  const buttonLabel = isRunning
    ? 'Generating Cartoon…'
    : secondsUntilNext > 0
      ? `Wait ${secondsUntilNext}s`
      : 'Generate Cartoon';

  return (
    <div className="space-y-6">
      <section aria-label="Topic step">
        <LocationDetector />
      </section>

      <section
        aria-label="Express generate"
        className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 md:p-6 rounded-lg shadow-md"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <span aria-hidden="true" className="text-xl sm:text-2xl">
            ⚡
          </span>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Fast Mode</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          One press. We pick the top stories, draft a concept, and render the cartoon.
        </p>

        <button
          type="button"
          onClick={run}
          disabled={buttonDisabled}
          className={`w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 shadow-lg ${
            isRunning ? 'animate-flash-amber' : hasLocation && !imagePath ? 'animate-flash-green' : ''
          }`}
          aria-busy={isRunning}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isRunning && <HalftoneSpinner size="sm" />}
            {buttonLabel}
          </span>
        </button>

        {!hasLocation && !isRunning && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Enter a topic or detect your location above to enable Generate.
          </p>
        )}

        {(isRunning || (phase !== 'idle' && phase !== 'done')) && (
          <ExpressProgress phase={phase} active={isRunning} />
        )}

        {error && (
          <RecoverableError
            error={error}
            onRetry={retry}
            className="mt-4"
          />
        )}
      </section>

      {imagePath && selectedConcept && (
        <section
          aria-label="Cartoon result"
          className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 md:p-6 rounded-lg shadow-md"
        >
          <div className="bg-white p-4 rounded-lg border-2 border-green-200">
            <h3 className="font-semibold text-gray-800 mb-3">
              Generated Cartoon: {selectedConcept.title}
            </h3>

            <div className="mb-4 border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center min-h-48 sm:min-h-56 md:min-h-64">
              <a
                href={blobUrl || imagePath}
                target="_blank"
                rel="noopener noreferrer"
                title="Click to open in new tab"
              >
                <img
                  src={imagePath}
                  alt={selectedConcept.title}
                  className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            </div>

            <div className="mb-4 p-4 bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200 rounded-lg space-y-4">
              <div>
                <p className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-[0.18em] text-amber-700 mb-1.5">
                  The concept
                </p>
                <p className="text-sm sm:text-base text-gray-800 leading-relaxed">
                  {selectedConcept.premise}
                </p>
              </div>

              {selectedConcept.why_funny && (
                <div>
                  <p className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-[0.18em] text-amber-700 mb-1.5">
                    Why it's funny
                  </p>
                  <p className="text-sm text-gray-700 italic leading-relaxed">
                    {selectedConcept.why_funny}
                  </p>
                </div>
              )}

              {selectedArticles.length > 0 && (
                <div>
                  <p className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-[0.18em] text-amber-700 mb-1.5">
                    Based on
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    {selectedArticles.map((article, i) => (
                      <li key={`${article.url}-${i}`} className="flex gap-2 items-start">
                        <span className="text-amber-600 font-bold flex-shrink-0 mt-0.5" aria-hidden="true">
                          ◦
                        </span>
                        {article.url ? (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-amber-700 hover:underline line-clamp-2"
                          >
                            {article.title}
                          </a>
                        ) : (
                          <span className="line-clamp-2">{article.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full bg-blue-600 text-white px-3 sm:px-6 py-2 text-sm sm:text-base rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px]"
              >
                Download
              </button>

              <button
                type="button"
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
                  {isPublishing
                    ? 'Publishing…'
                    : publishStatus === 'success'
                      ? 'Published!'
                      : 'Publish to Gallery'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRunning || isPublishing}
                className="w-full bg-gray-200 text-gray-800 px-3 sm:px-6 py-2 text-sm sm:text-base rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
              >
                Regenerate
              </button>
            </div>

            {publishError && (
              <RecoverableError error={publishError} onRetry={publish} className="mt-3" />
            )}

            {publishStatus === 'success' && (
              <div className="mt-3 bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-green-800 text-sm">
                  Cartoon published to gallery!{' '}
                  <Link to="/gallery" className="underline font-medium">
                    View Gallery
                  </Link>
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
        </section>
      )}
    </div>
  );
};

export default ExpressWorkflow;

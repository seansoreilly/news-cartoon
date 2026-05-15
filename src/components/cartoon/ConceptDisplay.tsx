import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import { useNewsStore } from '../../store/newsStore';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import RecoverableError from '../common/RecoverableError';
import type { CartoonConcept } from '../../types/cartoon';

const ConceptDisplay: React.FC = () => {
  const { cartoon, comicPrompt, selectedConceptIndex, setSelectedConceptIndex, setComicPrompt, setError, setLoading } = useCartoonStore();
  const { selectedArticles } = useNewsStore();
  const [localError, setLocalError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedPanelCount, setSelectedPanelCount] = useState<number>(4);

  if (!cartoon || !cartoon.ideas || cartoon.ideas.length === 0) {
    return null;
  }

  const handleConceptClick = (index: number) => {
    setSelectedConceptIndex(index);
    setLocalError(null);
  };

  const handleGeneratePrompt = async () => {
    if (selectedConceptIndex === null || !cartoon.ideas[selectedConceptIndex]) {
      setLocalError('Please select a concept first');
      return;
    }

    const selectedConcept = cartoon.ideas[selectedConceptIndex];

    setLocalLoading(true);
    setLocalError(null);
    setLoading(true);

    try {
      console.log('[ConceptDisplay] Generating cartoon prompt for concept:', selectedConcept.title);
      const prompt = await geminiService.generateComicPrompt(
        selectedConcept,
        selectedArticles,
        selectedPanelCount
      );
      setComicPrompt(prompt);
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

  const accentPalette = [
    { border: 'border-l-purple-400', badge: 'bg-purple-100 text-purple-700' },
    { border: 'border-l-pink-400', badge: 'bg-pink-100 text-pink-700' },
    { border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700' },
    { border: 'border-l-blue-400', badge: 'bg-blue-100 text-blue-700' },
    { border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
  ];

  const selectedConcept =
    selectedConceptIndex !== null ? cartoon.ideas[selectedConceptIndex] : null;
  const showStickyBar = selectedConcept !== null && !comicPrompt;

  return (
    <div className="mt-8">
      <p className="mb-4 text-gray-600">Select a concept to generate the cartoon:</p>

      <div className="grid grid-cols-1 gap-3">
        {cartoon.ideas.map((concept: CartoonConcept, index: number) => {
          const isSelected = selectedConceptIndex === index;
          const accent = accentPalette[index % accentPalette.length];

          return (
            <div
              key={index}
              onClick={() => handleConceptClick(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleConceptClick(index);
                }
              }}
              aria-pressed={isSelected}
              className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 border-l-4 ${accent.border} cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 border-purple-500 shadow-lg transform scale-[1.02]'
                  : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-md hover:bg-gradient-to-br hover:from-purple-50/30 hover:via-pink-50/30 hover:to-amber-50/30'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${accent.badge}`}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm sm:text-base flex-1">
                      {concept.title}
                    </h3>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600 text-white flex-shrink-0">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2 sm:line-clamp-4">
                  {concept.premise}
                </p>
                {concept.why_funny && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Why it's funny: {concept.why_funny}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedConceptIndex !== null && (
        <div className="mt-6">
          {localError && (
            <RecoverableError
              error={localError}
              onRetry={() => {
                setLocalError(null);
                handleGeneratePrompt();
              }}
              className="mb-4"
            />
          )}

          <div className="mb-4 bg-white p-3 sm:p-4 rounded-lg border-2 border-purple-200">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-3">
              Number of Panels:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((panelNum) => (
                <button
                  key={panelNum}
                  onClick={() => setSelectedPanelCount(panelNum)}
                  className={`px-2 sm:px-3 py-2 text-sm sm:text-base rounded-lg font-medium transition-all ${
                    selectedPanelCount === panelNum
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={localLoading}
                >
                  {panelNum}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGeneratePrompt}
            disabled={localLoading}
            className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 shadow-lg ${localLoading ? 'animate-flash-amber' : (!comicPrompt ? 'animate-flash-green' : '')}`}
            aria-label="Generate prompt"
            aria-busy={localLoading}
          >
            {localLoading ? '✨ Generating Prompt...' : '✨ Generate Prompt'}
          </button>
        </div>
      )}

      {showStickyBar && selectedConcept && (
        <div
          role="region"
          aria-label="Selected concept summary"
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none"
        >
          <div className="container mx-auto max-w-[1000px] pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-lg border border-purple-200 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 animate-[slideUp_300ms_ease-out]">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold flex-shrink-0">
                ✓
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Selected</p>
                <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                  {selectedConcept.title}
                </p>
              </div>
              <button
                onClick={handleGeneratePrompt}
                disabled={localLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md min-h-[44px] whitespace-nowrap text-sm sm:text-base"
                aria-busy={localLoading}
              >
                {localLoading ? 'Working…' : 'Continue ▸'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptDisplay;

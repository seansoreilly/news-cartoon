import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import { useNewsStore } from '../../store/newsStore';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import type { CartoonConcept } from '../../types/cartoon';

const ConceptDisplay: React.FC = () => {
  const { cartoon, selectedConceptIndex, setSelectedConceptIndex, setComicPrompt, setError, setLoading } = useCartoonStore();
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

  return (
    <div className="mt-8">
      <p className="mb-4 text-gray-600">Select a concept to generate the cartoon:</p>

      <div className="grid grid-cols-1 gap-3">
        {cartoon.ideas.map((concept: CartoonConcept, index: number) => {
          const isSelected = selectedConceptIndex === index;

          return (
            <div
              key={index}
              onClick={() => handleConceptClick(index)}
              className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 border-purple-500 shadow-lg transform scale-[1.02]'
                  : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-md hover:bg-gradient-to-br hover:from-purple-50/30 hover:via-pink-50/30 hover:to-amber-50/30'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm sm:text-base flex-1">
                    {concept.title}
                  </h3>
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
            <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded">
              <p className="text-red-800 text-sm">{localError}</p>
            </div>
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
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 shadow-lg animate-flash-green"
            aria-label="Generate prompt"
            aria-busy={localLoading}
          >
            {localLoading ? '✨ Generating Prompt...' : '✨ Generate Prompt'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConceptDisplay;

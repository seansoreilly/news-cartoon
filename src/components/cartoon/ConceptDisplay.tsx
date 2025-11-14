import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import { useNewsStore } from '../../store/newsStore';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import type { CartoonConcept } from '../../types/cartoon';

const ConceptDisplay: React.FC = () => {
  const { cartoon, selectedConceptIndex, setSelectedConceptIndex, setComicScript, setError, setLoading } = useCartoonStore();
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

  const handleGenerateScript = async () => {
    if (selectedConceptIndex === null || !cartoon.ideas[selectedConceptIndex]) {
      setLocalError('Please select a concept first');
      return;
    }

    const selectedConcept = cartoon.ideas[selectedConceptIndex];

    setLocalLoading(true);
    setLocalError(null);
    setLoading(true);

    try {
      console.log('[ConceptDisplay] Generating cartoon script for concept:', selectedConcept.title);
      const script = await geminiService.generateComicScript(
        selectedConcept,
        selectedArticles,
        selectedPanelCount
      );
      setComicScript(script);
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
      <h2 className="text-xl font-semibold mb-4">Cartoon Concepts</h2>
      <p className="mb-4 text-gray-600">Select a concept to generate the cartoon:</p>

      <div className="space-y-4">
        {cartoon.ideas.map((concept: CartoonConcept, index: number) => {
          const isSelected = selectedConceptIndex === index;

          return (
            <div
              key={index}
              onClick={() => handleConceptClick(index)}
              className={`
                relative overflow-hidden rounded-lg p-4 cursor-pointer transition-all duration-300
                ${isSelected
                  ? 'bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 border-2 border-purple-500 shadow-lg transform scale-[1.02]'
                  : 'border border-gray-200 hover:border-purple-400 hover:shadow-md bg-white'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-600 text-white">
                    Selected
                  </span>
                </div>
              )}

              <h3 className={`font-semibold text-lg mb-2 ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>
                {concept.title}
              </h3>
              <p className={`mb-2 ${isSelected ? 'text-gray-700' : 'text-gray-600'}`}>
                {concept.premise}
              </p>
              {concept.why_funny && (
                <p className={`italic text-sm ${isSelected ? 'text-purple-700' : 'text-gray-500'}`}>
                  <span className="font-medium">Why it's funny:</span> {concept.why_funny}
                </p>
              )}
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
            onClick={handleGenerateScript}
            disabled={localLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 shadow-lg"
            aria-label="Generate cartoon script"
            aria-busy={localLoading}
          >
            {localLoading ? '✨ Generating Script...' : '✨ Generate Cartoon Script'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConceptDisplay;

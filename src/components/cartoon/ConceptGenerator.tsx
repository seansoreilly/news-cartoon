import React, { useState } from 'react';
import { useNewsStore } from '../../store/newsStore';
import { useLocationStore } from '../../store/locationStore';
import { useCartoonStore } from '../../store/cartoonStore';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';

const ConceptGenerator: React.FC = () => {
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

  if (cartoon && cartoon.ideas && cartoon.ideas.length > 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Concepts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generated {cartoon.ideas.length} concept{cartoon.ideas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleGenerateConcepts}
            disabled={localLoading || selectedArticles.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] min-w-[44px]"
          >
            Regenerate Concepts
          </button>
        </div>
      </div>
    );
  }

  if (!location?.name) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate Concepts</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg mb-2">
            Please enter search keywords first
          </p>
          <p className="text-sm text-gray-500">
            Search keywords are needed to find relevant news articles
          </p>
        </div>
      </div>
    );
  }

  if (selectedArticles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate Concepts</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg mb-2">
            Please select articles above to generate concepts
          </p>
          <p className="text-sm text-gray-500">
            Choose one or more articles to turn into a cartoon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-sm">3</span>
        <h2 className="text-2xl font-bold text-gray-800">Generate Concepts</h2>
      </div>

      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
        <button
          onClick={handleGenerateConcepts}
          disabled={localLoading}
          className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 shadow-lg ${localLoading ? 'animate-flash-amber' : 'animate-flash-green'}`}
          aria-busy={localLoading}
        >
          {localLoading ? 'Generating Concepts...' : 'Generate Concepts'}
        </button>

        {localError && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-800 font-medium">{localError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptGenerator;

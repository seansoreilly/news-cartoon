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
      setLocalError('Please select at least one news article');
      return;
    }

    if (!location?.name) {
      setLocalError('Location is required to generate concepts');
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
            <h2 className="text-2xl font-bold text-gray-800">Cartoon Concepts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generated {cartoon.ideas.length} concept{cartoon.ideas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleGenerateConcepts}
            disabled={localLoading || selectedArticles.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Regenerate Concepts
          </button>
        </div>
      </div>
    );
  }

  if (selectedArticles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate Cartoon Concepts</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg mb-2">
            Select news articles above to generate cartoon concepts
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
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate Cartoon Concepts</h2>

      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
        <div className="mb-4">
          <p className="text-gray-700 font-medium mb-2">
            Ready to generate: {selectedArticles.length} article{selectedArticles.length !== 1 ? 's' : ''} selected
          </p>
          <div className="text-sm text-gray-600">
            {selectedArticles.map((article, idx) => (
              <div key={idx} className="flex items-start gap-2 mt-1">
                <span className="text-purple-600">•</span>
                <span className="line-clamp-1">{article.title}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerateConcepts}
          disabled={localLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-busy={localLoading}
        >
          {localLoading ? 'Generating Concepts...' : 'Generate Cartoon Concepts'}
        </button>

        {localError && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-800 font-medium">{localError}</p>
          </div>
        )}

        {localLoading && (
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-800 text-sm">
              AI is analyzing the news and creating funny cartoon concepts...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptGenerator;

import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import { useNewsStore } from '../../store/newsStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import ConceptGenerator from './ConceptGenerator';
import Collapsible from '../common/Collapsible';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import { useImageGenerator } from '../../hooks/useImageGenerator'; // Import the image generator hook

import type { CartoonConcept, ComicPanel, ComicScriptPanel } from '../../types/cartoon';

const CartoonStudio: React.FC = () => {
  const {
    cartoon,
    selectedConceptIndex,
    setSelectedConceptIndex,
    comicPrompt,
    setComicPrompt,
    setError: setCartoonStoreError,
    setLoading: setCartoonStoreLoading,
    isLoading: cartoonStoreLoading,
  } = useCartoonStore();
  const { selectedArticles } = useNewsStore();
  usePreferencesStore(); // Initialize preferences store (not destructuring unused properties)

  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [model, setModel] = useState('gemini-1.5-pro');
  const [cartoonStyle, setCartoonStyle] = useState('Satirical');
  const panelCount = 4; // Default panel count

  // Image generation hook
  const {
    imagePath,
    localLoading: imageLoading,
    localError: imageError,
    timeRemaining,
    handleGenerateImage,
    handleDownload,
    handleRegenerateImage,
  } = useImageGenerator();

  const handleConceptSelect = (index: number) => {
    setSelectedConceptIndex(index);
    setScriptError(null); // Clear script error on new concept selection
    // Clear comic prompt on new concept selection by resetting the store
    // Note: setComicPrompt is called via setSelectedConceptIndex which clears it
  };

  const selectedConcept =
    selectedConceptIndex !== null && cartoon?.ideas
      ? cartoon.ideas[selectedConceptIndex]
      : null;

  const handleGenerateScript = async (concept: CartoonConcept) => {
    if (selectedArticles.length === 0) {
      setScriptError('Please select articles to generate a script.');
      return;
    }

    setScriptLoading(true);
    setScriptError(null);
    setCartoonStoreLoading(true);

    try {
      const generatedScript = await geminiService.generateComicPrompt(
        concept,
        selectedArticles,
        panelCount // Use panelCount from store
      );
      setComicPrompt(generatedScript);
    } catch (err) {
      const appError = AppErrorHandler.handleError(err);
      const userMessage = AppErrorHandler.getUserMessage(appError);
      setScriptError(userMessage);
      setCartoonStoreError(userMessage);
    } finally {
      setScriptLoading(false);
      setCartoonStoreLoading(false);
    }
  };

  return (
    <div className="cartoon-studio-container">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Cartoon Studio</h2>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Panel: Configuration and Generation Steps */}
        <div className="left-panel">
          {(!cartoon || !cartoon.ideas || cartoon.ideas.length === 0) ? (
            <ConceptGenerator />
          ) : (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Select a Concept</h3>
              <div className="space-y-4">
                {cartoon.ideas.map((concept, index) => (
                  <div
                    key={index}
                    onClick={() => handleConceptSelect(index)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedConceptIndex === index
                        ? 'border-purple-500 bg-purple-100 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <p className="font-medium text-gray-800">{concept.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{concept.premise}</p>
                  </div>
                ))}
              </div>

              {selectedConcept && (
                <div className="mt-8">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Cartoon Style</h3>
                    <select
                      value={cartoonStyle}
                      onChange={(e) => setCartoonStyle(e.target.value)}
                      className="block w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="Satirical">Satirical</option>
                      <option value="Absurdist">Absurdist</option>
                      <option value="Political">Political</option>
                      <option value="Slice of Life">Slice of Life</option>
                      <option value="Superhero">Superhero</option>
                    </select>
                  </div>

                  <Collapsible title="Advanced Settings">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700">Custom Prompt</label>
                        <textarea
                          id="customPrompt"
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          rows={3}
                          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Add specific instructions for the AI..."
                        ></textarea>
                      </div>
                      <div>
                        <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">Temperature ({temperature})</label>
                        <input
                          type="range"
                          id="temperature"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="mt-1 block w-full"
                        />
                      </div>
                      <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-700">Model</label>
                        <select
                          id="model"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        </select>
                      </div>
                    </div>
                  </Collapsible>

                  {!comicPrompt && (
                                      <button
                                        onClick={() => handleGenerateScript(selectedConcept)}
                                        disabled={scriptLoading || selectedArticles.length === 0}
                                        className={`w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 shadow-lg min-h-[44px] min-w-[44px] touch-action-manipulation ${scriptLoading ? 'animate-flash-amber' : 'animate-flash-green'}`}
                                      >
                                        {scriptLoading ? 'Generating Script...' : 'Generate Script'}
                                      </button>                  )}

                  {scriptError && (
                    <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <p className="text-red-800 font-medium">{scriptError}</p>
                    </div>
                  )}
                </div>
              )}

              {comicPrompt && (
                <div className="mt-8 bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Generated Script</h3>
                  <p className="text-gray-700 mb-4">{comicPrompt.description}</p>
                  <div className="space-y-4">
                    {comicPrompt.panels.map((panel, index) => {
                      const getPanelText = (p: string | ComicPanel | ComicScriptPanel): string => {
                        if (typeof p === 'string') return p;
                        if ('visualDescription' in p) return p.visualDescription;
                        if ('description' in p) return p.description;
                        return '';
                      };
                      return (
                        <div key={index} className="p-3 border border-green-200 rounded-lg bg-white">
                          <p className="font-semibold text-green-800">Panel {index + 1}:</p>
                          <p className="text-gray-700">{getPanelText(panel)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Preview (Image Generation) */}
        <div className="right-panel">
          {comicPrompt && !imagePath && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Generate Image</h3>
              <p className="text-gray-700 mb-4">Click below to generate the cartoon image based on the script.</p>
              <button
                onClick={handleGenerateImage}
                disabled={imageLoading || cartoonStoreLoading}
                className={`w-full mt-4 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 shadow-lg min-h-[44px] min-w-[44px] touch-action-manipulation ${imageLoading ? 'animate-flash-amber' : 'animate-flash-green'}`}
              >
                {imageLoading ? 'Generating Image...' : 'Generate Image'}
              </button>
              {imageError && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-800 font-medium">{imageError}</p>
                </div>
              )}
              {timeRemaining > 0 && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <p className="text-yellow-800 font-medium">Please wait {timeRemaining} seconds before generating another image.</p>
                </div>
              )}
            </div>
          )}

          {imagePath && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Generated Cartoon</h3>
              <img src={imagePath} alt="Generated Cartoon" className="w-full h-auto rounded-lg shadow-lg mb-4" />
              <div className="flex space-x-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px] touch-action-manipulation"
                >
                  Download Image
                </button>
                <button
                  onClick={handleRegenerateImage}
                  className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors min-h-[44px] min-w-[44px] touch-action-manipulation"
                >
                  Regenerate Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartoonStudio;
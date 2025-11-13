import React from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import type { CartoonConcept } from '../../types/cartoon';

const ConceptDisplay: React.FC = () => {
  const { cartoon, selectedConceptIndex, setSelectedConceptIndex } = useCartoonStore();

  if (!cartoon || !cartoon.ideas || cartoon.ideas.length === 0) {
    return null;
  }

  const handleConceptClick = (index: number) => {
    setSelectedConceptIndex(index);
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
    </div>
  );
};

export default ConceptDisplay;

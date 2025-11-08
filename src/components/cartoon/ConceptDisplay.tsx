import React from 'react';
import { useCartoonStore } from '../../store/cartoonStore';

const ConceptDisplay: React.FC = () => {
  const { cartoon } = useCartoonStore();

  if (!cartoon || !cartoon.ideas || cartoon.ideas.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Cartoon Concepts</h2>
      <p className="mb-4 text-gray-600">Select a concept for image generation:</p>

      <div className="space-y-4">
        {cartoon.ideas.map((concept: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:border-purple-600 cursor-pointer">
            <h3 className="font-semibold text-lg mb-2">{concept.title}</h3>
            <p className="text-gray-600 mb-2">{concept.premise || concept.description}</p>
            {concept.why_funny && (
              <p className="text-gray-700 italic">{concept.why_funny}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConceptDisplay;

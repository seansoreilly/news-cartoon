import React from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import type { ComicPanel, ComicScriptPanel } from '../../types/cartoon';

const ComicScriptDisplay: React.FC = () => {
  const { comicScript } = useCartoonStore();

  if (!comicScript) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-medium mb-2">Comic Script</h3>

      <div className="mb-3">
        <span className="font-semibold">Description:</span>
        <p className="text-lg">{comicScript.description}</p>
      </div>

      {comicScript.newsContext && (
        <div className="mb-3">
          <span className="font-semibold">News Context:</span>
          <p className="italic">{comicScript.newsContext}</p>
        </div>
      )}

      {comicScript.panels && comicScript.panels.length > 0 && (
        <div>
          <span className="font-semibold">Panels:</span>
          <ul className="list-disc list-inside mt-2">
            {comicScript.panels.map((panel: string | ComicPanel | ComicScriptPanel, index: number) => {
              if (typeof panel === 'string') {
                return <li key={index}>{panel}</li>;
              }
              if ('visualDescription' in panel) {
                return <li key={index}>{(panel as ComicScriptPanel).visualDescription}</li>;
              }
              return <li key={index}>{(panel as ComicPanel).description}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ComicScriptDisplay;

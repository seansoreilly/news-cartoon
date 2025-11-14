import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import type { ComicPanel, ComicScriptPanel } from '../../types/cartoon';

const ComicScriptDisplay: React.FC = () => {
  const { comicScript, setComicScript } = useCartoonStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editPanels, setEditPanels] = useState<string[]>([]);

  if (!comicScript) {
    return null;
  }

  // Initialize edit state when entering edit mode
  const handleStartEdit = () => {
    setEditDescription(comicScript.description || '');
    setEditPanels(
      comicScript.panels?.map((panel: string | ComicPanel | ComicScriptPanel) => {
        if (typeof panel === 'string') return panel;
        if ('visualDescription' in panel) return (panel as ComicScriptPanel).visualDescription;
        return (panel as ComicPanel).description;
      }) || []
    );
    setIsEditing(true);
  };

  const handleSaveEdits = () => {
    // Only save if we have valid content
    if (editDescription.trim() || editPanels.some(p => p.trim())) {
      setComicScript({
        ...comicScript,
        description: editDescription.trim(),
        panels: editPanels.filter(p => p.trim()),
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdits = () => {
    // Reset edit states when canceling
    setEditDescription('');
    setEditPanels([]);
    setIsEditing(false);
  };



  if (isEditing) {
    return (
      <div className="mt-6 p-4 bg-white rounded-lg border-2 border-purple-200">
        <h3 className="font-semibold mb-4 text-lg">✏️ Edit Cartoon Script</h3>

        <div className="mb-4">
          <label className="font-semibold text-gray-700 block mb-2">Cartoon Script:</label>
          <textarea
            value={editPanels.join('\n\n')}
            onChange={(e) => setEditPanels(e.target.value.split('\n\n'))}
            className="w-full p-3 border border-gray-300 rounded-lg font-medium text-gray-800 resize-vertical min-h-40"
            placeholder="Enter cartoon script..."
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSaveEdits}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            ✓ Save Changes
          </button>
          <button
            onClick={handleCancelEdits}
            className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Cartoon Script</h3>
        <button
          onClick={handleStartEdit}
          className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          ✏️ Edit
        </button>
      </div>

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
          <ul className="list-disc list-inside mt-2 space-y-1">
            {comicScript.panels.map((panel: string | ComicPanel | ComicScriptPanel, index: number) => {
              let panelText = '';
              if (typeof panel === 'string') {
                panelText = panel;
              } else if ('visualDescription' in panel) {
                panelText = (panel as ComicScriptPanel).visualDescription;
              } else {
                panelText = (panel as ComicPanel).description;
              }
              return <li key={index}>{panelText}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ComicScriptDisplay;

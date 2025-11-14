import React, { useState } from 'react';
import { useCartoonStore } from '../../store/cartoonStore';
import type { ComicPanel, ComicScriptPanel } from '../../types/cartoon';

const ComicScriptDisplay: React.FC = () => {
  const { comicScript, setComicScript } = useCartoonStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(comicScript?.description || '');
  const [editPanels, setEditPanels] = useState<string[]>(
    comicScript?.panels?.map((panel: string | ComicPanel | ComicScriptPanel) => {
      if (typeof panel === 'string') return panel;
      if ('visualDescription' in panel) return (panel as ComicScriptPanel).visualDescription;
      return (panel as ComicPanel).description;
    }) || []
  );

  if (!comicScript) {
    return null;
  }

  const handleSaveEdits = () => {
    if (editDescription.trim()) {
      setComicScript({
        ...comicScript,
        description: editDescription,
        panels: editPanels.filter(p => p.trim()),
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdits = () => {
    setEditDescription(comicScript.description);
    setEditPanels(
      comicScript.panels?.map((panel: string | ComicPanel | ComicScriptPanel) => {
        if (typeof panel === 'string') return panel;
        if ('visualDescription' in panel) return (panel as ComicScriptPanel).visualDescription;
        return (panel as ComicPanel).description;
      }) || []
    );
    setIsEditing(false);
  };

  const handlePanelChange = (index: number, value: string) => {
    const newPanels = [...editPanels];
    newPanels[index] = value;
    setEditPanels(newPanels);
  };

  const handleAddPanel = () => {
    setEditPanels([...editPanels, '']);
  };

  const handleRemovePanel = (index: number) => {
    setEditPanels(editPanels.filter((_, i) => i !== index));
  };

  if (isEditing) {
    return (
      <div className="mt-6 p-4 bg-white rounded-lg border-2 border-purple-200">
        <h3 className="font-semibold mb-4 text-lg">✏️ Edit Comic Script</h3>

        <div className="mb-4">
          <label className="font-semibold text-gray-700 block mb-2">Description:</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg font-medium text-gray-800 resize-vertical min-h-20"
            placeholder="Enter description..."
          />
        </div>

        {comicScript.newsContext && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="font-semibold text-gray-700">News Context:</span>
            <p className="italic text-gray-600 mt-1">{comicScript.newsContext}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-gray-700">Panels:</label>
            <button
              onClick={handleAddPanel}
              className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              + Add Panel
            </button>
          </div>

          <div className="space-y-3">
            {editPanels.map((panel, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <textarea
                    value={panel}
                    onChange={(e) => handlePanelChange(index, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-vertical min-h-16"
                    placeholder={`Panel ${index + 1}...`}
                  />
                </div>
                <button
                  onClick={() => handleRemovePanel(index)}
                  className="px-2 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm mt-1"
                  aria-label={`Remove panel ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
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
        <h3 className="font-semibold text-lg">Comic Script</h3>
        <button
          onClick={() => setIsEditing(true)}
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

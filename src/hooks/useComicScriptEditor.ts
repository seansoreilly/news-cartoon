import { useState, useEffect } from 'react';
import { useCartoonStore } from '../store/cartoonStore';
import type { ComicPanel, ComicScriptPanel } from '../types/cartoon';

export const useComicScriptEditor = () => {
  const { comicPrompt, setComicPrompt } = useCartoonStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editPanels, setEditPanels] = useState<string[]>([]);

  useEffect(() => {
    if (isEditing) {
      setEditDescription(comicPrompt?.description || '');
      setEditPanels(
        comicPrompt?.panels?.map((panel: string | ComicPanel | ComicScriptPanel) => {
          if (typeof panel === 'string') return panel;
          if ('visualDescription' in panel) return (panel as ComicScriptPanel).visualDescription;
          return (panel as ComicPanel).description;
        }) || []
      );
    }
  }, [isEditing, comicPrompt]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdits = () => {
    if (comicPrompt && (editDescription.trim() || editPanels.some(p => p.trim()))) {
      setComicPrompt({
        ...comicPrompt,
        description: editDescription.trim(),
        panels: editPanels.filter(p => p.trim()),
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdits = () => {
    setIsEditing(false);
  };

  return {
    comicPrompt,
    isEditing,
    editDescription,
    editPanels,
    setEditPanels,
    handleStartEdit,
    handleSaveEdits,
    handleCancelEdits,
  };
};

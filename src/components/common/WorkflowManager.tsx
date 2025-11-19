import React from 'react';
import { useLocationStore } from '../../store/locationStore';
import { useNewsStore } from '../../store/newsStore';
import { useCartoonStore } from '../../store/cartoonStore';
import LocationDetector from '../location/LocationDetector';
import NewsDisplay from '../news/NewsDisplay';
import ConceptGenerator from '../cartoon/ConceptGenerator';
import ConceptDisplay from '../cartoon/ConceptDisplay';
import ComicScriptDisplay from '../cartoon/ComicScriptDisplay';
import ImageGenerator from '../cartoon/ImageGenerator';

const WorkflowManager: React.FC = () => {
  const { location } = useLocationStore();
  const { selectedArticles } = useNewsStore();
  const { selectedConceptIndex, comicPrompt } = useCartoonStore();

  const hasLocation = location?.name && location.name.trim() !== '';
  const hasSelectedArticles = selectedArticles.length > 0;
  const hasSelectedConcept = selectedConceptIndex !== null;
  const hasComicScript = comicPrompt !== null;

  return (
    <div className="space-y-8">
      <LocationDetector />
      {hasLocation && <NewsDisplay />}
      {hasSelectedArticles && (
        <div className="space-y-4">
          <ConceptGenerator />
          <ConceptDisplay />
        </div>
      )}
      {hasSelectedConcept && <ComicScriptDisplay />}
      {hasComicScript && <ImageGenerator />}
    </div>
  );
};

export default WorkflowManager;

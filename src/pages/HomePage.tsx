import React from 'react';
import LocationDetector from '../components/location/LocationDetector';
import NewsDisplay from '../components/news/NewsDisplay';
import ConceptGenerator from '../components/cartoon/ConceptGenerator';
import ConceptDisplay from '../components/cartoon/ConceptDisplay';
import ComicScriptDisplay from '../components/cartoon/ComicScriptDisplay';
import ImageGenerator from '../components/cartoon/ImageGenerator';
import { useLocationStore } from '../store/locationStore';
import { useNewsStore } from '../store/newsStore';
import { useCartoonStore } from '../store/cartoonStore';

const HomePage: React.FC = () => {
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

export default HomePage;

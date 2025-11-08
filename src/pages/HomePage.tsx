import React from 'react';
import LocationDetector from '../components/location/LocationDetector';
import NewsDisplay from '../components/news/NewsDisplay';
import ConceptGenerator from '../components/cartoon/ConceptGenerator';
import ConceptDisplay from '../components/cartoon/ConceptDisplay';
import ComicScriptDisplay from '../components/cartoon/ComicScriptDisplay';
import ImageGenerator from '../components/cartoon/ImageGenerator';
import ProgressIndicator from '../components/common/ProgressIndicator';

const HomePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <ProgressIndicator />
      <LocationDetector />
      <NewsDisplay />
      <ConceptGenerator />
      <ConceptDisplay />
      <ComicScriptDisplay />
      <ImageGenerator />
    </div>
  );
};

export default HomePage;

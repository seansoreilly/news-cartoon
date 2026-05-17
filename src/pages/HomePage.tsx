import React, { useEffect, useRef } from 'react';
import LocationDetector from '../components/location/LocationDetector';
import NewsDisplay from '../components/news/NewsDisplay';
import ConceptGenerator from '../components/cartoon/ConceptGenerator';
import ConceptDisplay from '../components/cartoon/ConceptDisplay';
import ComicScriptDisplay from '../components/cartoon/ComicScriptDisplay';
import ImageGenerator from '../components/cartoon/ImageGenerator';
import ExpressWorkflow from '../components/cartoon/ExpressWorkflow';
import WorkflowProgress from '../components/layout/WorkflowProgress';
import { useLocationStore } from '../store/locationStore';
import { useNewsStore } from '../store/newsStore';
import { useCartoonStore } from '../store/cartoonStore';
import { usePreferencesStore } from '../store/preferencesStore';

const CuratedCascade: React.FC = () => {
  const location = useLocationStore((s) => s.location);
  const selectedArticles = useNewsStore((s) => s.selectedArticles);
  const selectedConceptIndex = useCartoonStore((s) => s.selectedConceptIndex);
  const comicPrompt = useCartoonStore((s) => s.comicPrompt);

  const hasLocation = Boolean(location?.name && location.name.trim() !== '');
  const hasSelectedArticles = selectedArticles.length > 0;
  const hasSelectedConcept = selectedConceptIndex !== null;
  const hasComicScript = comicPrompt !== null;

  const newsRef = useRef<HTMLDivElement | null>(null);
  const conceptRef = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  const prevState = useRef({
    hasLocation,
    hasSelectedArticles,
    hasSelectedConcept,
    hasComicScript,
  });

  useEffect(() => {
    const prev = prevState.current;
    const scrollTo = (el: HTMLElement | null): void => {
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    if (!prev.hasLocation && hasLocation) scrollTo(newsRef.current);
    else if (!prev.hasSelectedArticles && hasSelectedArticles) scrollTo(conceptRef.current);
    else if (!prev.hasSelectedConcept && hasSelectedConcept) scrollTo(scriptRef.current);
    else if (!prev.hasComicScript && hasComicScript) scrollTo(imageRef.current);

    prevState.current = {
      hasLocation,
      hasSelectedArticles,
      hasSelectedConcept,
      hasComicScript,
    };
  }, [hasLocation, hasSelectedArticles, hasSelectedConcept, hasComicScript]);

  return (
    <div className="space-y-8">
      <section aria-label="Location step">
        <LocationDetector />
      </section>
      {hasLocation && (
        <section ref={newsRef} aria-label="News step" className="scroll-mt-24">
          <NewsDisplay />
        </section>
      )}
      {hasSelectedArticles && (
        <section ref={conceptRef} aria-label="Concept step" className="space-y-4 scroll-mt-24">
          <ConceptGenerator />
          <ConceptDisplay />
        </section>
      )}
      {hasSelectedConcept && (
        <section ref={scriptRef} aria-label="Script step" className="scroll-mt-24">
          <ComicScriptDisplay />
        </section>
      )}
      {hasComicScript && (
        <section ref={imageRef} aria-label="Image step" className="scroll-mt-24">
          <ImageGenerator />
        </section>
      )}
    </div>
  );
};

const HomePage: React.FC = () => {
  const { clearLocation } = useLocationStore();
  const { clearNews } = useNewsStore();
  const { clearCartoon } = useCartoonStore();
  const simpleMode = usePreferencesStore((s) => s.simpleMode);

  const handleReset = (): void => {
    clearCartoon();
    clearNews();
    clearLocation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <WorkflowProgress onReset={handleReset} />
      {simpleMode ? <ExpressWorkflow /> : <CuratedCascade />}
    </>
  );
};

export default HomePage;

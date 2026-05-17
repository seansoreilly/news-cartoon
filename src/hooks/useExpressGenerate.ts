import { useRef, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { useNewsStore } from '../store/newsStore';
import { useCartoonStore } from '../store/cartoonStore';
import { newsService } from '../services/newsService';
import { geminiService } from '../services/geminiService';
import { ImageGenerationRateLimiter } from '../utils/rateLimiter';
import { AppErrorHandler } from '../utils/errorHandler';
import { addWatermark } from '../utils/imageUtils';
import { calculateHumorScore } from '../utils/textUtils';
import type { NewsArticle, NewsData } from '../types';
import type { CartoonConcept } from '../types/cartoon';

export type ExpressPhase = 'idle' | 'news' | 'concept' | 'script' | 'image' | 'done';

type RetryablePhase = 'news' | 'concept' | 'script';

const TOP_ARTICLE_COUNT = 3;
const DEFAULT_PANEL_COUNT = 4;
const EXPRESS_NEWS_LIMIT = 10;

export interface UseExpressGenerateResult {
  run: () => Promise<void>;
  retry: () => Promise<void>;
  phase: ExpressPhase;
  error: string | null;
  isRunning: boolean;
  secondsUntilNext: number;
}

export function useExpressGenerate(): UseExpressGenerateResult {
  const [phase, setPhase] = useState<ExpressPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState(0);
  const failedPhaseRef = useRef<RetryablePhase>('news');
  const countdownTimerRef = useRef<number | null>(null);

  const startCountdown = (ms: number): void => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
    }
    const secs = Math.ceil(ms / 1000);
    setSecondsUntilNext(secs);
    countdownTimerRef.current = window.setInterval(() => {
      setSecondsUntilNext((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current !== null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const runFrom = async (startPhase: RetryablePhase): Promise<void> => {
    const { location } = useLocationStore.getState();
    if (!location?.name) {
      setError('Enter a topic or detect your location first');
      return;
    }

    setIsRunning(true);
    setError(null);

    // Tracks the phase that should be retried if this run fails. Advances as we
    // complete each phase.
    let currentPhase: RetryablePhase = startPhase;

    try {
      // ---- News phase ----
      let articles: NewsArticle[];
      if (startPhase === 'news') {
        currentPhase = 'news';
        setPhase('news');
        const newsStore = useNewsStore.getState();
        const cartoonStore = useCartoonStore.getState();

        const response = await newsService.fetchNewsByLocation(location.name, EXPRESS_NEWS_LIMIT);
        if (!response.articles || response.articles.length === 0) {
          throw new Error('No articles found for that topic — try different keywords.');
        }

        const enrichedArticles = response.articles.map((article) => ({
          ...article,
          summary: article.description,
          humorScore: calculateHumorScore(article.title, article.description),
          summaryLoading: false,
          summaryError: false,
        }));

        const newsData: NewsData = {
          articles: enrichedArticles,
          topic: response.topic || 'General',
          date: new Date().toISOString(),
          location: response.location,
        };

        // Fresh news invalidates any prior concept/image state from a previous run.
        cartoonStore.clearCartoon();
        newsStore.clearNews();
        newsStore.setNews(newsData);

        articles = enrichedArticles.slice(0, TOP_ARTICLE_COUNT);
        articles.forEach((a) => newsStore.selectArticle(a));
      } else {
        articles = useNewsStore.getState().selectedArticles;
        if (articles.length === 0) {
          // News context lost (e.g. user cleared) — fall back to a full re-run.
          startPhase = 'news';
          currentPhase = 'news';
          setPhase('news');
          throw new Error('No articles selected — please retry.');
        }
      }

      // ---- Concept phase ----
      let concept: CartoonConcept;
      if (startPhase === 'news' || startPhase === 'concept') {
        currentPhase = 'concept';
        setPhase('concept');
        const cartoonStore = useCartoonStore.getState();
        const cartoonData = await geminiService.generateCartoonConcepts(articles, location.name);
        cartoonStore.setCartoon(cartoonData);
        cartoonStore.setSelectedConceptIndex(0);
        concept = { ...cartoonData.ideas[0], location: cartoonData.location };
      } else {
        const cartoonStore = useCartoonStore.getState();
        const cartoon = cartoonStore.cartoon;
        const idx = cartoonStore.selectedConceptIndex ?? 0;
        if (!cartoon || !cartoon.ideas[idx]) {
          startPhase = 'concept';
          currentPhase = 'concept';
          setPhase('concept');
          throw new Error('No concept available — please retry.');
        }
        concept = { ...cartoon.ideas[idx], location: cartoon.location };
      }

      // ---- Script + image phase ----
      currentPhase = 'script';
      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();
      if (timeUntilNext > 0) {
        const secs = Math.ceil(timeUntilNext / 1000);
        startCountdown(timeUntilNext);
        throw new Error(`Rate limit exceeded. Please wait ${secs} second${secs !== 1 ? 's' : ''}.`);
      }

      setPhase('script');
      const cartoonImage = await geminiService.generateCartoonImage(
        concept,
        articles,
        DEFAULT_PANEL_COUNT,
        (subPhase) => {
          if (subPhase === 'script' || subPhase === 'image') {
            setPhase(subPhase);
          }
        }
      );

      const dataUrl = `data:${cartoonImage.mimeType};base64,${cartoonImage.base64Data}`;
      const watermarkedUrl = await addWatermark(dataUrl);
      useCartoonStore.getState().setImagePath(watermarkedUrl);

      setPhase('done');
    } catch (err) {
      failedPhaseRef.current = currentPhase;
      const appError = AppErrorHandler.handleError(err);
      const userMessage = AppErrorHandler.getUserMessage(appError);
      setError(userMessage);
    } finally {
      setIsRunning(false);
    }
  };

  const run = (): Promise<void> => {
    failedPhaseRef.current = 'news';
    return runFrom('news');
  };

  const retry = (): Promise<void> => runFrom(failedPhaseRef.current);

  return { run, retry, phase, error, isRunning, secondsUntilNext };
}

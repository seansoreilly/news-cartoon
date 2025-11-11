import { create } from 'zustand';
import type { NewsData, NewsArticle } from '../types';

interface NewsState {
  news: NewsData | null;
  selectedArticles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  setNews: (news: NewsData | ((prevNews: NewsData | null) => NewsData | null)) => void;
  selectArticle: (article: NewsArticle) => void;
  deselectArticle: (article: NewsArticle) => void;
  clearNews: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  news: null,
  selectedArticles: [],
  isLoading: false,
  error: null,

  setNews: (news: NewsData | ((prevNews: NewsData | null) => NewsData | null)) => {
    if (typeof news === 'function') {
      set((state) => {
        const newNews = news(state.news);
        return { news: newNews, error: null };
      });
    } else {
      set({ news, error: null });
    }
  },

  clearNews: () => {
    set({ news: null, error: null });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  selectArticle: (article: NewsArticle) => {
    set((state) => {
      const isAlreadySelected = state.selectedArticles.some(
        (a) => a.title === article.title && a.url === article.url
      );
      if (isAlreadySelected) {
        return {};
      }
      return {
        selectedArticles: [...state.selectedArticles, article],
      };
    });
  },

  deselectArticle: (article: NewsArticle) => {
    set((state) => ({
      selectedArticles: state.selectedArticles.filter(
        (a) => !(a.title === article.title && a.url === article.url)
      ),
    }));
  },
}));

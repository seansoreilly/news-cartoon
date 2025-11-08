import { create } from 'zustand';
import type { NewsData, NewsArticle } from '../types';

interface NewsState {
  news: NewsData | null;
  selectedArticles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  setNews: (news: NewsData) => void;
  setArticles: (articles: NewsArticle[]) => void;
  setTopic: (topic: string) => void;
  selectArticle: (article: NewsArticle) => void;
  deselectArticle: (article: NewsArticle) => void;
  clearSelectedArticles: () => void;
  clearNews: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  news: null,
  selectedArticles: [],
  isLoading: false,
  error: null,

  setNews: (news: NewsData) => {
    set({ news, error: null });
  },

  setArticles: (articles: NewsArticle[]) => {
    set((state) => ({
      news: state.news
        ? { ...state.news, articles }
        : {
            articles,
            topic: 'General',
            date: new Date().toISOString(),
          },
    }));
  },

  setTopic: (topic: string) => {
    set((state) => ({
      news: state.news ? { ...state.news, topic } : null,
    }));
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

  clearSelectedArticles: () => {
    set({ selectedArticles: [] });
  },
}));

import { useEffect } from 'react';
import { useNewsStore } from '../store/newsStore';
import { useLocationStore } from '../store/locationStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { newsService } from '../services/newsService';
import { geminiService } from '../services/geminiService';
import { AppErrorHandler } from '../utils/errorHandler';
import { calculateHumorScore } from '../utils/textUtils';
import type { NewsArticle, NewsData } from '../types';

export const useNews = () => {
  const { location } = useLocationStore();
  const { newsCount } = usePreferencesStore();
  const {
    news,
    selectedArticles,
    isLoading,
    error,
    setNews,
    selectArticle,
    deselectArticle,
    setLoading,
    setError,
  } = useNewsStore();

  useEffect(() => {
    const fetchNews = async () => {
      if (!location?.name) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const newsResponse = await newsService.fetchNewsByLocation(location.name, newsCount);

        const articlesWithLocalScores = newsResponse.articles.map(article => ({
          ...article,
          summary: article.description,
          humorScore: calculateHumorScore(article.title, article.description),
          summaryLoading: true,
          summaryError: false,
        }));

        const newsData: NewsData = {
          articles: articlesWithLocalScores,
          topic: newsResponse.topic || 'General',
          date: new Date().toISOString(),
          location: newsResponse.location,
        };
        setNews(newsData);
        setLoading(false);

        try {
          const analysis = await geminiService.batchAnalyzeArticles(
            newsResponse.articles.map(a => ({
              title: a.title,
              description: a.description,
              content: a.content,
            }))
          );

          setNews(prevNews => {
            if (!prevNews) return prevNews;
            const updatedArticles = prevNews.articles.map((article, idx) => ({
              ...article,
              summary: analysis[idx]?.summary || article.summary,
              humorScore: analysis[idx]?.humorScore || article.humorScore,
              summaryLoading: false,
              summaryError: !analysis[idx],
            }));
            return { ...prevNews, articles: updatedArticles };
          });
        } catch (aiError) {
          console.warn('⚠️ AI analysis failed, using local scores:', aiError);
          setNews(prevNews => {
            if (!prevNews) return prevNews;
            const updatedArticles = prevNews.articles.map(article => ({
              ...article,
              summaryLoading: false,
              summaryError: true,
            }));
            return { ...prevNews, articles: updatedArticles };
          });
        }
      } catch (err) {
        const appError = AppErrorHandler.handleError(err);
        const userMessage = AppErrorHandler.getUserMessage(appError);
        setError(userMessage);
        setLoading(false);
      }
    };

    fetchNews();
  }, [location?.name, newsCount, setLoading, setError, setNews]);

  const handleSelectArticle = async (article: NewsArticle) => {
    const isSelected = selectedArticles.some(
      (a) => a.title === article.title && a.url === article.url
    );

    if (isSelected) {
      deselectArticle(article);
    } else {
      const storedArticle = news?.articles.find(
        a => a.title === article.title && a.url === article.url
      );

      const needsContent = !storedArticle?.contentFetched &&
        (!storedArticle?.content || storedArticle.content === storedArticle.description);

      if (needsContent) {
        try {
          const fullContent = await newsService.fetchArticleContent(article.url);

          setNews(prevNews => {
            if (!prevNews) return prevNews;
            const updatedArticles = prevNews.articles.map(a =>
              (a.title === article.title && a.url === article.url)
                ? { ...a, content: fullContent, contentFetched: true }
                : a
            );
            return { ...prevNews, articles: updatedArticles };
          });

          selectArticle({ ...article, content: fullContent, contentFetched: true });
        } catch (error) {
          console.error('Failed to fetch article content:', error);

          setNews(prevNews => {
            if (!prevNews) return prevNews;
            const updatedArticles = prevNews.articles.map(a =>
              (a.title === article.title && a.url === article.url)
                ? { ...a, contentFetched: true }
                : a
            );
            return { ...prevNews, articles: updatedArticles };
          });

          selectArticle({ ...article, contentFetched: true });
        }
      } else {
        selectArticle(storedArticle || article);
      }
    }
  };

  return {
    news,
    selectedArticles,
    isLoading,
    error,
    handleSelectArticle,
    location,
  };
};

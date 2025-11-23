import React, { useEffect } from 'react';
import { useNewsStore } from '../../store/newsStore';
import { useLocationStore } from '../../store/locationStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { newsService } from '../../services/newsService';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import { calculateHumorScore } from '../../utils/textUtils';
import { NewsCard } from './NewsCard';
import type { NewsArticle, NewsData } from '../../types';

const NewsDisplay: React.FC = () => {
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
      console.log('[NewsDisplay] Location changed:', location);
      if (!location?.name) {
        console.log('[NewsDisplay] No location name, skipping news fetch');
        return;
      }

      console.log('[NewsDisplay] Fetching news for:', location.name, 'with limit:', newsCount);
      setLoading(true);
      setError(null);

      try {
        const newsResponse = await newsService.fetchNewsByLocation(location.name, newsCount);
        console.log('[NewsDisplay] News response:', newsResponse);

        // Set initial news data with local humor scores (instant feedback)
        // Mark articles as loading their summaries
        const articlesWithLocalScores = newsResponse.articles.map(article => ({
          ...article,
          summary: article.description,
          humorScore: calculateHumorScore(article.title, article.description),
          summaryLoading: true, // Mark as loading AI summaries
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

        // Then enhance with AI analysis in background (parallel loading)
        console.log('🤖 Starting AI batch analysis of articles...');
        try {
          const analysis = await geminiService.batchAnalyzeArticles(
            newsResponse.articles.map(a => ({
              title: a.title,
              description: a.description,
              content: a.content,
            }))
          );

          // Update articles with AI-generated summaries and scores
          setNews(prevNews => {
            if (!prevNews) return prevNews;
            const updatedArticles = prevNews.articles.map((article, idx) => ({
              ...article,
              summary: analysis[idx]?.summary || article.summary,
              humorScore: analysis[idx]?.humorScore || article.humorScore,
              summaryLoading: false, // Done loading
              summaryError: !analysis[idx], // Error if no analysis returned
            }));
            return { ...prevNews, articles: updatedArticles };
          });

          console.log('✅ AI analysis complete');
        } catch (aiError) {
          console.warn('⚠️ AI analysis failed, using local scores:', aiError);
          // Mark all articles as having error loading AI summaries
          setNews(prevNews => {
            if (!prevNews) return prevNews;
            const updatedArticles = prevNews.articles.map(article => ({
              ...article,
              summaryLoading: false,
              summaryError: true, // Mark as error
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
      // Find the article in the store to check if we already have full content
      const storedArticle = news?.articles.find(
        a => a.title === article.title && a.url === article.url
      );

      // Only fetch if we haven't already tried and don't have meaningful content
      const needsContent = !storedArticle?.contentFetched &&
        (!storedArticle?.content || storedArticle.content === storedArticle.description);

      if (needsContent) {
        try {
          console.log(`📄 Fetching full content for: ${article.title}`);
          const fullContent = await newsService.fetchArticleContent(article.url);

          // Update the article in the news store with full content and mark as fetched
          setNews(prevNews => {
            if (!prevNews) return prevNews;
            const updatedArticles = prevNews.articles.map(a =>
              (a.title === article.title && a.url === article.url)
                ? { ...a, content: fullContent, contentFetched: true }
                : a
            );
            return { ...prevNews, articles: updatedArticles };
          });

          // Select the article with full content
          selectArticle({ ...article, content: fullContent, contentFetched: true });
          console.log(`✅ Full content loaded (${fullContent.length} chars)`);
        } catch (error) {
          console.error('Failed to fetch article content:', error);

          // Mark as fetched to prevent retrying, and select with available content
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
        // Use the stored article (with or without full content)
        console.log(`✓ Using stored article for: ${article.title}`);
        selectArticle(storedArticle || article);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-sm">2</span>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">News Articles</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse h-20 sm:h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-sm">2</span>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">News Articles</h2>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!news || !news.articles || news.articles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-sm">2</span>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">News Articles</h2>
        </div>
        <div className="text-center py-6 sm:py-8">
          <p className="text-gray-600 text-base sm:text-lg">
            {location?.name
              ? 'No news articles found for your search'
              : 'Enter search keywords to see news articles'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 rounded-lg shadow-md mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-sm flex-shrink-0">2</span>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800">News Articles</h2>
            {news.topic && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Topic: {news.topic}</p>
            )}
          </div>
        </div>
        <div className="text-xs sm:text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-full whitespace-nowrap">
          {selectedArticles.length} selected
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {news.articles.map((article, idx) => (
          <NewsCard
            key={`${article.title}-${idx}`}
            article={article}
            selected={selectedArticles.some(
              (a) => a.title === article.title && a.url === article.url
            )}
            onSelect={() => handleSelectArticle(article)}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsDisplay;

import React, { useEffect } from 'react';
import { useNewsStore } from '../../store/newsStore';
import { useLocationStore } from '../../store/locationStore';
import { newsService } from '../../services/newsService';
import { AppErrorHandler } from '../../utils/errorHandler';
import type { NewsArticle, NewsData } from '../../types';

interface NewsCardProps {
  article: NewsArticle;
  selected: boolean;
  onSelect: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, selected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected
          ? 'bg-blue-50 border-blue-500 shadow-md'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="mt-1 w-5 h-5 cursor-pointer"
          aria-label={`Select article: ${article.title}`}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 line-clamp-2 text-base">
            {article.title}
          </h3>
          {article.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {article.description}
            </p>
          )}
          {article.source?.name && (
            <p className="text-xs text-gray-500 mt-2">Source: {article.source.name}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const NewsDisplay: React.FC = () => {
  const { location } = useLocationStore();
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
        const newsResponse = await newsService.fetchNewsByLocation(location.name);
        const newsData: NewsData = {
          articles: newsResponse.articles,
          topic: newsResponse.topic || 'General',
          date: new Date().toISOString(),
          location: newsResponse.location,
        };
        setNews(newsData);
      } catch (err) {
        const appError = AppErrorHandler.handleError(err);
        const userMessage = AppErrorHandler.getUserMessage(appError);
        setError(userMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [location?.name, setLoading, setError, setNews]);

  const handleSelectArticle = (article: NewsArticle) => {
    const isSelected = selectedArticles.some(
      (a) => a.title === article.title && a.url === article.url
    );

    if (isSelected) {
      deselectArticle(article);
    } else {
      selectArticle(article);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Latest News</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Latest News</h2>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-800 font-medium">� {error}</p>
        </div>
      </div>
    );
  }

  if (!news || !news.articles || news.articles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Latest News</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">
            {location?.name
              ? 'No news articles found for your location'
              : 'Select a location to see news articles'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Latest News</h2>
          {news.topic && (
            <p className="text-sm text-gray-600 mt-1">Topic: {news.topic}</p>
          )}
        </div>
        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-full">
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

      {selectedArticles.length > 0 && (
        <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <p className="text-blue-800 text-sm font-medium">
            Selected {selectedArticles.length} article for cartoon generation
          </p>
        </div>
      )}
    </div>
  );
};

export default NewsDisplay;

import React from 'react';
import { useNews } from '../../hooks/useNews';
import { NewsCard } from './NewsCard';

const NewsDisplay: React.FC = () => {
  const { news, selectedArticles, isLoading, error, handleSelectArticle, location } = useNews();

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

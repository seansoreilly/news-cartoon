import React, { useEffect } from 'react';
import { useNewsStore } from '../../store/newsStore';
import { useLocationStore } from '../../store/locationStore';
import { newsService } from '../../services/newsService';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import type { NewsArticle, NewsData } from '../../types';

interface NewsCardProps {
  article: NewsArticle;
  selected: boolean;
  onSelect: () => void;
}

const decodeHtmlEntities = (text: string): string => {
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || div.innerText || '';
};

const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

const cleanDescription = (description: string): string => {
  // First strip HTML tags, then decode entities
  const stripped = stripHtmlTags(description);
  return decodeHtmlEntities(stripped).trim();
};

const isTitleDuplicate = (title: string, description: string): boolean => {
  // Normalize both strings: lowercase, remove extra spaces
  const normalizeStr = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();

  const normalizedTitle = normalizeStr(title);
  const normalizedDesc = normalizeStr(description);

  // Check if description contains most of the title (accounting for variations)
  const titleWords = normalizedTitle.split(' ').filter(w => w.length > 3);

  // If more than 70% of title words appear in description, it's likely a duplicate
  const matchedWords = titleWords.filter(w => normalizedDesc.includes(w)).length;
  return matchedWords / titleWords.length > 0.7;
};

const NewsCard: React.FC<NewsCardProps> = ({ article, selected, onSelect }) => {
  // Clean HTML from summary
  const cleanedSummary = article.summary ? cleanDescription(article.summary) : undefined;

  // Filter out summaries that are just duplicates of the title
  const shouldShowSummary = cleanedSummary &&
    cleanedSummary.length > 10 &&
    !isTitleDuplicate(article.title, cleanedSummary);

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
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-800 line-clamp-2 text-base flex-1">
              {article.title}
            </h3>
            <div className="flex-shrink-0">
              {article.humorScore !== undefined ? (
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                  article.humorScore >= 70 ? 'bg-green-200 text-green-800' :
                  article.humorScore >= 40 ? 'bg-amber-200 text-amber-800' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {article.humorScore}
                </span>
              ) : (
                <div className="inline-flex items-center justify-center w-8 h-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
          {shouldShowSummary && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-4">
              {cleanedSummary}
            </p>
          )}
          <div className="flex items-center justify-between mt-2 gap-2">
            <p className="text-xs text-gray-500">Source: {article.source?.name}</p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium whitespace-nowrap"
            >
              Article →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Local humor scoring function (no API calls)
const calculateHumorScore = (title: string, description?: string): number => {
  const text = `${title} ${description || ''}`.toLowerCase();
  let score = 30;

  const keywords = {
    absurd: ['bizarre', 'unusual', 'strange', 'weird', 'odd', 'unexpected', 'shocking', 'ridiculous'],
    ironic: ['ironic', 'despite', 'however', 'contradicts', 'opposite', 'backfire', 'paradox'],
    political: ['politician', 'government', 'minister', 'mayor', 'scandal', 'controversy', 'protest'],
    visual: ['falls', 'crash', 'stuck', 'trapped', 'costume', 'animal', 'giant', 'huge'],
    extreme: ['extreme', 'massive', 'record', 'unprecedented', 'worst', 'best', 'biggest']
  };

  Object.values(keywords).forEach(kws => {
    const matches = kws.filter(kw => text.includes(kw));
    score += Math.min(matches.length * 5, 15);
  });

  score += Math.min((text.match(/!/g) || []).length * 3, 9);
  score += Math.min((text.match(/\?/g) || []).length * 4, 12);
  if (text.length < 50) score -= 10;
  if (text.length > 200) score += 5;

  return Math.min(100, Math.max(1, Math.round(score)));
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

        // Set initial news data with local humor scores (instant feedback)
        const articlesWithLocalScores = newsResponse.articles.map(article => ({
          ...article,
          summary: article.description,
          humorScore: calculateHumorScore(article.title, article.description),
        }));

        const newsData: NewsData = {
          articles: articlesWithLocalScores,
          topic: newsResponse.topic || 'General',
          date: new Date().toISOString(),
          location: newsResponse.location,
        };
        setNews(newsData);
        setLoading(false);

        // Then enhance with AI analysis in background
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
            }));
            return { ...prevNews, articles: updatedArticles };
          });

          console.log('✅ AI analysis complete');
        } catch (aiError) {
          console.warn('⚠️ AI analysis failed, using local scores:', aiError);
          // Keep the local scores if AI fails
        }
      } catch (err) {
        const appError = AppErrorHandler.handleError(err);
        const userMessage = AppErrorHandler.getUserMessage(appError);
        setError(userMessage);
        setLoading(false);
      }
    };

    fetchNews();
  }, [location?.name, setLoading, setError, setNews]);

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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">News Articles</h2>
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
        <h2 className="text-2xl font-bold text-gray-800 mb-4">News Articles</h2>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!news || !news.articles || news.articles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">News Articles</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">
            {location?.name
              ? 'No news articles found for your search'
              : 'Enter search keywords to see news articles'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">News Articles</h2>
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
            Selected {selectedArticles.length} article{selectedArticles.length !== 1 ? 's' : ''} for cartoon generation
          </p>
        </div>
      )}
    </div>
  );
};

export default NewsDisplay;

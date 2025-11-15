import React, { useEffect } from 'react';
import { useNewsStore } from '../../store/newsStore';
import { useLocationStore } from '../../store/locationStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { newsService } from '../../services/newsService';
import { geminiService } from '../../services/geminiService';
import { AppErrorHandler } from '../../utils/errorHandler';
import LoadingSkeleton from '../common/LoadingSkeleton';
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

const NewsCard: React.FC<NewsCardProps & { index: number }> = ({ article, selected, onSelect, index }) => {
  // Clean HTML from summary
  const cleanedSummary = article.summary ? cleanDescription(article.summary) : undefined;

  // Filter out summaries that are just duplicates of the title
  const shouldShowSummary = cleanedSummary &&
    cleanedSummary.length > 10 &&
    !isTitleDuplicate(article.title, cleanedSummary);

  // Render cartoon potential as editorial stars
  const renderCartoonPotential = () => {
    if (article.summaryError) {
      return (
        <span className="label" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
          NO RATING
        </span>
      );
    }

    if (article.summaryLoading) {
      return <LoadingSkeleton variant="humor-score" />;
    }

    if (article.humorScore !== undefined) {
      const stars = Math.ceil((article.humorScore / 100) * 5);
      return (
        <div className="flex items-center gap-1">
          <span className="label" style={{
            color: 'var(--color-editorial-red)',
            marginRight: '0.25rem',
            fontSize: 'var(--text-xs)'
          }}>
            TOON:
          </span>
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              style={{
                color: i < stars ? 'var(--color-press-gold)' : 'var(--color-ink-subtle)',
                fontSize: 'var(--text-sm)'
              }}
            >
              ★
            </span>
          ))}
        </div>
      );
    }

    // Default case: show spinner (should be rare)
    return (
      <div className="inline-flex items-center justify-center w-8 h-8">
        <div className="animate-spin rounded-full h-5 w-5" style={{ borderBottom: '2px solid var(--color-editorial-red)' }} />
      </div>
    );
  };

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Today';

  return (
    <div
      onClick={onSelect}
      className={`newspaper-article-card vintage-border ${selected ? 'stamp-impact' : 'printing-press-reveal'}`}
      style={{
        position: 'relative',
        background: selected ? 'var(--color-press-yellow)' : 'var(--color-newsprint-light)',
        border: selected ? '3px solid var(--color-editorial-red)' : '2px solid var(--border-primary)',
        padding: '1rem',
        marginBottom: '1rem',
        cursor: 'pointer',
        boxShadow: selected ? '3px 3px 0 var(--color-ink)' : '1px 1px 0 var(--shadow-ink)',
        transition: 'all 0.2s ease',
        animationDelay: `${index * 0.1}s`
      }}
    >
      {/* Article number badge */}
      <div style={{
        position: 'absolute',
        top: '-12px',
        right: '20px',
        background: 'var(--color-ink)',
        color: 'var(--color-newsprint-light)',
        padding: '0.25rem 0.75rem',
        fontSize: 'var(--text-xs)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 'var(--font-bold)',
        letterSpacing: 'var(--tracking-wider)',
      }}>
        ARTICLE {index + 1}
      </div>

      <div className="flex items-start gap-2 sm:gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          style={{
            width: '20px',
            height: '20px',
            marginTop: '0.25rem',
            accentColor: 'var(--color-editorial-red)',
            cursor: 'pointer'
          }}
          aria-label={`Select article: ${article.title}`}
        />
        <div className="flex-1 min-w-0">
          {/* Headline */}
          <h3 className="headline-article" style={{
            color: 'var(--color-ink)',
            marginBottom: '0.5rem',
            lineHeight: 'var(--leading-tight)',
            fontSize: 'var(--text-xl)'
          }}>
            {article.title}
          </h3>

          {/* Byline and Date */}
          <div className="byline" style={{
            color: 'var(--text-muted)',
            marginBottom: '0.5rem',
            fontSize: 'var(--text-xs)'
          }}>
            {article.source?.name && (
              <span>BY {article.source.name.toUpperCase()}</span>
            )}
            {article.source?.name && publishedDate && <span> • </span>}
            {publishedDate && <span>{publishedDate.toUpperCase()}</span>}
          </div>

          {/* Summary/Lead */}
          {article.summaryLoading ? (
            <div className="mt-2">
              <LoadingSkeleton variant="article" />
            </div>
          ) : article.summaryError ? (
            <p className="body-text" style={{
              color: 'var(--text-subtle)',
              fontStyle: 'italic',
              margin: '0.5rem 0'
            }}>
              [Summary unavailable]
            </p>
          ) : shouldShowSummary ? (
            <p className="body-text" style={{
              color: 'var(--text-secondary)',
              margin: '0.5rem 0',
              lineHeight: 'var(--leading-normal)'
            }}>
              {cleanedSummary}
            </p>
          ) : null}

          {/* Footer with rating and link */}
          <div className="flex items-center justify-between mt-3 pt-2" style={{
            borderTop: '1px dotted var(--border-secondary)'
          }}>
            {renderCartoonPotential()}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="label"
              style={{
                color: 'var(--color-editorial-red)',
                textDecoration: 'none',
                fontSize: 'var(--text-xs)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              READ FULL STORY →
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
      <div className="vintage-border p-3 sm:p-4 md:p-6 mb-6" style={{
        background: 'var(--color-newsprint-light)',
        position: 'relative'
      }}>
        <div className="breaking-news typewriter-text" style={{ marginBottom: '1rem', width: 'auto' }}>
          LOADING WIRE SERVICE...
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="printing-press-reveal" style={{
              background: 'var(--color-newsprint)',
              height: '100px',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vintage-border p-3 sm:p-4 md:p-6 mb-6" style={{
        background: 'var(--color-newsprint-light)',
        position: 'relative'
      }}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8" style={{
            background: 'var(--color-editorial-red)',
            color: 'var(--color-newsprint-light)',
            fontFamily: 'var(--font-ui)',
            fontWeight: 'var(--font-bold)',
            borderRadius: '50%',
            border: '2px solid var(--color-ink)'
          }}>2</span>
          <h2 className="headline-article" style={{ color: 'var(--color-ink)', margin: 0 }}>
            NEWS WIRE
          </h2>
        </div>
        <div className="speech-bubble" style={{
          background: 'var(--color-newsprint)',
          borderColor: 'var(--color-editorial-red)'
        }}>
          <p className="body-text" style={{ color: 'var(--color-editorial-red)', fontWeight: 'var(--font-bold)' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!news || !news.articles || news.articles.length === 0) {
    return (
      <div className="vintage-border p-3 sm:p-4 md:p-6 mb-6" style={{
        background: 'var(--color-newsprint-light)',
        position: 'relative'
      }}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8" style={{
            background: 'var(--color-editorial-red)',
            color: 'var(--color-newsprint-light)',
            fontFamily: 'var(--font-ui)',
            fontWeight: 'var(--font-bold)',
            borderRadius: '50%',
            border: '2px solid var(--color-ink)'
          }}>2</span>
          <h2 className="headline-article" style={{ color: 'var(--color-ink)', margin: 0 }}>
            NEWS WIRE
          </h2>
        </div>
        <div className="text-center py-6 sm:py-8">
          <p className="body-large" style={{ color: 'var(--text-muted)' }}>
            {location?.name
              ? 'No articles found for your search'
              : 'Select keywords to load news articles'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vintage-border torn-edge-top p-3 sm:p-4 md:p-6 mb-6" style={{
      background: 'var(--color-newsprint-light)',
      position: 'relative'
    }}>
      {/* Header with Latest Edition styling */}
      <div className="paper-flip-enter" style={{
        borderBottom: '3px double var(--border-primary)',
        paddingBottom: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="flex items-center justify-center w-8 h-8 stamp-impact" style={{
              background: 'var(--color-editorial-red)',
              color: 'var(--color-newsprint-light)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 'var(--font-bold)',
              borderRadius: '50%',
              border: '2px solid var(--color-ink)'
            }}>2</span>
            <div>
              <h2 className="headline-secondary" style={{
                color: 'var(--color-ink)',
                margin: 0,
                fontSize: 'var(--text-3xl)'
              }}>
                LATEST EDITION
              </h2>
              {news.topic && (
                <p className="label" style={{
                  color: 'var(--text-muted)',
                  marginTop: '0.25rem'
                }}>
                  BEAT: {news.topic.toUpperCase()}
                </p>
              )}
            </div>
          </div>
          <div className="date-stamp-box">
            {selectedArticles.length} SELECTED FOR TOON
          </div>
        </div>
      </div>

      {/* News articles */}
      <div className="grid grid-cols-1 gap-3">
        {news.articles.map((article, idx) => (
          <NewsCard
            key={`${article.title}-${idx}`}
            article={article}
            index={idx}
            selected={selectedArticles.some(
              (a) => a.title === article.title && a.url === article.url
            )}
            onSelect={() => handleSelectArticle(article)}
          />
        ))}
      </div>

      {/* Selected articles indicator */}
      {selectedArticles.length > 0 && (
        <div className="comic-panel mt-4" style={{
          background: 'var(--color-press-yellow)',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <p className="headline-article action-text" style={{
            color: 'var(--color-editorial-red)',
            fontSize: 'var(--text-xl)',
            margin: 0,
            fontFamily: 'var(--font-ui)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wider)'
          }}>
            {selectedArticles.length} {selectedArticles.length === 1 ? 'STORY' : 'STORIES'} READY FOR EDITORIAL CARTOON!
          </p>
        </div>
      )}
    </div>
  );
};

export default NewsDisplay;

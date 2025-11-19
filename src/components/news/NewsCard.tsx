import React from 'react';
import type { NewsArticle } from '../../types';
import { cleanDescription, isTitleDuplicate } from '../../utils/textUtils';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { HumorScore } from './HumorScore';
import { AuthorityBadge } from './AuthorityBadge';

interface NewsCardProps {
  article: NewsArticle;
  selected: boolean;
  onSelect: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article, selected, onSelect }) => {
  // Clean HTML from summary
  const cleanedSummary = article.summary ? cleanDescription(article.summary) : undefined;

  // Filter out summaries that are just duplicates of the title
  const shouldShowSummary = cleanedSummary &&
    cleanedSummary.length > 10 &&
    !isTitleDuplicate(article.title, cleanedSummary);

  return (
    <div
      onClick={onSelect}
      className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
        selected
          ? 'bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 border-purple-500 shadow-lg transform scale-[1.02]'
          : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-md hover:bg-gradient-to-br hover:from-purple-50/30 hover:via-pink-50/30 hover:to-amber-50/30'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="mt-1 w-4 sm:w-5 h-4 sm:h-5 cursor-pointer flex-shrink-0"
          aria-label={`Select article: ${article.title}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
            <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm sm:text-base flex-1">
              {article.title}
            </h3>
            <div className="flex-shrink-0">
              <HumorScore
                score={article.humorScore}
                loading={!!article.summaryLoading}
                error={!!article.summaryError}
              />
            </div>
          </div>
          {article.summaryLoading ? (
            <div className="mt-2">
              <LoadingSkeleton variant="article" />
            </div>
          ) : article.summaryError ? (
            <p className="text-xs text-gray-400 mt-2 italic">
              No summary available
            </p>
          ) : shouldShowSummary ? (
            <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2 sm:line-clamp-4">
              {cleanedSummary}
            </p>
          ) : null}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">Source: {article.source?.name}</p>
              <AuthorityBadge
                isAuthoritative={article.isAuthoritative}
                rankPosition={article.rankPosition}
              />
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-purple-600 hover:text-purple-800 hover:underline font-medium whitespace-nowrap"
            >
              Article →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

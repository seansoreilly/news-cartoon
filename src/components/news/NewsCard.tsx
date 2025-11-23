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
      className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden group ${
        selected
          ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(139,92,246,0.2)] border-2'
          : 'glass-card hover:-translate-y-1'
      }`}
    >
      {/* Selection Glow Effect */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 animate-pulse" />
      )}

      <div className="flex items-start gap-3 sm:gap-4 relative z-10">
        <div className={`mt-1 flex-shrink-0 transition-all duration-300 ${selected ? 'scale-110' : 'group-hover:scale-110'}`}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-5 h-5 cursor-pointer accent-primary rounded border-gray-400 bg-white/50"
            aria-label={`Select article: ${article.title}`}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <h3 className={`font-heading font-semibold text-lg leading-tight transition-colors duration-300 ${
              selected ? 'text-primary-dark' : 'text-slate-800 group-hover:text-primary-dark'
            }`}>
              {article.title}
            </h3>
            <div className="flex-shrink-0 pt-0.5">
              <HumorScore
                score={article.humorScore}
                loading={!!article.summaryLoading}
                error={!!article.summaryError}
              />
            </div>
          </div>

          {article.summaryLoading ? (
            <div className="mt-3">
              <LoadingSkeleton variant="article" />
            </div>
          ) : article.summaryError ? (
            <p className="text-sm text-slate-400 mt-2 italic">
              No summary available
            </p>
          ) : shouldShowSummary ? (
            <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed group-hover:text-slate-700 transition-colors">
              {cleanedSummary}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3 pt-3 border-t border-slate-200/50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/40 text-slate-500 border border-white/40">
                {article.source?.name}
              </span>
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
              className="text-sm font-medium text-primary hover:text-primary-dark hover:underline decoration-primary decoration-2 underline-offset-4 transition-all flex items-center gap-1"
            >
              Read Article 
              <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

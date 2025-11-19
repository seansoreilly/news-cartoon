import React from 'react';

interface AuthorityBadgeProps {
  isAuthoritative?: boolean;
  rankPosition?: number;
}

export const AuthorityBadge: React.FC<AuthorityBadgeProps> = ({ isAuthoritative, rankPosition }) => {
  if (!isAuthoritative && !rankPosition) return null;

  if (isAuthoritative) {
    return (
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Top Source
        </span>
        {rankPosition && (
          <span className="text-xs text-gray-500">
            #{rankPosition}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="text-xs text-gray-500">
      #{rankPosition}
    </span>
  );
};

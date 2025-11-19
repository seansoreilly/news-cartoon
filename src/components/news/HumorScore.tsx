import React from 'react';
import LoadingSkeleton from '../common/LoadingSkeleton';

interface HumorScoreProps {
  score: number | undefined;
  loading: boolean;
  error: boolean;
}

export const HumorScore: React.FC<HumorScoreProps> = ({ score, loading, error }) => {
  if (error) {
    return (
      <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">
        —
      </span>
    );
  }

  if (loading) {
    return <LoadingSkeleton variant="humor-score" />;
  }

  if (score !== undefined) {
    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
        score >= 70 ? 'bg-green-200 text-green-800' :
        score >= 40 ? 'bg-amber-200 text-amber-800' :
        'bg-gray-200 text-gray-700'
      }`}>
        {score}
      </span>
    );
  }

  // Default case: show spinner (should be rare)
  return (
    <div className="inline-flex items-center justify-center w-8 h-8">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
    </div>
  );
};

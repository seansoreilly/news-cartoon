import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'article' | 'humor-score';
}

/**
 * Animated shimmer skeleton loader
 * Shows a loading placeholder with a smooth shimmer animation
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'article' }) => {
  const shimmerStyle = {
    backgroundImage: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)',
    backgroundSize: '1000px 100%',
    backgroundPosition: '-1000px 0',
    animation: 'shimmer 2s infinite',
  } as React.CSSProperties;

  if (variant === 'humor-score') {
    return (
      <div className="inline-flex items-center justify-center w-8 h-8">
        <div className="w-8 h-8 rounded-full" style={shimmerStyle} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Summary text placeholder */}
      <div className="space-y-2">
        <div className="h-4 rounded" style={shimmerStyle} />
        <div className="h-4 rounded w-5/6" style={shimmerStyle} />
        <div className="h-4 rounded w-4/6" style={shimmerStyle} />
      </div>
    </div>
  );
};

export default LoadingSkeleton;

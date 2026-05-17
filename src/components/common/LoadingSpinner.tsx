import React from 'react';
import HalftoneSpinner from './HalftoneSpinner';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="text-purple-600">
        <HalftoneSpinner size="lg" label="Loading" />
      </div>
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-500">
        Loading
      </span>
    </div>
  );
};

export default LoadingSpinner;

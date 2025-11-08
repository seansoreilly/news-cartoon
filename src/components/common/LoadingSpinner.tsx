import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
      </div>
      <span className="ml-4 text-gray-600">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;

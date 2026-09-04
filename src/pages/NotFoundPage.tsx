import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
      >
        Back to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;

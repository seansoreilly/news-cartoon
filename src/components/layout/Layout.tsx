import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const currentYear = new Date().getFullYear();

  // Get build info - these are injected at build time by Vite
  const gitHash = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'dev';
  const gitBranch = typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : 'local';
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-500 relative overflow-hidden">
        <div className="container mx-auto max-w-[900px] px-3 py-4 sm:px-4 sm:py-6 relative">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              NewsCartoon.lol
            </h1>
            <p className="text-white text-opacity-90 mt-1 text-xs sm:text-sm">
              Generate editorial cartoons from news articles
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-[900px] px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8">
        <main className="bg-white rounded-lg shadow-2xl p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>

        <footer className="mt-8 text-center text-white text-sm opacity-80">
          <p>&copy; {currentYear} News Cartoon. All rights reserved.</p>
          <p className="text-xs mt-2 opacity-70">
            {gitBranch}/{gitHash}
            {buildTime && (
              <span className="ml-2">
                • Built {new Date(buildTime).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            )}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;

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
    <div className="min-h-screen flex flex-col">
      {/* Header Banner */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/40 shadow-sm">
        <div className="container mx-auto max-w-[1000px] px-4 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center w-full">
              <img 
                src="/header.jpg" 
                alt="NewsCartoon.lol" 
                className="w-full h-auto object-cover rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              />
            </div>
            {/* Optional: Add a small decorative element or status indicator here */}
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto max-w-[1000px] px-4 py-8">
        <main className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 min-h-[600px]">
          {children}
        </main>

        <footer className="mt-12 text-center text-slate-500 text-sm font-medium">
          <p>&copy; {currentYear} News Cartoon. All rights reserved.</p>
          <p className="text-xs mt-2 text-slate-400">
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

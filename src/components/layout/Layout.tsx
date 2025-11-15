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
    <div className="min-h-screen paper-texture" style={{ background: 'var(--color-newsprint)' }}>
      {/* Newspaper Masthead */}
      <header className="newspaper-masthead">
        <div className="container mx-auto max-w-[900px] px-3 py-4 sm:px-4 sm:py-6 relative">
          <div className="date-stamp-box" style={{ position: 'absolute', left: '1rem', top: '1rem', display: 'none' }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="text-center">
            <h1 className="headline-primary" style={{ color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
              NewsCartoon.lol
            </h1>
            <div className="tagline">
              "All The News That's Fit To Draw" • Editorial Cartoon Generator • Est. 2024
            </div>
            <div className="edition-info">
              <span>DIGITAL EDITION</span>
              <span>•</span>
              <span>VOL. I NO. {Math.floor(Math.random() * 365) + 1}</span>
              <span>•</span>
              <span>FREE</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-[900px] px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8">
        <main className="vintage-border torn-edge-bottom" style={{
          background: 'var(--bg-paper)',
          boxShadow: '0 4px 6px var(--shadow-ink), 0 10px 15px var(--shadow-soft)',
          padding: '1.5rem'
        }}>
          {children}
        </main>

        <footer className="mt-8 text-center" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          <p>&copy; {currentYear} News Cartoon Press. All rights reserved.</p>
          <p className="date-stamp" style={{ marginTop: '0.5rem' }}>
            {gitBranch}/{gitHash}
            {buildTime && (
              <span className="ml-2">
                • Published {new Date(buildTime).toLocaleDateString('en-GB', {
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

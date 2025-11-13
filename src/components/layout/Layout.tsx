import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-500 relative overflow-hidden">
        <div className="container mx-auto max-w-[900px] px-4 py-6 relative">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              NewsCartoon.lol
            </h1>
            <p className="text-white text-opacity-90 mt-1 text-sm">
              Generate editorial cartoons from news articles
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-[900px] px-4 py-8">
        <main className="bg-white rounded-lg shadow-2xl p-6 md:p-8">
          {children}
        </main>

        <footer className="mt-8 text-center text-white text-sm opacity-80">
          <p>&copy; {currentYear} News Cartoon. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;

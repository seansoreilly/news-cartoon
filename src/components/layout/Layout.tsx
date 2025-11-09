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
              News Cartoon
            </h1>
            <p className="text-white text-opacity-90 mt-1 text-sm">
              Dynamically generated cartoons based on your local news
            </p>
          </div>

          {/* Logo positioned on the right */}
          <img
            src="/graphic.png"
            alt="News Cartoon Logo"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 drop-shadow-lg"
          />
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

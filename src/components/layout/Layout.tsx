import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="container mx-auto max-w-[900px] px-4 py-8">
        <header className="mb-8 flex items-center gap-6">
          <img
            src="/graphic.png"
            alt="News Cartoon Logo"
            className="w-24 h-24 md:w-32 md:h-32 drop-shadow-lg"
          />
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              News Cartoon
            </h1>
            <p className="text-white text-opacity-80 mt-2">
              Dynamically generated cartoons based on your local news
            </p>
          </div>
        </header>

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

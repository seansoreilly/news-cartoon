import { NavLink } from 'react-router-dom';

const Navigation: React.FC = () => {
  return (
    <nav className="flex gap-4 mb-8 border-b border-gray-200">
      <NavLink
        to="/"
        aria-label="Navigate to Home page"
        className={({ isActive }) =>
          `font-medium transition-colors py-3 px-2 inline-block min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
            isActive
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`
        }
      >
        Home
      </NavLink>
      <NavLink
        to="/history"
        aria-label="Navigate to History page"
        className={({ isActive }) =>
          `font-medium transition-colors py-3 px-2 inline-block min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
            isActive
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`
        }
      >
        History
      </NavLink>
      <NavLink
        to="/settings"
        aria-label="Navigate to Settings page"
        className={({ isActive }) =>
          `font-medium transition-colors py-3 px-2 inline-block min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
            isActive
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`
        }
      >
        Settings
      </NavLink>
    </nav>
  );
};

export default Navigation;

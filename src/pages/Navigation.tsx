import { NavLink } from 'react-router-dom';

const Navigation: React.FC = () => {
  return (
    <nav className="flex gap-6 mb-8 border-b border-gray-200 pb-4">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `font-medium transition-colors ${
            isActive
              ? 'text-purple-600 border-b-2 border-purple-600 pb-1'
              : 'text-gray-600 hover:text-gray-800'
          }`
        }
      >
        Home
      </NavLink>
      <NavLink
        to="/history"
        className={({ isActive }) =>
          `font-medium transition-colors ${
            isActive
              ? 'text-purple-600 border-b-2 border-purple-600 pb-1'
              : 'text-gray-600 hover:text-gray-800'
          }`
        }
      >
        History
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `font-medium transition-colors ${
            isActive
              ? 'text-purple-600 border-b-2 border-purple-600 pb-1'
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

import React from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { Moon, Sun } from 'lucide-react';

const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDarkMode
          ? 'bg-gray-700 focus:ring-blue-500 focus:ring-offset-gray-800'
          : 'bg-gray-300 focus:ring-blue-500 focus:ring-offset-gray-100'
      }`}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Sliding circle background */}
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
          isDarkMode ? 'translate-x-7' : 'translate-x-1'
        }`}
      >
        {/* Icon inside the toggle */}
        <div className="flex items-center justify-center h-full w-full">
          {isDarkMode ? (
            <Moon size={16} className="text-gray-700" />
          ) : (
            <Sun size={16} className="text-yellow-500" />
          )}
        </div>
      </span>
    </button>
  );
};

export default DarkModeToggle;

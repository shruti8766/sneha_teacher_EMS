import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';
import { ChevronDown, LogOut, User, Settings } from 'lucide-react';

const UserProfileCard: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-600';
      case 'teacher':
        return 'bg-blue-600';
      case 'student':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-300 ${
          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}
      >
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full ${getRoleColor(user?.role)} flex items-center justify-center text-white font-semibold text-sm`}>
          {getInitials(user?.name)}
        </div>

        {/* User Info - Hidden on mobile */}
        <div className="hidden sm:flex flex-col items-start">
          <span className={`text-sm font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>{user?.name || 'User'}</span>
          <span className={`text-xs capitalize transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>{user?.role || 'Unknown'}</span>
        </div>

        {/* Dropdown Chevron */}
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg border z-50 animate-fade-in transition-colors duration-300 ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          {/* User Info Header */}
          <div className={`px-4 py-4 border-b transition-colors duration-300 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <p className={`font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{user?.name}</p>
            <p className={`text-sm capitalize mt-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>{user?.role} Account</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button 
              onClick={() => {
                const profilePath = user?.role === 'student' ? '/student/profile' : '/profile';
                navigate(profilePath);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 flex items-center gap-3 transition-colors duration-300 text-left ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              <span>View Profile</span>
            </button>
            {/* Only show Settings for admin */}
            {user?.role === 'admin' && (
              <button 
                onClick={() => {
                  navigate('/settings');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 flex items-center gap-3 transition-colors duration-300 text-left ${
                  isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                <span>Settings</span>
              </button>
            )}
          </div>

          {/* Logout Button */}
          <div className={`px-4 py-3 border-t transition-colors duration-300 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-300 ${
                isDarkMode
                  ? 'text-red-400 hover:bg-red-900 hover:text-red-300'
                  : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileCard;

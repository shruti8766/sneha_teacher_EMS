import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';

interface PageItem {
  name: string;
  path: string;
  icon: string;
  category: string;
}

interface SearchResult extends PageItem {
  id?: string;
}

// Moved static page lists outside the component for performance (they don't change)
const adminPages: PageItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊', category: 'Main' },
  { name: 'Students', path: '/students', icon: '👥', category: 'Management' },
  { name: 'Teachers', path: '/teachers', icon: '🎓', category: 'Management' },
  { name: 'Batches', path: '/batches', icon: '📚', category: 'Management' },
  { name: 'Homework', path: '/homework', icon: '✏️', category: 'Academic' },
  { name: 'Fees', path: '/fees', icon: '💳', category: 'Finance' },
  { name: 'Attendance', path: '/attendance', icon: '✓', category: 'Academic' },
  { name: 'Tests', path: '/tests', icon: '📝', category: 'Academic' },
  { name: 'Timetable', path: '/timetable', icon: '📅', category: 'Academic' },
  { name: 'Analytics', path: '/analytics', icon: '📈', category: 'Reports' },
  { name: 'Messages', path: '/messages', icon: '💬', category: 'Communication' },
  { name: 'Materials', path: '/materials', icon: '📖', category: 'Academic' },
];

const studentPages: PageItem[] = [
  { name: 'Dashboard', path: '/student/dashboard', icon: '📊', category: 'Main' },
  { name: 'Homework', path: '/student/homework', icon: '✏️', category: 'Academic' },
  { name: 'Tests', path: '/student/tests', icon: '📝', category: 'Academic' },
  { name: 'Attendance', path: '/student/attendance', icon: '✓', category: 'Academic' },
  { name: 'Fees', path: '/student/fees', icon: '💳', category: 'Finance' },
  { name: 'Messages', path: '/student/messages', icon: '💬', category: 'Communication' },
  { name: 'Materials', path: '/student/materials', icon: '📖', category: 'Academic' },
  { name: 'Profile', path: '/student/profile', icon: '👤', category: 'Account' },
];

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = user?.role === 'student' ? studentPages : adminPages;

  // Filter results (shows all pages when query is empty)
  useEffect(() => {
    const lowerQuery = query.trim().toLowerCase();
    const filtered = pages.filter(
      (page) =>
        page.name.toLowerCase().includes(lowerQuery) ||
        page.category.toLowerCase().includes(lowerQuery)
    );
    setResults(filtered);
  }, [query, pages]);

  // Always highlight the first result when the result list changes
  useEffect(() => {
    if (results.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [results]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Global shortcuts + keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K → open/focus
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      // Escape → close and clear
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      }

      // Keyboard navigation when dropdown is open
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev === -1 ? 0 : prev + 1 >= results.length ? 0 : prev + 1
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev === -1 ? results.length - 1 : prev - 1 < 0 ? results.length - 1 : prev - 1
          );
        } else if (e.key === 'Enter' && highlightedIndex !== -1) {
          e.preventDefault();
          handleSelect(results[highlightedIndex].path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, highlightedIndex]);

  const handleSelect = (path: string) => {
    navigate(path);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const isCurrentPage = (path: string) => location.pathname === path;

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <Search size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pages... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {results.length > 0 ? (
            <div className="py-2">
              {/* Group results by category */}
              {Array.from(new Set(results.map((r) => r.category))).map((category) => (
                <div key={category}>
                  <div
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider sticky top-0 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400 bg-gray-700' : 'text-gray-500 bg-gray-50'
                    }`}
                  >
                    {category}
                  </div>
                  {results
                    .filter((r) => r.category === category)
                    .map((page) => {
                      const index = results.findIndex((p) => p.path === page.path);
                      const isHighlighted = highlightedIndex === index;

                      let itemClass = 'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-300 ';
                      if (isHighlighted) {
                        itemClass += isDarkMode
                          ? 'bg-blue-900 text-white'
                          : 'bg-blue-100 text-blue-900';
                      } else if (isCurrentPage(page.path)) {
                        itemClass += isDarkMode
                          ? 'bg-blue-900 text-blue-300 border-l-2 border-blue-400'
                          : 'bg-blue-50 text-blue-600 border-l-2 border-blue-600';
                      } else {
                        itemClass += isDarkMode
                          ? 'hover:bg-gray-700 text-gray-300'
                          : 'hover:bg-gray-50 text-gray-700';
                      }

                      return (
                        <button
                          key={page.path}
                          onClick={() => handleSelect(page.path)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={itemClass}
                        >
                          <span className="text-lg">{page.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium">{page.name}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {category}
                            </div>
                          </div>
                          {isCurrentPage(page.path) && !isHighlighted && (
                            <span className={`text-xs font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                              Current
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          ) : (
            <div className={`px-4 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No results found for "{query}"</p>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Try searching with different keywords
              </p>
            </div>
          )}
        </div>
      )}

      {/* Shortcut hint */}
      {!query && !isOpen && (
        <div
          className={`absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none text-xs rounded transition-colors duration-300 ${
            isDarkMode ? 'text-gray-500 bg-gray-700 px-2 py-1' : 'text-gray-400 bg-gray-50 px-2 py-1'
          }`}
        >
          <kbd
            className={`px-2 py-0.5 rounded text-sm font-mono border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-600 border-gray-500 text-gray-300'
                : 'bg-white border-gray-300 text-gray-600'
            }`}
          >
            Ctrl
          </kbd>
          <span>+</span>
          <kbd
            className={`px-2 py-0.5 rounded text-sm font-mono border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-600 border-gray-500 text-gray-300'
                : 'bg-white border-gray-300 text-gray-600'
            }`}
          >
            K
          </kbd>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useToast } from '../context/ToastContext';
import { 
  Book,
  Search,
  ChevronRight,
  Loader2,
  BookOpen,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

interface Chapter {
  id: string;
  chapter: string;
  slug: string;
  description?: string;
  topics?: string[];
  duration?: string;
  difficulty?: string;
  order?: number;
}

const Materials: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();

  // Syllabus states
  const [boards, setBoards] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'boards' | 'classes' | 'subjects' | 'chapters'>('boards');

  // Load boards on component mount
  useEffect(() => {
    if (boards.length === 0) {
      loadBoards();
    }
  }, []);

  const handleBoardClick = (board: string) => {
    setSelectedBoard(board);
    setView('classes');
    loadClasses(board);
  };

  const handleClassClick = (cls: string) => {
    setSelectedClass(cls);
    setView('subjects');
    loadSubjects(selectedBoard, cls);
  };

  const handleSubjectClick = (subject: string) => {
    setSelectedSubject(subject);
    setView('chapters');
    loadChapters(selectedBoard, selectedClass, subject);
  };

  const handleBack = () => {
    if (view === 'chapters') {
      setView('subjects');
      setSelectedSubject('');
      setChapters([]);
    } else if (view === 'subjects') {
      setView('classes');
      setSelectedClass('');
      setSubjects([]);
    } else if (view === 'classes') {
      setView('boards');
      setSelectedBoard('');
      setClasses([]);
    }
  };

  const loadBoards = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://sneha-pugqtr4ooq-uc.a.run.app/api/syllabus/boards');
      const data = await response.json();
      if (data.success) {
        setBoards(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      showToast('Failed to load boards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async (board: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://sneha-pugqtr4ooq-uc.a.run.app/api/syllabus/classes?board=${encodeURIComponent(board)}`);
      const data = await response.json();
      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      showToast('Failed to load classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (board: string, cls: string) => {
    setLoading(true);
    try {
      const url = `https://sneha-pugqtr4ooq-uc.a.run.app/api/syllabus/subjects?board=${encodeURIComponent(board)}&class=${encodeURIComponent(cls)}`;
      console.log('Loading subjects from:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('Subjects response:', data);
      if (data.success) {
        setSubjects(data.data || []);
        if (data.data.length === 0) {
          showToast('No subjects available for this class', 'info');
        }
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
      showToast('Failed to load subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (board: string, cls: string, subject: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://sneha-pugqtr4ooq-uc.a.run.app/api/syllabus/chapters?board=${encodeURIComponent(board)}&class=${encodeURIComponent(cls)}&subject=${encodeURIComponent(subject)}`);
      const data = await response.json();
      if (data.success) {
        setChapters(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load chapters:', error);
      showToast('Failed to load chapters', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter chapters by search query
  const filteredChapters = chapters.filter(chapter =>
    chapter.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <BookOpen className="text-cyan-600" size={28} />
            Syllabus Browser
          </h1>
          <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Browse course syllabus by board, class, and subject</p>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {(view !== 'boards') && (
        <div className={`rounded-lg shadow-sm border px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => { setView('boards'); setSelectedBoard(''); setClasses([]); }}
              className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
            >
              Boards
            </button>
            {selectedBoard && (
              <>
                <ChevronRight size={16} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
                {view === 'classes' ? (
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedBoard}</span>
                ) : (
                  <button 
                    onClick={() => { setView('classes'); setSelectedClass(''); setSubjects([]); }}
                    className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    {selectedBoard}
                  </button>
                )}
              </>
            )}
            {selectedClass && (
              <>
                <ChevronRight size={16} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
                {view === 'subjects' ? (
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Class {selectedClass}</span>
                ) : (
                  <button 
                    onClick={() => { setView('subjects'); setSelectedSubject(''); setChapters([]); }}
                    className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    Class {selectedClass}
                  </button>
                )}
              </>
            )}
            {selectedSubject && (
              <>
                <ChevronRight size={16} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedSubject}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search Bar (only for chapters view) */}
      {view === 'chapters' && (
        <div className={`rounded-lg shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className={`rounded-lg shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className={`animate-spin ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} size={32} />
            </div>
          ) : view === 'boards' ? (
            <div>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Board</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {boards.map((board) => (
                  <div
                    key={board}
                    onClick={() => handleBoardClick(board)}
                    className={`border rounded-lg p-3 transition cursor-pointer group ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:border-blue-500 hover:shadow-lg' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-900 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Book size={18} />
                      </div>
                      <h3 className={`text-sm font-semibold transition ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'}`}>{board}</h3>
                    </div>
                    <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span>View classes</span>
                      <ChevronRight className="ml-auto group-hover:translate-x-1 transition-transform" size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === 'classes' ? (
            <div>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Class</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {classes.map((cls) => (
                  <div
                    key={cls}
                    onClick={() => handleClassClick(cls)}
                    className={`border rounded-lg p-3 transition cursor-pointer text-center group ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:border-purple-500 hover:shadow-lg' : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-lg'}`}
                  >
                    <div className={`text-2xl font-bold mb-1 group-hover:scale-110 transition-transform ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{cls}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class {cls}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === 'subjects' ? (
            <div>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Subject</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <div
                    key={subject}
                    onClick={() => handleSubjectClick(subject)}
                    className={`border rounded-lg p-3 transition cursor-pointer group ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:border-green-500 hover:shadow-lg' : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-lg'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>
                        <BookOpen size={18} />
                      </div>
                      <h3 className={`text-sm font-semibold flex-1 transition ${isDarkMode ? 'text-white group-hover:text-green-400' : 'text-gray-900 group-hover:text-green-600'}`}>{subject}</h3>
                    </div>
                    <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span>View chapters</span>
                      <ChevronRight className="ml-auto group-hover:translate-x-1 transition-transform" size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === 'chapters' ? (
            filteredChapters.length === 0 ? (
              <div className="text-center py-12 px-4">
                <BookOpen className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No Chapters Found</h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No syllabus available for the selected combination</p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedBoard} - Class {selectedClass} - {selectedSubject}
                  </h2>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{filteredChapters.length} chapters available</p>
                </div>

                <div className="space-y-4">
                  {filteredChapters.map((chapter, index) => (
                    <div 
                      key={chapter.id} 
                      className={`border rounded-lg p-5 transition ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:border-blue-500 hover:shadow-md' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${isDarkMode ? 'bg-blue-900 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                              {chapter.order || index + 1}
                            </span>
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{chapter.chapter}</h3>
                          </div>

                          {chapter.description && (
                            <p className={`mb-3 ml-11 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{chapter.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 ml-11">
                            {chapter.duration && (
                              <div className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Clock size={16} />
                                <span>{chapter.duration}</span>
                              </div>
                            )}
                            
                            {chapter.difficulty && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                chapter.difficulty === 'easy' ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700') :
                                chapter.difficulty === 'medium' ? (isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                                (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
                              }`}>
                                {chapter.difficulty.charAt(0).toUpperCase() + chapter.difficulty.slice(1)}
                              </span>
                            )}

                            {chapter.topics && chapter.topics.length > 0 && (
                              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {chapter.topics.length} topics
                              </span>
                            )}
                          </div>

                          {chapter.topics && chapter.topics.length > 0 && (
                            <div className="mt-3 ml-11">
                              <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Topics:</p>
                              <div className="flex flex-wrap gap-2">
                                {chapter.topics.map((topic, idx) => (
                                  <span key={idx} className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : null}
      </div>
    </div>
  );
};

export default Materials;

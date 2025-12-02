import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Syllabus Browser</h1>
          <p className="text-gray-600 mt-1">Browse course syllabus by board, class, and subject</p>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {(view !== 'boards') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => { setView('boards'); setSelectedBoard(''); setClasses([]); }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Boards
            </button>
            {selectedBoard && (
              <>
                <ChevronRight size={16} className="text-gray-400" />
                {view === 'classes' ? (
                  <span className="text-gray-900 font-medium">{selectedBoard}</span>
                ) : (
                  <button 
                    onClick={() => { setView('classes'); setSelectedClass(''); setSubjects([]); }}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selectedBoard}
                  </button>
                )}
              </>
            )}
            {selectedClass && (
              <>
                <ChevronRight size={16} className="text-gray-400" />
                {view === 'subjects' ? (
                  <span className="text-gray-900 font-medium">Class {selectedClass}</span>
                ) : (
                  <button 
                    onClick={() => { setView('subjects'); setSelectedSubject(''); setChapters([]); }}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Class {selectedClass}
                  </button>
                )}
              </>
            )}
            {selectedSubject && (
              <>
                <ChevronRight size={16} className="text-gray-400" />
                <span className="text-gray-900 font-medium">{selectedSubject}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search Bar (only for chapters view) */}
      {view === 'chapters' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : view === 'boards' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Board</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {boards.map((board) => (
                  <div
                    key={board}
                    onClick={() => handleBoardClick(board)}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-lg transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Book className="text-blue-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">{board}</h3>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span>View classes</span>
                      <ChevronRight className="ml-auto group-hover:translate-x-1 transition-transform" size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === 'classes' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Class</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {classes.map((cls) => (
                  <div
                    key={cls}
                    onClick={() => handleClassClick(cls)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-lg transition cursor-pointer text-center group"
                  >
                    <div className="text-3xl font-bold text-purple-600 mb-1 group-hover:scale-110 transition-transform">{cls}</div>
                    <div className="text-xs text-gray-600">Class {cls}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === 'subjects' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Subject</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => (
                  <div
                    key={subject}
                    onClick={() => handleSubjectClick(subject)}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-lg transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="text-green-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition flex-1">{subject}</h3>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
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
                <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Chapters Found</h3>
                <p className="text-gray-600">No syllabus available for the selected combination</p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedBoard} - Class {selectedClass} - {selectedSubject}
                  </h2>
                  <p className="text-gray-600 mt-1">{filteredChapters.length} chapters available</p>
                </div>

                <div className="space-y-4">
                  {filteredChapters.map((chapter, index) => (
                    <div 
                      key={chapter.id} 
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                              {chapter.order || index + 1}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900">{chapter.chapter}</h3>
                          </div>

                          {chapter.description && (
                            <p className="text-gray-600 mb-3 ml-11">{chapter.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 ml-11">
                            {chapter.duration && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock size={16} />
                                <span>{chapter.duration}</span>
                              </div>
                            )}
                            
                            {chapter.difficulty && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                chapter.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                chapter.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {chapter.difficulty.charAt(0).toUpperCase() + chapter.difficulty.slice(1)}
                              </span>
                            )}

                            {chapter.topics && chapter.topics.length > 0 && (
                              <span className="text-sm text-gray-500">
                                {chapter.topics.length} topics
                              </span>
                            )}
                          </div>

                          {chapter.topics && chapter.topics.length > 0 && (
                            <div className="mt-3 ml-11">
                              <p className="text-sm font-medium text-gray-700 mb-2">Topics:</p>
                              <div className="flex flex-wrap gap-2">
                                {chapter.topics.map((topic, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
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

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  ApiListResponse, 
  Student, 
  Teacher, 
  Batch, 
  Test, 
  AttendanceSession,
  ActivityLog,
  LogStats
} from '../types';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { 
  Loader2, 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Clock,
  Target,
  AlertCircle
} from 'lucide-react';

interface OverviewStats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalBatches: number;
  totalTests: number;
  totalSessions: number;
  averageAttendance: number;
}

interface SubjectPerformance {
  subject: string;
  studentCount: number;
  batchCount: number;
  testCount: number;
}

interface BoardDistribution {
  board: string;
  count: number;
}

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalTeachers: 0,
    totalBatches: 0,
    totalTests: 0,
    totalSessions: 0,
    averageAttendance: 0
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [logStats, setLogStats] = useState<LogStats>({});
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch main data in parallel
      const [
        studentsRes,
        teachersRes,
        batchesRes,
        testsRes,
        sessionsRes
      ] = await Promise.all([
        api.get<ApiListResponse<Student>>('/students?limit=1000'),
        api.get<ApiListResponse<Teacher>>('/teachers?limit=500'),
        api.get<ApiListResponse<Batch>>('/batches?limit=500'),
        api.get<ApiListResponse<Test>>('/tests?limit=500'),
        api.get<ApiListResponse<AttendanceSession>>('/attendance/sessions?limit=1000')
      ]);

      const studentsData = studentsRes.items || [];
      const teachersData = teachersRes.items || [];
      const batchesData = batchesRes.items || [];
      const testsData = testsRes.items || [];
      const sessionsData = sessionsRes.items || [];

      // Filter active teachers only (treat undefined/missing active field as true)
      const activeTeachers = teachersData.filter(t => t.active !== false);

      setStudents(studentsData);
      setTeachers(activeTeachers);
      setBatches(batchesData);
      setTests(testsData);
      setSessions(sessionsData);

      // Try to fetch logs - optional, don't fail if not available
      try {
        const logsRes = await api.get<ApiListResponse<ActivityLog>>('/logs/recent?limit=20');
        setRecentLogs(logsRes.items || []);
      } catch (logError) {
        // Silently handle - endpoint not yet implemented
        setRecentLogs([]);
      }

      // Try to fetch log stats - optional, don't fail if not available
      try {
        const statsRes = await api.get<{ ok: boolean; stats: LogStats }>('/logs/stats');
        setLogStats(statsRes.stats || {});
      } catch (statsError) {
        // Silently handle - endpoint not yet implemented
        // Calculate basic stats from existing data if endpoint not available
        const calculatedStats: LogStats = {
          total_students: studentsData.length,
          total_teachers: activeTeachers.length,
          total_batches: batchesData.length,
          total_tests: testsData.length,
          total_sessions: sessionsData.length
        };
        setLogStats(calculatedStats);
      }

      // Calculate statistics
      const activeStudents = studentsData.filter(s => s.active !== false).length;
      
      setOverviewStats({
        totalStudents: studentsData.length,
        activeStudents,
        totalTeachers: activeTeachers.length,
        totalBatches: batchesData.length,
        totalTests: testsData.length,
        totalSessions: sessionsData.length,
        averageAttendance: 0 // Can be calculated from actual attendance data
      });

    } catch (error: any) {
      showToast(error.message || 'Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectPerformance = (): SubjectPerformance[] => {
    const subjectMap: { [key: string]: SubjectPerformance } = {};

    batches.forEach(batch => {
      if (!subjectMap[batch.subject]) {
        subjectMap[batch.subject] = {
          subject: batch.subject,
          studentCount: 0,
          batchCount: 0,
          testCount: 0
        };
      }
      subjectMap[batch.subject].batchCount += 1;
      subjectMap[batch.subject].studentCount += batch.studentIds?.length || 0;
    });

    tests.forEach(test => {
      if (subjectMap[test.subject]) {
        subjectMap[test.subject].testCount += 1;
      }
    });

    return Object.values(subjectMap).sort((a, b) => b.studentCount - a.studentCount);
  };

  const getBoardDistribution = (): BoardDistribution[] => {
    const boardMap: { [key: string]: number } = {};
    
    students.forEach(student => {
      boardMap[student.board] = (boardMap[student.board] || 0) + 1;
    });

    return Object.entries(boardMap)
      .map(([board, count]) => ({ board, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getStandardDistribution = (): { standard: number; count: number }[] => {
    const standardMap: { [key: number]: number } = {};
    
    students.forEach(student => {
      standardMap[student.standard] = (standardMap[student.standard] || 0) + 1;
    });

    return Object.entries(standardMap)
      .map(([standard, count]) => ({ standard: parseInt(standard), count: count as number }))
      .sort((a, b) => a.standard - b.standard);
  };

  const getRecentActivity = () => {
    return recentLogs.map(log => {
      const timestamp = typeof log.timestamp === 'string' 
        ? new Date(log.timestamp)
        : new Date(log.timestamp._seconds * 1000);
      
      return {
        ...log,
        formattedTime: timestamp.toLocaleString()
      };
    });
  };

  const formatActionName = (action: string): string => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const subjectPerformance = getSubjectPerformance();
  const boardDistribution = getBoardDistribution();
  const standardDistribution = getStandardDistribution();
  const recentActivity = getRecentActivity();

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <BarChart3 className="text-indigo-600" size={36} />
            Analytics & Insights
          </h1>
          <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Data-driven insights and performance metrics</p>
        </div>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Activity size={18} />
          Refresh Data
        </button>
      </div>

      {/* Key Metrics Summary Bar */}
      <div className={`rounded-xl shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{overviewStats.totalStudents}</div>
            <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</div>
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>↑ {overviewStats.activeStudents} active</div>
          </div>
          <div className={`text-center border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-3xl font-bold text-purple-600">{overviewStats.totalTeachers}</div>
            <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Teachers</div>
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Faculty members</div>
          </div>
          <div className={`text-center border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-3xl font-bold text-green-600">{overviewStats.totalBatches}</div>
            <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Batches</div>
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Running classes</div>
          </div>
          <div className={`text-center border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-3xl font-bold text-orange-600">{overviewStats.totalTests}</div>
            <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Tests</div>
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Assessments conducted</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`rounded-xl p-6 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="text-indigo-600" size={20} />
              <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Engagement Rate</span>
            </div>
            <span className="text-2xl font-bold text-indigo-600">
              {overviewStats.totalStudents > 0 
                ? Math.round((overviewStats.activeStudents / overviewStats.totalStudents) * 100)
                : 0}%
            </span>
          </div>
          <div className={`w-full rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${overviewStats.totalStudents > 0 ? (overviewStats.activeStudents / overviewStats.totalStudents) * 100 : 0}%` }}
            ></div>
          </div>
          <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Active students vs total enrolled</div>
        </div>

        <div className={`rounded-xl p-6 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-green-600" size={20} />
              <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Avg Batch Size</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {overviewStats.totalBatches > 0
                ? Math.round(batches.reduce((sum, b) => sum + (b.studentIds?.length || 0), 0) / overviewStats.totalBatches)
                : 0}
            </span>
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Students per class</div>
          <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Optimal range: 15-25 students</div>
        </div>

        <div className={`rounded-xl p-6 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-orange-600" size={20} />
              <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Attendance Sessions</span>
            </div>
            <span className="text-2xl font-bold text-orange-600">{overviewStats.totalSessions}</span>
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total sessions tracked</div>
          <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Regular attendance monitoring</div>
        </div>
      </div>

      {/* Subject Performance & Board Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={24} />
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Subject Performance</h2>
            </div>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student enrollment by subject</p>
          </div>
          <div className="p-6">
            {subjectPerformance.length > 0 ? (
              <div className="space-y-6">
                {/* Bar Chart Visualization */}
                <div className="flex items-end justify-between gap-2 h-48">
                  {subjectPerformance.map((subject, idx) => {
                    const maxCount = Math.max(...subjectPerformance.map(s => s.studentCount));
                    const height = maxCount > 0 ? (subject.studentCount / maxCount) * 100 : 0;
                    const colors = [
                      'bg-blue-500',
                      'bg-green-500',
                      'bg-purple-500',
                      'bg-orange-500',
                      'bg-pink-500',
                      'bg-cyan-500',
                      'bg-red-500',
                      'bg-yellow-500'
                    ];
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex items-end justify-center" style={{ height: '160px' }}>
                          <div
                            className={`${colors[idx % colors.length]} rounded-t-lg w-full transition-all duration-500 hover:opacity-80 cursor-pointer relative group`}
                            style={{ height: `${height}%`, minHeight: height > 0 ? '20px' : '0px' }}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                              <div className={`text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg ${isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-900 text-white'}`}>
                                <p className="font-bold">{subject.subject}</p>
                                <p className="mt-1">{subject.studentCount} students</p>
                                <p>{subject.batchCount} batches</p>
                                <p>{subject.testCount} tests</p>
                              </div>
                            </div>
                            {/* Value on bar */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {subject.studentCount}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className={`text-xs font-medium truncate w-full ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} title={subject.subject}>
                            {subject.subject.length > 8 ? subject.subject.substring(0, 8) + '...' : subject.subject}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend/Details */}
                <div className={`border-t pt-4 ${isDarkMode ? 'border-gray-700' : ''}`}>
                  <div className="grid grid-cols-1 gap-2">
                    {subjectPerformance.map((subject, idx) => {
                      const colors = [
                        'bg-blue-500',
                        'bg-green-500',
                        'bg-purple-500',
                        'bg-orange-500',
                        'bg-pink-500',
                        'bg-cyan-500',
                        'bg-red-500',
                        'bg-yellow-500'
                      ];
                      
                      return (
                        <div key={idx} className={`flex items-center justify-between p-2 rounded-lg transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${colors[idx % colors.length]}`}></div>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{subject.subject}</span>
                          </div>
                          <div className={`flex items-center gap-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{subject.studentCount} students</span>
                            <span>{subject.batchCount} batches</span>
                            <span>{subject.testCount} tests</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No subject data available</p>
            )}
          </div>
        </div>

        {/* Board Distribution */}
        <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <PieChart className="text-green-600" size={24} />
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Board Distribution</h2>
            </div>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Students across different boards</p>
          </div>
          <div className="p-6">
            {boardDistribution.length > 0 ? (
              <div className="space-y-4">
                {boardDistribution.map((board, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{
                        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5]
                      }}></div>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{board.board}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{board.count}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {Math.round((board.count / overviewStats.totalStudents) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No board data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Standard Distribution with Horizontal Bar Chart */}
      <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="text-purple-600" size={24} />
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Standard Distribution</h2>
              </div>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student enrollment across standards</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Standards</p>
              <p className="text-2xl font-bold text-purple-600">{standardDistribution.length}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {standardDistribution.length > 0 ? (
            <div className="space-y-4">
              {standardDistribution.map((std, idx) => {
                const maxCount = Math.max(...standardDistribution.map(s => s.count));
                const percentage = maxCount > 0 ? (std.count / maxCount) * 100 : 0;
                const bgColors = [
                  'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
                  'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500',
                  'bg-pink-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500'
                ];
                
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <div className={`w-24 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Standard {std.standard}
                    </div>
                    <div className="flex-1 relative">
                      <div className={`w-full rounded-full h-8 overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div
                          className={`${bgColors[idx % bgColors.length]} h-full rounded-full transition-all duration-500 flex items-center justify-between px-3`}
                          style={{ width: `${percentage}%`, minWidth: std.count > 0 ? '60px' : '0px' }}
                        >
                          <span className="text-white text-sm font-semibold">
                            {std.count} students
                          </span>
                          <span className="text-white text-xs font-medium">
                            {Math.round((std.count / overviewStats.totalStudents) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No standard data available</p>
          )}
        </div>
      </div>

      {/* Activity Statistics with Stacked View */}
      <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="text-orange-600" size={24} />
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Activity Statistics</h2>
              </div>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>System-wide activity breakdown</p>
            </div>
            <div className="text-right">
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Activities</p>
              <p className="text-2xl font-bold text-orange-600">
                {Object.values(logStats).reduce((sum: number, count) => sum + (count as number), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {Object.keys(logStats).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(logStats)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([action, count], idx) => {
                  const totalActivities = Object.values(logStats).reduce((sum: number, c) => sum + (c as number), 0) as number;
                  const percentage = totalActivities > 0 ? ((count as number) / totalActivities) * 100 : 0;
                  const iconColors = isDarkMode
                    ? ['bg-orange-900 text-orange-400', 'bg-blue-900 text-blue-400', 'bg-green-900 text-green-400', 'bg-purple-900 text-purple-400', 'bg-pink-900 text-pink-400', 'bg-cyan-900 text-cyan-400']
                    : ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-cyan-100 text-cyan-600'];
                  const barColors = [
                    'bg-orange-500',
                    'bg-blue-500',
                    'bg-green-500',
                    'bg-purple-500',
                    'bg-pink-500',
                    'bg-cyan-500',
                  ];
                  
                  return (
                    <div key={idx} className={`flex items-center gap-4 p-3 rounded-lg transition ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      <div className={`${iconColors[idx % iconColors.length]} p-2 rounded-lg`}>
                        <Activity size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                            {formatActionName(action)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {percentage.toFixed(1)}%
                            </span>
                            <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {count}
                            </span>
                          </div>
                        </div>
                        <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                          <div
                            className={`${barColors[idx % barColors.length]} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No activity data available</p>
          )}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="text-blue-600" size={24} />
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Recent Activity</h2>
              </div>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Latest system activities and changes</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
              Last {recentActivity.length} activities
            </span>
          </div>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="relative">
              {/* Timeline Line */}
              <div className={`absolute left-6 top-0 bottom-0 w-0.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              
              <div className="space-y-4">
                {recentActivity.map((log, idx) => {
                  const actionColors: { [key: string]: string } = isDarkMode ? {
                    'create': 'bg-green-900 text-green-300',
                    'update': 'bg-blue-900 text-blue-300',
                    'delete': 'bg-red-900 text-red-300',
                    'default': 'bg-indigo-900 text-indigo-300'
                  } : {
                    'create': 'bg-green-100 text-green-600',
                    'update': 'bg-blue-100 text-blue-600',
                    'delete': 'bg-red-100 text-red-600',
                    'default': 'bg-indigo-100 text-indigo-600'
                  };
                  const actionType = log.action.toLowerCase().includes('create') ? 'create' 
                    : log.action.toLowerCase().includes('update') ? 'update'
                    : log.action.toLowerCase().includes('delete') ? 'delete'
                    : 'default';
                  
                  return (
                    <div key={idx} className="relative flex items-start gap-4 pl-12">
                      {/* Timeline Dot */}
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-4 border-white ${actionColors[actionType]} shadow-sm z-10`}></div>
                      
                      {/* Content Card */}
                      <div className={`flex-1 rounded-lg p-4 hover:shadow-md transition ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${actionColors[actionType]}`}>
                                {formatActionName(log.action)}
                              </span>
                              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{log.formattedTime}</span>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                              {log.entityType}: <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{log.entityName}</span>
                            </p>
                            {log.performedBy && (
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                By: {log.performedBy}
                              </p>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className={`mt-2 text-xs p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}>
                                <span className="font-medium">Details: </span>
                                {JSON.stringify(log.details).substring(0, 150)}
                                {JSON.stringify(log.details).length > 150 && '...'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

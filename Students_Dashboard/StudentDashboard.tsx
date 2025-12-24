import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { 
  BookOpen, 
  ClipboardCheck, 
  Calendar, 
  DollarSign, 
  MessageSquare, 
  FileText,
  User,
  Award,
  TrendingUp,
  Loader2,
  Zap,
  BarChart3,
  ArrowRight,
  Clock
} from 'lucide-react';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  board: string;
  standard: number;
  phone?: string;
  subjects?: string[];
  schoolName?: string;
  parentName?: string;
  parentPhone?: string;
}

interface DashboardStats {
  totalHomework: number;
  pendingHomework: number;
  totalTests: number;
  averageMarks: number;
  attendancePercentage: number;
  unreadMessages: number;
}

interface RecentMessage {
  id: string;
  title: string;
  priority: string;
  createdAt?: any;
}

interface RecentTest {
  id: string;
  title: string;
  percentage: number;
}

interface RecentHomework {
  id: string;
  title: string;
  subject?: string;
  dueDate?: any;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalHomework: 0,
    pendingHomework: 0,
    totalTests: 0,
    averageMarks: 0,
    attendancePercentage: 0,
    unreadMessages: 0
  });
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [recentHomework, setRecentHomework] = useState<RecentHomework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get student profile
      const studentResponse = await api.get<any>(`/students/${user.uid}`);
      const student = studentResponse.student || studentResponse;
      setProfile(student);

      let studentDocId = student.id || user.uid;

      // Calculate stats manually
      const dashboardStats: DashboardStats = {
        totalHomework: 0,
        pendingHomework: 0,
        totalTests: 0,
        averageMarks: 0,
        attendancePercentage: 0,
        unreadMessages: 0
      };

      // Load Homework Stats
      try {
        const homeworkResponse = await api.get<any>(`/homework?limit=1000`);
        const allHomework = homeworkResponse.homework || homeworkResponse.items || [];
        const studentHomework = allHomework.filter((hw: any) => {
          const assignTo = hw.assignTo || [];
          return assignTo.includes(user.uid) || assignTo.includes(studentDocId);
        });
        dashboardStats.totalHomework = studentHomework.length;
        
        // Count pending (no filter needed, just count all as notification-style)
        dashboardStats.pendingHomework = studentHomework.length;
      } catch (error) {
        console.error('Failed to load homework stats:', error);
      }

      // Load Test Stats
      try {
        const testsResponse = await api.get<any>(`/tests?board=${student.board}&standard=${student.standard}&active=true`);
        let testsList = testsResponse.tests || testsResponse.items || [];
        testsList = testsList.filter((test: any) => {
          if (!test.assignTo || test.assignTo.length === 0) return true;
          return test.assignTo.includes(user.uid);
        });
        dashboardStats.totalTests = testsList.length;

        // Calculate average marks
        let totalPercentage = 0;
        let completedCount = 0;
        for (const test of testsList) {
          try {
            const resultResponse = await api.get<any>(`/tests/${test.id}/results?studentId=${user.uid}`);
            const results = resultResponse.results || resultResponse.items || [];
            if (results.length > 0) {
              const result = results[0];
              const totalMarks = test.totalMarks || result.totalMarks || 1;
              const percentage = (result.marksObtained / totalMarks) * 100;
              totalPercentage += percentage;
              completedCount++;
            }
          } catch (error) {
            // No result for this test
          }
        }
        dashboardStats.averageMarks = completedCount > 0 ? totalPercentage / completedCount : 0;
      } catch (error) {
        console.error('Failed to load test stats:', error);
      }

      // Load Attendance Stats
      try {
        const attendanceResponse = await api.get<any>(`/attendance/student/${studentDocId}`);
        const records = attendanceResponse.items || [];
        if (records.length > 0) {
          const presentCount = records.filter((r: any) => r.status === 'present').length;
          dashboardStats.attendancePercentage = (presentCount / records.length) * 100;
        }
      } catch (error) {
        console.error('Failed to load attendance stats:', error);
      }

      // Load Messages Stats
      try {
        // Get recent 3 messages
        setRecentMessages(messages.slice(0, 3).map((m: any) => ({
          id: m.id,
          title: m.title,
          priority: m.priority || 'normal',
          createdAt: m.createdAt
        })));
        const messagesResponse = await api.get<any>(`/messages?recipientId=${user.uid}`);
        const messages = messagesResponse.messages || messagesResponse.items || [];
        dashboardStats.unreadMessages = messages.filter((m: any) => !m.read).length;
      } catch (error) {
        console.error('Failed to load messages stats:', error);
      }

      setStats(dashboardStats);
    } catch (error: any) {
      showToast(error.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pending Homework',
      value: stats.pendingHomework,
      icon: BookOpen,
      color: 'bg-blue-500',
      link: '/student/homework'
    },
    {
      title: 'Tests',
      value: stats.totalTests,
      icon: ClipboardCheck,
      color: 'bg-green-500',
      link: '/student/tests'
    },
    {
      title: 'Average Score',
      value: `${stats.averageMarks.toFixed(1)}%`,
      icon: Award,
      color: 'bg-purple-500',
      link: '/student/tests'
    },
    {
      title: 'Attendance',
      value: `${stats.attendancePercentage.toFixed(1)}%`,
      icon: Calendar,
      color: 'bg-yellow-500',
      link: '/student/attendance'
    }
  ];

  return (
    <div className={`min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Professional Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-4xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <BarChart3 className="text-blue-600" size={40} />
              Dashboard
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Welcome back, <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{profile?.name || user?.name}</span></p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-blue-900 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            <User size={18} />
            <span className="font-medium">Student</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(card.link)}
                className={`rounded-lg shadow-sm border p-4 hover:shadow-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`${card.color} p-2 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className={`text-xs mb-1 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{card.title}</h3>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
              </button>
            );
          })}
        </div>

        {/* Main Content Grid - Performance Analytics & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Performance Pie Chart */}
          <div className={`lg:col-span-1 rounded-lg shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              <Award size={20} className="text-purple-500" />
              Performance
            </h3>
            
            {/* Simple Pie Chart */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 mb-6">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                  {/* Pie chart segments based on test scores distribution */}
                  {(() => {
                    const excellent = recentTests.filter(t => t.percentage >= 80).length;
                    const good = recentTests.filter(t => t.percentage >= 60 && t.percentage < 80).length;
                    const average = recentTests.filter(t => t.percentage >= 40 && t.percentage < 60).length;
                    const total = recentTests.length || 1;
                    
                    let offset = 0;
                    const segments = [];
                    
                    if (excellent > 0) {
                      const percent = (excellent / total) * 100;
                      const circumference = 2 * Math.PI * 31.8;
                      const length = (percent / 100) * circumference;
                      segments.push(
                        <circle key="excellent" cx="50" cy="50" r="31.8" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={offset} />
                      );
                      offset -= length;
                    }
                    
                    if (good > 0) {
                      const percent = (good / total) * 100;
                      const circumference = 2 * Math.PI * 31.8;
                      const length = (percent / 100) * circumference;
                      segments.push(
                        <circle key="good" cx="50" cy="50" r="31.8" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={offset} />
                      );
                      offset -= length;
                    }
                    
                    if (average > 0) {
                      const percent = (average / total) * 100;
                      const circumference = 2 * Math.PI * 31.8;
                      const length = (percent / 100) * circumference;
                      segments.push(
                        <circle key="average" cx="50" cy="50" r="31.8" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={offset} />
                      );
                    }
                    
                    return segments;
                  })()}
                  <circle cx="50" cy="50" r="20" fill={isDarkMode ? '#1f2937' : '#ffffff'} />
                  <text x="50" y="56" textAnchor="middle" className={`text-sm font-bold ${isDarkMode ? 'fill-white' : 'fill-gray-900'}`}>
                    {stats.averageMarks.toFixed(0)}%
                  </text>
                </svg>
              </div>
              
              {/* Legend */}
              <div className="space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Excellent ({recentTests.filter(t => t.percentage >= 80).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Good ({recentTests.filter(t => t.percentage >= 60 && t.percentage < 80).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Needs Work ({recentTests.filter(t => t.percentage < 60).length})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance & Key Info */}
          <div className={`rounded-lg shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              <Calendar size={20} className="text-yellow-500" />
              Attendance & Info
            </h3>
            
            {/* Attendance Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Attendance Rate</span>
                <span className={`text-lg font-bold ${stats.attendancePercentage >= 75 ? 'text-green-500' : stats.attendancePercentage >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>{stats.attendancePercentage.toFixed(1)}%</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className={`h-full transition-all ${stats.attendancePercentage >= 75 ? 'bg-green-500' : stats.attendancePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${stats.attendancePercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Board & Standard */}
            <div className={`space-y-3 divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              <div className="pb-3">
                <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>BOARD</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{profile?.board || 'N/A'}</p>
              </div>
              <div className="pt-3 pb-3">
                <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>CLASS</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Standard {profile?.standard || 'N/A'}</p>
              </div>
              <div className="pt-3">
                <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>SCHOOL</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{profile?.schoolName || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Recent Messages & Updates */}
          <div className={`rounded-lg shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <MessageSquare size={20} className="text-red-500" />
                Messages
              </h3>
              <button onClick={() => navigate('/student/messages')} className="text-blue-600 hover:text-blue-700 text-xs font-semibold">
                View All
              </button>
            </div>
            <div className={`space-y-3 ${recentMessages.length === 0 ? '' : 'divide-y ' + (isDarkMode ? 'divide-gray-700' : 'divide-gray-100')}`}>
              {recentMessages.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>No recent messages</p>
              ) : (
                recentMessages.map(msg => (
                  <div key={msg.id} className="pt-3 first:pt-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{msg.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Priority: <span className={`font-semibold ${msg.priority === 'high' || msg.priority === 'urgent' ? 'text-red-500' : 'text-yellow-600'}`}>{msg.priority}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Tests & Homework Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Test Scores */}
          <div className={`rounded-lg shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <TrendingUp size={20} className="text-green-500" />
                Recent Tests
              </h3>
              <button onClick={() => navigate('/student/tests')} className="text-blue-600 hover:text-blue-700 text-xs font-semibold">
                View All
              </button>
            </div>
            <div className={`space-y-3 ${recentTests.length === 0 ? '' : 'divide-y ' + (isDarkMode ? 'divide-gray-700' : 'divide-gray-100')}`}>
              {recentTests.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>No test scores yet</p>
              ) : (
                recentTests.map(test => (
                  <div key={test.id} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium truncate flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{test.title}</p>
                      <span className={`text-sm font-bold ml-2 ${test.percentage >= 70 ? 'text-green-500' : test.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{test.percentage.toFixed(1)}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className={`h-full transition-all ${test.percentage >= 70 ? 'bg-green-500' : test.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${test.percentage}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Homework */}
          <div className={`rounded-lg shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <BookOpen size={20} className="text-blue-500" />
                Recent Homework
              </h3>
              <button onClick={() => navigate('/student/homework')} className="text-blue-600 hover:text-blue-700 text-xs font-semibold">
                View All
              </button>
            </div>
            <div className={`space-y-3 ${recentHomework.length === 0 ? '' : 'divide-y ' + (isDarkMode ? 'divide-gray-700' : 'divide-gray-100')}`}>
              {recentHomework.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>No homework assigned</p>
              ) : (
                recentHomework.map(hw => (
                  <div key={hw.id} className="pt-3 first:pt-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{hw.title}</p>
                    <p className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <Clock size={12} />
                      Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`rounded-lg shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <Zap size={20} className="text-orange-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: BookOpen, label: 'Homework', color: 'blue', link: '/student/homework' },
              { icon: ClipboardCheck, label: 'Tests', color: 'green', link: '/student/tests' },
              { icon: Calendar, label: 'Attendance', color: 'yellow', link: '/student/attendance' },
              { icon: DollarSign, label: 'Fees', color: 'purple', link: '/student/fees' },
              { icon: MessageSquare, label: 'Messages', color: 'red', link: '/student/messages' },
              { icon: FileText, label: 'Materials', color: 'indigo', link: '/student/materials' }
            ].map((action, idx) => {
              const Icon = action.icon;
              const colorMap: any = {
                blue: isDarkMode ? 'bg-blue-900 hover:bg-blue-800 text-blue-300 border-blue-700' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
                green: isDarkMode ? 'bg-green-900 hover:bg-green-800 text-green-300 border-green-700' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
                yellow: isDarkMode ? 'bg-yellow-900 hover:bg-yellow-800 text-yellow-300 border-yellow-700' : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200',
                purple: isDarkMode ? 'bg-purple-900 hover:bg-purple-800 text-purple-300 border-purple-700' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
                red: isDarkMode ? 'bg-red-900 hover:bg-red-800 text-red-300 border-red-700' : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200',
                indigo: isDarkMode ? 'bg-indigo-900 hover:bg-indigo-800 text-indigo-300 border-indigo-700' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              };
              return (
                <button
                  key={idx}
                  onClick={() => navigate(action.link)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg font-medium text-sm transition border ${colorMap[action.color]}`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <span className="text-center">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

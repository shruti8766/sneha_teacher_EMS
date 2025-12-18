import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { ApiListResponse, Student, Teacher, Test, Batch, ActivityLog } from '../types';
import { Users, GraduationCap, ClipboardList, BookOpen, Loader2, Shield, User, Clock, CheckCircle, AlertCircle, FileText, BarChart3, TrendingUp, Activity, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MetricBox = ({ value, label, subtext, color, isDarkMode }: any) => (
  <div className="text-center">
    <div className={`text-4xl font-bold ${color} mb-2`}>{value}</div>
    <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</div>
    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{subtext}</div>
  </div>
);

const InsightCard = ({ icon: Icon, title, value, metric, color, description, isDarkMode }: any) => (
  <div className={`rounded-xl p-6 border shadow-sm hover:shadow-md transition ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <h3 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{description}</p>
        </div>
      </div>
    </div>
    <div className="flex items-end justify-between">
      <div>
        <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{metric}</div>
      </div>
      <TrendingUp size={20} className="text-green-500" />
    </div>
  </div>
);

const ActivityItem: React.FC<{ log: ActivityLog; isDarkMode: boolean }> = ({ log, isDarkMode }) => {
  let Icon = FileText;
  let color = isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600";

  switch (log.entityType) {
    case 'student':
      Icon = Users;
      color = "bg-blue-100 text-blue-600";
      break;
    case 'test':
      Icon = ClipboardList;
      color = "bg-purple-100 text-purple-600";
      break;
    case 'homework':
      Icon = BookOpen;
      color = "bg-pink-100 text-pink-600";
      break;
    case 'attendance':
      Icon = CheckCircle;
      color = "bg-green-100 text-green-600";
      break;
    case 'payment':
      Icon = AlertCircle;
      color = "bg-yellow-100 text-yellow-600";
      break;
  }

  let dateStr = 'Just now';
  if (log.timestamp) {
    const date = typeof log.timestamp === 'string' 
      ? new Date(log.timestamp) 
      : new Date(log.timestamp._seconds * 1000);
    dateStr = date.toLocaleString();
  }

  return (
    <div className={`flex items-start gap-4 p-4 border-b transition ${isDarkMode ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-100'} last:border-0`}>
      <div className={`p-2.5 rounded-lg ${color} flex-shrink-0 mt-0.5`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <span className="capitalize">{log.action.replace('_', ' ')}</span>
        </p>
        <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{log.entityName || 'Unknown Item'}</p>
        <div className="flex items-center gap-2 mt-2">
          <Clock size={12} className={`flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{dateStr}</span>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    activeStudents: 0,
    teachers: 0,
    tests: 0,
    batches: 0
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [students, teachers, tests, batches] = await Promise.all([
          api.get<ApiListResponse<Student>>('/students?limit=100'),
          api.get<ApiListResponse<Teacher>>('/teachers?limit=100'),
          api.get<ApiListResponse<Test>>('/tests?limit=100'),
          api.get<ApiListResponse<Batch>>('/batches?limit=100'),
        ]);

        const activeTeachers = teachers.items.filter(t => t.active !== false);
        const activeStudents = students.items.filter(s => s.active !== false).length;

        setStats({
          students: students.items.length,
          activeStudents: activeStudents,
          teachers: activeTeachers.length,
          tests: tests.items.filter(t => new Date(t.dateTime || '') > new Date()).length,
          batches: batches.items.length,
        });

        try {
          const logsRes = await api.get<ApiListResponse<ActivityLog>>('/logs/recent?limit=8');
          setActivities(logsRes.items || []);
        } catch (err) {
          console.warn("Failed to fetch activity logs", err);
        }

      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  const engagementRate = stats.students > 0 
    ? Math.round((stats.activeStudents / stats.students) * 100) 
    : 0;

  return (
    <div className={`min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="space-y-8 max-w-7xl mx-auto">
      {/* Professional Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-4xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <BarChart3 className="text-blue-600" size={40} />
            Dashboard
          </h1>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Welcome back, <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{user?.name}</span></p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isAdmin ? (isDarkMode ? 'bg-purple-900 border-purple-700 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700') : (isDarkMode ? 'bg-blue-900 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700')}`}>
          {isAdmin ? <Shield size={18} /> : <User size={18} />}
          <span className="font-medium capitalize">{user?.role}</span>
        </div>
      </div>

      

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          icon={Target}
          title="Engagement Rate"
          value={`${engagementRate}%`}
          metric="Active vs Total Students"
          color="bg-blue-600"
          description="Student participation rate"
          isDarkMode={isDarkMode}
        />
        <InsightCard
          icon={Users}
          title="Avg Batch Size"
          value={stats.batches > 0 ? Math.round(stats.students / stats.batches) : 0}
          metric="Students per class"
          color="bg-green-600"
          description="Class efficiency metric"
          isDarkMode={isDarkMode}
        />
        <InsightCard
          icon={Zap}
          title="Active Sessions"
          value={stats.batches}
          metric="Teaching units"
          color="bg-orange-600"
          description="Live class groups"
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Key Metrics Bar */}
      <div className={`rounded-xl shadow-sm border p-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <MetricBox 
            value={stats.students}
            label="Total Students"
            subtext={`${stats.activeStudents} active`}
            color="text-blue-600"
            isDarkMode={isDarkMode}
          />
          <div className={`h-16 hidden md:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
          <MetricBox 
            value={stats.teachers}
            label="Faculty Members"
            subtext="Active instructors"
            color="text-green-600"
            isDarkMode={isDarkMode}
          />
          <div className={`h-16 hidden md:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
          <MetricBox 
            value={stats.batches}
            label="Active Batches"
            subtext="Running classes"
            color="text-orange-600"
            isDarkMode={isDarkMode}
          />
          <div className={`h-16 hidden md:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
          <MetricBox 
            value={stats.tests}
            label="Upcoming Tests"
            subtext="Scheduled assessments"
            color="text-purple-600"
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Main Content - Activity & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns on desktop */}
        <div className={`lg:col-span-2 rounded-xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-6 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-r from-gray-50 to-white border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <Activity className="text-blue-600" size={24} />
              <div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Recent Activity</h2>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Latest updates from your institution</p>
              </div>
            </div>
          </div>
          <div className={`divide-y max-h-96 overflow-y-auto ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {activities.length > 0 ? (
              activities.map(log => <ActivityItem key={log.id} log={log} isDarkMode={isDarkMode} />)
            ) : (
              <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Activity size={32} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p>No recent activity found</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`rounded-xl shadow-sm border p-6 h-fit ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <Zap size={20} className="text-orange-600" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            {isAdmin && (
              <>
                <button 
                  onClick={() => navigate('/students')}
                  className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition border ${isDarkMode ? 'bg-blue-900 hover:bg-blue-800 text-blue-300 border-blue-700' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'}`}
                >
                  + Add Student
                </button>
                <button 
                  onClick={() => navigate('/teachers')}
                  className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition border ${isDarkMode ? 'bg-green-900 hover:bg-green-800 text-green-300 border-green-700' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'}`}
                >
                  + Add Teacher
                </button>
                <button 
                  onClick={() => navigate('/batches')}
                  className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition border ${isDarkMode ? 'bg-orange-900 hover:bg-orange-800 text-orange-300 border-orange-700' : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'}`}
                >
                  + New Batch
                </button>
                <button 
                  onClick={() => navigate('/fees')}
                  className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition border ${isDarkMode ? 'bg-amber-900 hover:bg-amber-800 text-amber-300 border-amber-700' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'}`}
                >
                  💰 Manage Fees
                </button>
              </>
            )}
            
            {(isTeacher || isAdmin) && (
              <button 
                onClick={() => navigate('/homework')}
                className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition border ${isDarkMode ? 'bg-pink-900 hover:bg-pink-800 text-pink-300 border-pink-700' : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200'}`}
              >
                📝 Assign Homework
              </button>
            )}

            <button 
              onClick={() => navigate('/analytics')}
              className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition border ${isDarkMode ? 'bg-indigo-900 hover:bg-indigo-800 text-indigo-300 border-indigo-700 mt-4 pt-4 border-t-2 border-t-gray-700' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 mt-4 pt-4 border-t-2'}`}
            >
              📊 View Analytics
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
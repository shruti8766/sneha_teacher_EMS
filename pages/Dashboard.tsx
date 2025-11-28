import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ApiListResponse, Student, Teacher, Test, Batch, ActivityLog } from '../types';
import { Users, GraduationCap, ClipboardList, BookOpen, Loader2, Shield, User, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`cursor-pointer bg-gradient-to-br ${color} rounded-xl shadow-lg p-6 text-white transform transition hover:scale-105 hover:shadow-xl`}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold opacity-90">{title}</h3>
      <Icon className="opacity-80" size={28} />
    </div>
    <div className="text-4xl font-bold">{value}</div>
    <div className="text-xs opacity-75 mt-2">Click to view details</div>
  </div>
);

const ActivityItem = ({ log }: { log: ActivityLog }) => {
  let Icon = FileText;
  let color = "text-gray-500 bg-gray-100";

  switch (log.entityType) {
    case 'student':
      Icon = Users;
      color = "text-blue-600 bg-blue-100";
      break;
    case 'test':
      Icon = ClipboardList;
      color = "text-purple-600 bg-purple-100";
      break;
    case 'homework':
      Icon = BookOpen;
      color = "text-pink-600 bg-pink-100";
      break;
    case 'attendance':
      Icon = CheckCircle;
      color = "text-green-600 bg-green-100";
      break;
    case 'payment':
      Icon = AlertCircle; // Using AlertCircle as generic money icon placeholder or credit card
      color = "text-yellow-600 bg-yellow-100";
      break;
  }

  // Parse timestamp safely
  let dateStr = 'Just now';
  if (log.timestamp) {
    const date = typeof log.timestamp === 'string' 
      ? new Date(log.timestamp) 
      : new Date(log.timestamp._seconds * 1000);
    dateStr = date.toLocaleString();
  }

  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`p-2 rounded-full ${color} mt-1`}>
        <Icon size={16} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-800">
          <span className="font-medium capitalize">{log.action.replace('_', ' ')}</span>: {log.entityName || 'Unknown Item'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Clock size={12} className="text-gray-400" />
          <span className="text-xs text-gray-500">{dateStr}</span>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
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
        // Fetch stats
        const [students, teachers, tests, batches] = await Promise.all([
          api.get<ApiListResponse<Student>>('/students?limit=100'),
          api.get<ApiListResponse<Teacher>>('/teachers?limit=100'),
          api.get<ApiListResponse<Test>>('/tests?limit=100'),
          api.get<ApiListResponse<Batch>>('/batches?limit=100'),
        ]);

        setStats({
          students: students.items.length,
          teachers: teachers.items.length,
          tests: tests.items.filter(t => new Date(t.dateTime) > new Date()).length,
          batches: batches.items.length,
        });

        // Fetch logs
        try {
          const logsRes = await api.get<ApiListResponse<ActivityLog>>('/logs/recent?limit=10');
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, <span className="font-semibold text-gray-700">{user?.name}</span></p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isAdmin ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {isAdmin ? <Shield size={18} /> : <User size={18} />}
          <span className="font-medium capitalize">{user?.role} Account</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Students" 
          value={stats.students} 
          icon={Users} 
          color="from-blue-500 to-blue-600"
          onClick={() => navigate('/students')}
        />
        <StatCard 
          title="Total Teachers" 
          value={stats.teachers} 
          icon={GraduationCap} 
          color="from-green-500 to-green-600"
          onClick={() => navigate('/teachers')}
        />
        <StatCard 
          title="Upcoming Tests" 
          value={stats.tests} 
          icon={ClipboardList} 
          color="from-purple-500 to-purple-600"
          onClick={() => navigate('/tests')}
        />
        <StatCard 
          title="Active Batches" 
          value={stats.batches} 
          icon={BookOpen} 
          color="from-orange-500 to-orange-600"
          onClick={() => navigate('/batches')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {isAdmin && (
              <>
                <button onClick={() => navigate('/students')} className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left border border-blue-200 transition">
                  <div className="font-semibold text-blue-700">Add Student</div>
                  <div className="text-xs text-blue-600 mt-1">Register new enrollment</div>
                </button>
                <button onClick={() => navigate('/teachers')} className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left border border-green-200 transition">
                  <div className="font-semibold text-green-700">Add Teacher</div>
                  <div className="text-xs text-green-600 mt-1">Register new staff</div>
                </button>
                <button onClick={() => navigate('/batches')} className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left border border-orange-200 transition">
                  <div className="font-semibold text-orange-700">New Batch</div>
                  <div className="text-xs text-orange-600 mt-1">Create class group</div>
                </button>
                <button onClick={() => navigate('/fees')} className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-left border border-yellow-200 transition">
                  <div className="font-semibold text-yellow-700">Manage Fees</div>
                  <div className="text-xs text-yellow-600 mt-1">Add fee plans</div>
                </button>
              </>
            )}
            
            {(isTeacher || isAdmin) && (
              <button onClick={() => navigate('/homework')} className="p-4 bg-pink-50 hover:bg-pink-100 rounded-lg text-left border border-pink-200 transition col-span-2">
                <div className="font-semibold text-pink-700">Assign Homework</div>
                <div className="text-xs text-pink-600 mt-1">Create and assign work to students</div>
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
            {activities.length > 0 ? (
              activities.map(log => <ActivityItem key={log.id} log={log} />)
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-gray-50 rounded-lg">
                <p>No recent activity found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
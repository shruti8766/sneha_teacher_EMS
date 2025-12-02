import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  Loader2
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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pending Homework',
      value: stats.pendingHomework,
      total: stats.totalHomework,
      icon: BookOpen,
      color: 'bg-blue-500',
      link: '/student/homework'
    },
    {
      title: 'Tests Taken',
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
    },
    {
      title: 'Unread Messages',
      value: stats.unreadMessages,
      icon: MessageSquare,
      color: 'bg-red-500',
      link: '/student/messages'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {profile?.name || user?.name}!
        </h1>
        <p className="text-gray-600">
          {profile?.board} - Standard {profile?.standard}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(card.link)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900">
                {card.value}
                {card.total !== undefined && (
                  <span className="text-sm font-normal text-gray-500"> / {card.total}</span>
                )}
              </p>
            </button>
          );
        })}
      </div>

      {/* Quick Actions & Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 mr-2 text-gray-600" />
            <h2 className="text-xl font-semibold">Profile Information</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{profile?.email}</p>
            </div>
            {profile?.phone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
            )}
            {profile?.schoolName && (
              <div>
                <p className="text-sm text-gray-600">School</p>
                <p className="font-medium">{profile.schoolName}</p>
              </div>
            )}
            {profile?.subjects && profile.subjects.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.subjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile?.parentName && (
              <div>
                <p className="text-sm text-gray-600">Parent/Guardian</p>
                <p className="font-medium">{profile.parentName}</p>
                {profile.parentPhone && (
                  <p className="text-sm text-gray-500">{profile.parentPhone}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/student/homework')}
              className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <BookOpen className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Homework</span>
            </button>
            <button
              onClick={() => navigate('/student/tests')}
              className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <ClipboardCheck className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Tests</span>
            </button>
            <button
              onClick={() => navigate('/student/attendance')}
              className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Calendar className="w-8 h-8 text-yellow-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Attendance</span>
            </button>
            <button
              onClick={() => navigate('/student/fees')}
              className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <DollarSign className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Fees</span>
            </button>
            <button
              onClick={() => navigate('/student/messages')}
              className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors col-span-2"
            >
              <MessageSquare className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Messages</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

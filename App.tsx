import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import { DetailProvider } from './context/DetailContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Batches from './pages/Batches';
import Homework from './pages/Homework';
import Fees from './pages/Fees';
import Attendance from './pages/Attendance';
import AttendanceDetail from './pages/AttendanceDetail';
import Tests from './pages/Tests';
import TestResults from './pages/TestResults';
import Timetable from './pages/Timetable';
import Meetings from './pages/Meetings';
import MeetingDetails from './pages/MeetingDetails';
import Analytics from './pages/Analytics';
import Messages from './pages/Messages';
import Materials from './pages/Materials';
import Layout from './components/Layout';
import StudentLayout from './components/StudentLayout';
import StudentDetail from './pages/StudentDetail';
import TeachersDetail from './pages/TeachersDetail';
import BatchDetail from './pages/BatchDetail';
import StudentDashboard from './Students_Dashboard/StudentDashboard';
import StudentHomework from './Students_Dashboard/StudentHomework';
import StudentTests from './Students_Dashboard/StudentTests';
import StudentAttendance from './Students_Dashboard/StudentAttendance';
import StudentFees from './Students_Dashboard/StudentFees';
import StudentMessages from './Students_Dashboard/StudentMessages';
import StudentMaterials from './Students_Dashboard/StudentMaterials';
import StudentProfile from './Students_Dashboard/StudentProfile';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { pushNotifications } from './services/pushNotifications';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    // Redirect to dashboard (or student dashboard if student)
    if (user?.role === 'student') {
      return <Navigate to="/student/dashboard" />;
    }
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

// Redirect based on user role
const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
  // Register service worker on app startup
  useEffect(() => {
    const initPushNotifications = async () => {
      if (pushNotifications.isSupported()) {
        console.log('📢 Registering service worker for push notifications...');
        await pushNotifications.registerServiceWorker();
      } else {
        console.warn('⚠️ Push notifications not supported in this browser');
      }
    };

    initPushNotifications();
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <DarkModeProvider>
          <DetailProvider>
            <HashRouter>
            <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Role-based redirect */}
            <Route path="/" element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            } />

            {/* Admin/Teacher Routes */}
            <Route element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="teachers" element={<ProtectedRoute allowedRoles={['admin']}><Teachers /></ProtectedRoute>} />
              <Route path="batches" element={<Batches />} />
              <Route path="homework" element={<Homework />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="attendance/:sessionId" element={<AttendanceDetail />} />
              <Route path="tests" element={<Tests />} />
              <Route path="tests/:testId/results" element={<TestResults />} />
              <Route path="timetable" element={<Timetable />} />
              <Route path="meetings" element={<Meetings />} />
              <Route path="meetings/:meetingId" element={<MeetingDetails />} />
              <Route path="messages" element={<Messages />} />
              <Route path="materials" element={<Materials />} />
              <Route path="students/:id" element={<StudentDetail />} />
              <Route path="teachers/:id" element={<ProtectedRoute allowedRoles={['admin']}><TeachersDetail /></ProtectedRoute>} />
              <Route path="batches/:id" element={<BatchDetail />} />
              <Route path="profile" element={<Profile />} />
              
              {/* Admin-only routes */}
              <Route path="fees" element={<ProtectedRoute allowedRoles={['admin']}><Fees /></ProtectedRoute>} />
              <Route path="analytics" element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
            </Route>
            
            {/* Student Routes with StudentLayout */}
            <Route path="/student" element={
              <ProtectedRoute>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="homework" element={<StudentHomework />} />
              <Route path="tests" element={<StudentTests />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="fees" element={<StudentFees />} />
              <Route path="messages" element={<StudentMessages />} />
              <Route path="materials" element={<StudentMaterials />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>

            <Route path="*" element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            } />
          </Routes>
          </HashRouter>
          </DetailProvider>
        </DarkModeProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
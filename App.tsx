import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
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
  return (
    <ToastProvider>
      <AuthProvider>
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
              <Route path="teachers" element={<Teachers />} />
              <Route path="batches" element={<Batches />} />
              <Route path="homework" element={<Homework />} />
              <Route path="fees" element={<Fees />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="attendance/:sessionId" element={<AttendanceDetail />} />
              <Route path="tests" element={<Tests />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="messages" element={<Messages />} />
              <Route path="materials" element={<Materials />} />
              <Route path="students/:id" element={<StudentDetail />} />
              <Route path="teachers/:id" element={<TeachersDetail />} />
              <Route path="batches/:id" element={<BatchDetail />} />
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
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
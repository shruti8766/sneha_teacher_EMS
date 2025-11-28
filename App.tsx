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
import Tests from './pages/Tests';
import Layout from './components/Layout';
import StudentDetail from './pages/StudentDetail';
import TeachersDetail from './pages/TeachersDetail';
import BatchDetail from './pages/BatchDetail';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="batches" element={<Batches />} />
              <Route path="homework" element={<Homework />} />
              <Route path="fees" element={<Fees />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="tests" element={<Tests />} />
              <Route path="students/:id" element={<StudentDetail />} />
              <Route path="teachers/:id" element={<TeachersDetail />} />
              <Route path="batches/:id" element={<BatchDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
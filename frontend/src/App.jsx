import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import UploadReport from './pages/UploadReport';
import Processing from './pages/Processing';
import Results from './pages/Results';
import ShareReport from './pages/ShareReport';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDetail from './pages/PatientDetail';
import Settings from './pages/Settings';
import TrendsPage from './pages/TrendsPage';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute requiredRole="patient"><UploadReport /></ProtectedRoute>} />
      <Route path="/processing/:reportId" element={<ProtectedRoute requiredRole="patient"><Processing /></ProtectedRoute>} />
      <Route path="/results/:reportId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
      <Route path="/share/:reportId" element={<ProtectedRoute requiredRole="patient"><ShareReport /></ProtectedRoute>} />

      <Route path="/doctor/dashboard" element={<ProtectedRoute requiredRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/patient/:patientId" element={<ProtectedRoute requiredRole="doctor"><PatientDetail /></ProtectedRoute>} />

      <Route path="/trends" element={<ProtectedRoute><TrendsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

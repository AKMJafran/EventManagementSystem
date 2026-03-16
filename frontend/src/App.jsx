import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StudentDashboard from './pages/StudentDashboard';
import CreateEventPage from './pages/CreateEventPage';
import MyEventsPage from './pages/MyEventsPage';
import AdminDashboard from './pages/AdminDashboard';
import ManageCategories from './pages/ManageCategories';
import ManageEvents from './pages/ManageEvents';
import ConflictsPage from './pages/ConflictsPage';
const Home = () => {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (isAuthenticated) {
    return user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/student/dashboard" />;
  }
  return <Navigate to="/login" />;
};


function App() {
  const { loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute requiredRole="STUDENT" />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        <Route path="/my-events" element={<MyEventsPage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/manage-categories" element={<ManageCategories />} />
        <Route path="/manage-events" element={<ManageEvents />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        <Route path="/conflicts" element={<ConflictsPage />} />
      </Route>

      {/* Default Route */}
      <Route path="/" element={<Home />} />
      
      {/* Fallback for any other route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;

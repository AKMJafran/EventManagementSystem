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
import CalendarPage from './pages/CalendarPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import ManageStudents from './pages/ManageStudents';
import ManageVenues from './pages/ManageVenues';
import LandingPage from './pages/LandingPage';
import ManageCategories from './pages/ManageCategories';
import ManageEvents from './pages/ManageEvents';
import ConflictsPage from './pages/ConflictsPage';
const Home = () => {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (isAuthenticated) {
    return user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/student/dashboard" />;
  }
  return <LandingPage />;
};


function App() {
  const { loadFromStorage, authLoaded } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (!authLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

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
        <Route path="/student/edit-event/:id" element={<CreateEventPage />} />
        <Route path="/student/my-events" element={<MyEventsPage />} />
        <Route path="/student/calendar" element={<CalendarPage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/calendar" element={<CalendarPage />} />
        <Route path="/admin/reports/monthly" element={<MonthlyReportPage />} />
        <Route path="/manage-categories" element={<ManageCategories />} />
        <Route path="/manage-events" element={<ManageEvents />} />
        <Route path="/manage-students" element={<ManageStudents />} />
        <Route path="/manage-venues" element={<ManageVenues />} />
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

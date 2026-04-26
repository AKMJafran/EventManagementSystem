import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import useAuthStore from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StudentDashboard from './pages/StudentDashboard';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';
import MyEventsPage from './pages/MyEventsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminCreateEventPage from './pages/AdminCreateEventPage';
import AdminEditEventPage from './pages/AdminEditEventPage';
import CalendarPage from './pages/CalendarPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ManageStudents from './pages/ManageStudents';
import ManageLecturers from './pages/ManageLecturers';
import ManageVenues from './pages/ManageVenues';
import LandingPage from './pages/LandingPage';
import ManageCategories from './pages/ManageCategories';
import ManageEvents from './pages/ManageEvents';
import ConflictsPage from './pages/ConflictsPage';
import NotificationManagerPage from './pages/NotificationManagerPage';
import EventDetailsPage from './pages/EventDetailsPage';
import LecturerDashboard from './pages/LecturerDashboard';
import LecturerEditEventPage from './pages/LecturerEditEventPage';
import LecturerMyClubsPage from './pages/LecturerMyClubsPage';
import LecturerPendingApprovalsPage from './pages/LecturerPendingApprovalsPage';
import StudentClubsPage from './pages/StudentClubsPage';
import ManageClubs from './pages/ManageClubs';
import ProfilePage from './pages/ProfilePage';
import { getProfileRoute } from './utils/profileRoutes';

const ChangePasswordRedirect = () => {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={`${getProfileRoute(user?.role)}?tab=password&required=1`} replace />;
};

const Home = () => {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (!isAuthenticated || !user) {
    return <LandingPage />;
  }
  if (user.mustChangePassword) {
    return <Navigate to={`${getProfileRoute(user.role)}?tab=password&required=1`} replace />;
  }
  return user.role === 'ADMIN'
    ? <Navigate to="/admin/dashboard" replace />
    : user.role === 'LECTURER'
    ? <Navigate to="/lecturer/dashboard" replace />
    : <Navigate to="/student/dashboard" replace />;
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordRedirect />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="STUDENT" />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/create-event" element={<CreateEventPage />} />
        <Route path="/student/edit-event/:id" element={<EditEventPage />} />
        <Route path="/student/my-events" element={<MyEventsPage />} />
        <Route path="/student/calendar" element={<CalendarPage />} />
        <Route path="/student/clubs" element={<StudentClubsPage />} />
        <Route path="/student/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/calendar" element={<CalendarPage />} />
        <Route path="/admin/reports/monthly" element={<MonthlyReportPage />} />
        <Route path="/admin/reports/analytics" element={<AnalyticsPage />} />
        <Route path="/manage-categories" element={<ManageCategories />} />
        <Route path="/manage-events" element={<ManageEvents />} />
        <Route path="/admin/manage-clubs" element={<ManageClubs />} />
        <Route path="/manage-students" element={<ManageStudents />} />
        <Route path="/manage-lecturers" element={<ManageLecturers />} />
        <Route path="/manage-venues" element={<ManageVenues />} />
        <Route path="/admin/create-event" element={<AdminCreateEventPage />} />
        <Route path="/admin/edit-event/:id" element={<AdminEditEventPage />} />
        <Route path="/conflicts" element={<ConflictsPage />} />
        <Route path="/admin/notifications" element={<NotificationManagerPage />} />
        <Route path="/admin/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="LECTURER" />}>
        <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
        <Route path="/lecturer/edit-event/:id" element={<LecturerEditEventPage />} />
        <Route path="/lecturer/my-clubs" element={<LecturerMyClubsPage />} />
        <Route path="/lecturer/pending-approvals" element={<LecturerPendingApprovalsPage />} />
        <Route path="/lecturer/calendar" element={<CalendarPage />} />
        <Route path="/lecturer/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../context/AuthContext';
import { getProfileRoute } from '../utils/profileRoutes';

const getDefaultRoute = (user) => {
  if (!user) {
    return '/login';
  }
  if (user.role === 'ADMIN') return '/admin/dashboard';
  if (user.role === 'LECTURER') return '/lecturer/dashboard';
  return '/student/dashboard';
};

const ProtectedRoute = ({ requiredRole }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect legacy /change-password path to the profile password tab
  if (location.pathname === '/change-password') {
    const target = `${getProfileRoute(user?.role)}?tab=password${user.mustChangePassword ? '&required=1' : ''}`;
    return <Navigate to={target} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If user must change password and not already on profile password tab, redirect
  if (user.mustChangePassword && !location.pathname.includes('/profile')) {
    const target = `${getProfileRoute(user.role)}?tab=password&required=1`;
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;


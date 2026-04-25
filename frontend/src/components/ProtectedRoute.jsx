import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../context/AuthContext';

const getDefaultRoute = (user) => {
  if (!user) {
    return '/login';
  }
  if (user.mustChangePassword) {
    return '/change-password';
  }
  return user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';
};

const ProtectedRoute = ({ requiredRole }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!user.mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

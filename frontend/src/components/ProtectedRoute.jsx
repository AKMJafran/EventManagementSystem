import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../context/AuthContext';

const ProtectedRoute = ({ requiredRole }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

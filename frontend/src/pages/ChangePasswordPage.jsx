import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const markPasswordChanged = useAuthStore((state) => state.markPasswordChanged);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values) => {
    try {
      await axiosInstance.post('/auth/change-password', values);
      markPasswordChanged();
      toast.success('Password changed successfully.');
      navigate(user?.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white shadow-xl border border-outline-variant/20 rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Change Temporary Password</CardTitle>
          <CardDescription className="text-on-surface-variant">
            Your account requires a password update before you can continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              {...register('currentPassword')}
              error={errors.currentPassword?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...register('newPassword')}
              error={errors.newPassword?.message}
              helperText="Use at least 8 characters."
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

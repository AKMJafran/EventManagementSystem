import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

const emailSchema = z.object({
  email: z.string().email('Invalid email'),
});
const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isSubmitting: isEmailSubmitting },
  } = useForm({ resolver: zodResolver(emailSchema) });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors, isSubmitting: isResetSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { email } });

  const onEmailSubmit = async (data) => {
    try {
      await axiosInstance.post('/auth/send-reset-otp', { email: data.email });
      setEmail(data.email);
      setStep(2);
      toast.success('OTP sent to your email.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    }
  };

  const onResetSubmit = async (data) => {
    try {
      await axiosInstance.post('/auth/reset-password', {
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      toast.success('Password reset successful!');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>
        {step === 1 && (
          <form onSubmit={handleEmailSubmit(onEmailSubmit)}>
            <div className="mb-4">
              <label className="block mb-1">Email</label>
              <input {...registerEmail('email')} className="w-full px-3 py-2 border rounded" />
              {emailErrors.email && <p className="text-red-500 text-sm">{emailErrors.email.message}</p>}
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" disabled={isEmailSubmitting}>
              {isEmailSubmitting ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleResetSubmit(onResetSubmit)}>
            <div className="mb-4">
              <label className="block mb-1">Email</label>
              <input {...registerReset('email')} className="w-full px-3 py-2 border rounded" value={email} readOnly />
            </div>
            <div className="mb-4">
              <label className="block mb-1">OTP</label>
              <input {...registerReset('otp')} className="w-full px-3 py-2 border rounded" />
              {resetErrors.otp && <p className="text-red-500 text-sm">{resetErrors.otp.message}</p>}
            </div>
            <div className="mb-4">
              <label className="block mb-1">New Password</label>
              <input type="password" {...registerReset('newPassword')} className="w-full px-3 py-2 border rounded" />
              {resetErrors.newPassword && <p className="text-red-500 text-sm">{resetErrors.newPassword.message}</p>}
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" disabled={isResetSubmitting}>
              {isResetSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const emailSchema = z.object({
  email: z.string().email('Invalid email'),
});

const resetSchema = z.object({
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
  } = useForm({ resolver: zodResolver(resetSchema) });

  const onEmailSubmit = async (data) => {
    try {
      await axiosInstance.post(`/auth/send-reset-otp?email=${data.email}`);
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
        email: email,
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
  <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest p-4">
    <Card className="w-full max-w-md bg-white shadow-md border border-outline-variant/20 rounded-2xl">
      
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">
          Reset Password
        </CardTitle>
        <CardDescription className="text-on-surface-variant">
          {step === 1 
            ? "Enter your email and get OTP." 
            : "Enter OTP and new password"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
            
            <Input
              label="Email"
              type="email"
              {...registerEmail('email')}
              error={emailErrors.email?.message}
              placeholder="john@example.com"
              className="focus:ring-2 focus:ring-primary/40"
            />

            <Button 
              type="submit" 
              className="w-full bg-primary text-white hover:bg-primary/90"
              isLoading={isEmailSubmitting}
            >
              Send OTP
            </Button>

          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
            
            <Input
              label="Email"
              type="email"
              value={email}
              readOnly
              disabled
              className="bg-gray-100"
            />

            <Input
              label="OTP"
              type="text"
              {...registerReset('otp')}
              error={resetErrors.otp?.message}
              placeholder="Enter 6-digit code"
              className="focus:ring-2 focus:ring-tertiary/40"
            />

            <Input
              label="New Password"
              type="password"
              {...registerReset('newPassword')}
              error={resetErrors.newPassword?.message}
              placeholder="••••••••"
              className="focus:ring-2 focus:ring-secondary/40"
            />

            <Button 
              type="submit" 
              className="w-full bg-tertiary text-white hover:bg-tertiary/90"
              isLoading={isResetSubmitting}
            >
              Reset Password
            </Button>

          </form>
        )}
        
        <div className="mt-4 text-center text-sm">
          <Link 
            to="/login" 
            className="font-medium text-primary hover:underline"
          >
            Back to Login
          </Link>
        </div>

      </CardContent>
    </Card>
  </div>
);
}
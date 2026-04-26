import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';

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
  const skipPasswordChange = useAuthStore((state) => state.skipPasswordChange);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const getDashboardPath = () => user?.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';

  const onSubmit = async (values) => {
    try {
      await axiosInstance.post('/auth/change-password', values);
      markPasswordChanged();
      toast.success('Password changed successfully.');
      navigate(getDashboardPath());
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    }
  };

  const handleSkip = () => {
    skipPasswordChange();
    toast('You can change your password later from Settings.', { icon: 'ℹ️' });
    navigate(getDashboardPath());
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          alt="University administrative building"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA48Boy1hVFdzl9AWX7CQvlQnbO1illbiTdK1LXt8jTO4-82n9bN4n6ZfVdub57_bPKeyapBwtyYqgzrOpuh1HWTQpbTx2uX5Kx83qpC4WAiddVevszaiYOjeAB90ZWxS267k6Ft8MCDKLpOw4iTVc5RfNZsyLlfMYupTqextkWYmnapsr9Pg7IcEBC2hDuSSPu-tujU29bZzMPRdQLRBdo_6_FapnjKzOeYOIYqJeIq9vHRukQCXW8lAJmt_9x0CcT354OFOSfQmw0"
        />
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm"></div>
      </div>

      <main className="relative z-10 w-full max-w-6xl px-6 grid md:grid-cols-2 shadow-2xl shadow-on-surface/5 rounded-xl overflow-hidden bg-surface-container-lowest">
        <section className="hidden md:flex flex-col justify-between p-12 academic-gradient text-on-primary">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                <img
                  alt="University crest"
                  className="w-full h-auto"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDq1mdLm2-5c1gjBaNo4wKCBrDK_ZeRK1H7sGvfL8VtB_ppTzE90zMC1AvCwmqR9XU6s9B5UeVhbewDaD9T9JsXbmnpItyb2KgGDEcPusncVO7DwLT2q9xvMKE0EgFMZPdrp119yMqH1g0D3kC7SVVZFJ3U-EVWGeebmXI9xVFUg4SSdanT0TjJ7nqwa9EMYiGlJfFIW1U6XUqRvw-w8Kyi7pIoxm8mUiPQ_CZwABPE0DiwsTj2Q9BPNrG06Y-TJu9ODBXDeIehvl5N"
                />
              </div>
              <span className="text-xl font-bold tracking-tight font-headline">Faculty of Technology</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
              Secure Your
              <br />
              Account
            </h1>
            <p className="text-on-primary-container text-lg max-w-sm font-light leading-relaxed">
              For your security, we recommend updating your temporary password. Choose a strong, unique password to protect your account.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 py-4 border-t border-white/10">
              <span className="material-symbols-outlined text-tertiary-fixed">shield</span>
              <div>
                <p className="text-sm font-semibold">Password Security</p>
                <p className="text-xs opacity-70">Use at least 8 characters with a mix of letters, numbers & symbols</p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-16 flex flex-col justify-center bg-surface-container-lowest">
          <div className="max-w-md w-full mx-auto">
            <header className="mb-10 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-3xl">lock_reset</span>
                <h2 className="text-3xl font-bold text-on-surface tracking-tight">Change Password</h2>
              </div>
              <p className="text-on-surface-variant font-body text-sm leading-relaxed">
                Your account requires a password update. Please set a new secure password to continue.
              </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="currentPassword">
                  Current Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-0 bottom-2.5 text-outline text-lg">key</span>
                  <input
                    id="currentPassword"
                    {...register('currentPassword')}
                    className={`w-full pl-8 py-3 bg-surface-container-high border-0 border-b-2 focus:ring-0 transition-all text-on-surface placeholder:text-outline/50 pr-10 ${errors.currentPassword ? 'border-error focus:border-error' : 'border-transparent focus:border-primary'}`}
                    placeholder="Enter your current password"
                    type={showCurrentPassword ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-0 bottom-2.5 text-outline hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">{showCurrentPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
                {errors.currentPassword && <p className="text-error text-xs font-medium mt-1">{errors.currentPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-0 bottom-2.5 text-outline text-lg">lock</span>
                  <input
                    id="newPassword"
                    {...register('newPassword')}
                    className={`w-full pl-8 py-3 bg-surface-container-high border-0 border-b-2 focus:ring-0 transition-all text-on-surface placeholder:text-outline/50 pr-10 ${errors.newPassword ? 'border-error focus:border-error' : 'border-transparent focus:border-primary'}`}
                    placeholder="Enter a new password"
                    type={showNewPassword ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-0 bottom-2.5 text-outline hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">{showNewPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
                <p className="text-xs text-outline ml-1">Use at least 8 characters.</p>
                {errors.newPassword && <p className="text-error text-xs font-medium mt-1">{errors.newPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-0 bottom-2.5 text-outline text-lg">lock_open</span>
                  <input
                    id="confirmPassword"
                    {...register('confirmPassword')}
                    className={`w-full pl-8 py-3 bg-surface-container-high border-0 border-b-2 focus:ring-0 transition-all text-on-surface placeholder:text-outline/50 pr-10 ${errors.confirmPassword ? 'border-error focus:border-error' : 'border-transparent focus:border-primary'}`}
                    placeholder="Re-enter your new password"
                    type={showConfirmPassword ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 bottom-2.5 text-outline hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">{showConfirmPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-error text-xs font-medium mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 academic-gradient text-on-primary font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                  {!isSubmitting && <span className="material-symbols-outlined text-sm">shield</span>}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-3 bg-transparent text-on-surface-variant font-medium rounded-xl border border-outline-variant/40 hover:bg-surface-container-high hover:border-outline-variant active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Skip for now
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </form>

            <footer className="mt-12 pt-8 border-t border-surface-variant/50">
              <p className="text-sm text-on-surface-variant text-center md:text-left">
                You can always change your password later from account settings.
              </p>
            </footer>
          </div>
        </section>
      </main>

      <div className="relative z-10 mt-8 text-center pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">
          © 2024 University of Ruhuna • Faculty of Technology • Smart Event Management System
        </p>
      </div>
    </div>
  );
}

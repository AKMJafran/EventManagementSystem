import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import useAuthStore from '../context/AuthContext';
import { getProfileRoute } from '../utils/profileRoutes';

const schema = z.object({
  username: z.string().min(1, 'Email, student ID, or lecturer ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const { role, mustChangePassword } = await login(data.username, data.password);
      toast.success('Login successful!');

      if (mustChangePassword) {
        navigate(`${getProfileRoute(role)}?tab=password&required=1`);
        return;
      }

      navigate(role === 'ADMIN' ? '/admin/dashboard' : role === 'LECTURER' ? '/lecturer/dashboard' : '/student/dashboard');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Login failed');
    }
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
              The Academic
              <br />
              Curator Portal
            </h1>
            <p className="text-on-primary-container text-lg max-w-sm font-light leading-relaxed">
              Student accounts are provisioned by the administration. Sign in with the credentials shared in your welcome email.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 py-4 border-t border-white/10">
              <span className="material-symbols-outlined text-tertiary-fixed">verified_user</span>
              <div>
                <p className="text-sm font-semibold">University of Ruhuna</p>
                <p className="text-xs opacity-70">Official Administrative Gateway</p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-16 flex flex-col justify-center bg-surface-container-lowest">
          <div className="max-w-md w-full mx-auto">
            <header className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">Institutional Login</h2>
              <p className="text-on-surface-variant font-body text-sm leading-relaxed">
                Use your email, student ID, or lecturer ID together with your password to access the event management system.
              </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="username">
                  Email, Student ID, or Lecturer ID
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-0 bottom-2.5 text-outline text-lg">person</span>
                  <input
                    id="username"
                    {...register('username')}
                    className={`w-full pl-8 py-3 bg-surface-container-high border-0 border-b-2 focus:ring-0 transition-all text-on-surface placeholder:text-outline/50 ${errors.username ? 'border-error focus:border-error' : 'border-transparent focus:border-primary'}`}
                    placeholder="Enter your email, student ID, or lecturer ID"
                    type="text"
                  />
                </div>
                {errors.username && <p className="text-error text-xs font-medium mt-1">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-0 bottom-2.5 text-outline text-lg">lock</span>
                  <input
                    id="password"
                    {...register('password')}
                    className={`w-full pl-8 py-3 bg-surface-container-high border-0 border-b-2 focus:ring-0 transition-all text-on-surface placeholder:text-outline/50 pr-10 ${errors.password ? 'border-error focus:border-error' : 'border-transparent focus:border-primary'}`}
                    placeholder="Enter your password"
                    type={showPassword ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-2.5 text-outline hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
                {errors.password && <p className="text-error text-xs font-medium mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-end text-sm">
                <Link to="/reset-password" className="text-primary font-medium hover:underline underline-offset-4 decoration-primary/30">
                  Forgot Password?
                </Link>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 academic-gradient text-on-primary font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Authenticating...' : 'Access Portal'}
                  {!isSubmitting && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                </button>
              </div>
            </form>

            <footer className="mt-12 pt-8 border-t border-surface-variant/50">
              <p className="text-sm text-on-surface-variant text-center md:text-left">
                Need an account? Please contact the faculty administration.
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

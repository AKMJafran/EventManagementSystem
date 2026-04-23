import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const schema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const { role } = await login(data.email, data.password);
      toast.success('Login successful!');
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Layer with Blur */}
      <div className="absolute inset-0 z-0">
        <img 
          alt="University administrative building" 
          className="w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA48Boy1hVFdzl9AWX7CQvlQnbO1illbiTdK1LXt8jTO4-82n9bN4n6ZfVdub57_bPKeyapBwtyYqgzrOpuh1HWTQpbTx2uX5Kx83qpC4WAiddVevszaiYOjeAB90ZWxS267k6Ft8MCDKLpOw4iTVc5RfNZsyLlfMYupTqextkWYmnapsr9Pg7IcEBC2hDuSSPu-tujU29bZzMPRdQLRBdo_6_FapnjKzOeYOIYqJeIq9vHRukQCXW8lAJmt_9x0CcT354OFOSfQmw0"
        />
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm"></div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-10 w-full max-w-6xl px-6 grid md:grid-cols-2 gap-0 shadow-2xl shadow-on-surface/5 rounded-xl overflow-hidden bg-surface-container-lowest">
        
        {/* Brand Narrative Section (Editorial Side) */}
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
              The Academic <br/>Curator Portal
            </h1>
            <p className="text-on-primary-container text-lg max-w-sm font-light leading-relaxed">
              A prestigious digital environment designed for institutional excellence. Manage faculty events with the precision of a research journal.
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

        {/* Login Form Section */}
        <section className="p-8 md:p-16 flex flex-col justify-center bg-surface-container-lowest">
          <div className="max-w-md w-full mx-auto">
            <header className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">Institutional Login</h2>
              <p className="text-on-surface-variant font-body text-sm leading-relaxed">
                Please authenticate using your faculty credentials to access the management system.
              </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="username">
                  Email or Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-0 bottom-2.5 text-outline text-lg">person</span>
                  <input 
                    id="username" 
                    {...register('email')}
                    className={`w-full pl-8 py-3 bg-surface-container-high border-0 border-b-2 focus:ring-0 transition-all text-on-surface placeholder:text-outline/50 ${errors.email ? 'border-error focus:border-error' : 'border-transparent focus:border-primary'}`}
                    placeholder="e.g. dean.office@ruh.ac.lk" 
                    type="text" 
                  />
                </div>
                {errors.email && <p className="text-error text-xs font-medium mt-1">{errors.email.message}</p>}
              </div>

              {/* Password Field */}
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
                    placeholder="••••••••" 
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

              {/* Options */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input className="rounded-sm border-outline-variant text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer" type="checkbox" />
                  <span className="text-on-surface-variant group-hover:text-on-surface transition-colors cursor-pointer mt-0.5">Remember Me</span>
                </label>
                <Link to="/reset-password" className="text-primary font-medium hover:underline underline-offset-4 decoration-primary/30">
                  Forgot Password?
                </Link>
              </div>

              {/* Login Button */}
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

            {/* Footer Links */}
            <footer className="mt-12 pt-8 border-t border-surface-variant/50">
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm text-on-surface-variant">
                  New to the portal? 
                  <Link to="/register" className="text-secondary font-semibold hover:text-primary transition-colors ml-1">
                    Create Account
                  </Link>
                </p>
              
              </div>
            </footer>
          </div>
        </section>
      </main>

      {/* Institutional Footer */}
      <div className="relative z-10 mt-8 text-center pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">
          © 2024 University of Ruhuna • Faculty of Technology • Smart Event Management System
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}

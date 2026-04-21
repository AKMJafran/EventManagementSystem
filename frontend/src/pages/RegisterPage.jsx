import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await axiosInstance.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast.success('Registration successful! Check your email for OTP.');
      navigate('/verify-otp', { state: { email: data.email } });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    }
  };

 return (
  <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest p-4">
    
    <Card className="w-full max-w-md bg-white shadow-md border border-outline-variant/20 rounded-2xl">
      
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">
          Register
        </CardTitle>
        <CardDescription className="text-on-surface-variant">
          Create a new account to get started
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <Input
            label="Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="John Doe"
            className="focus:ring-2 focus:ring-primary/40"
          />

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="john@example.com"
            className="focus:ring-2 focus:ring-primary/40"
          />

          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
            className="focus:ring-2 focus:ring-secondary/40"
          />

          <Input
            label="Confirm Password"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            placeholder="••••••••"
            className="focus:ring-2 focus:ring-tertiary/40"
          />

          <Button 
            type="submit" 
            className="w-full bg-primary text-white hover:bg-primary/90"
            isLoading={isSubmitting}
          >
            Register
          </Button>

          <div className="mt-4 text-center text-sm">
            <Link 
              to="/login" 
              className="font-medium text-primary hover:underline"
            >
              Already have an account? Login
            </Link>
          </div>

        </form>
      </CardContent>
    </Card>
  </div>
);
}

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

function OtpInput({ onChange, valueStr = '' }) {
  const [inputs, setInputs] = useState(Array(6).fill(''));

  const handleInput = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length > 1) return;
    const newInputs = [...inputs];
    newInputs[idx] = val;
    setInputs(newInputs);
    onChange(newInputs.join(''));
    if (val && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !inputs[idx] && idx > 0) {
      const prevInput = document.getElementById(`otp-${idx - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="flex space-x-3 justify-center mb-4">
      {inputs.map((v, i) => (
         <input
           key={i}
           id={`otp-${i}`}
           type="text"
           maxLength={1}
           className="w-12 h-14 text-center border border-gray-300 rounded-md text-xl font-semibold focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none transition-colors"
           value={v}
           onChange={e => handleInput(e, i)}
           onKeyDown={e => handleKeyDown(e, i)}
         />
      ))}
    </div>
  );
}

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = location.state?.email || '';
  const { register, handleSubmit, getValues, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail, otp: '' },
  });

  const onOtpChange = (otp) => setValue('otp', otp);

  const onSubmit = async (data) => {
    try {
      await axiosInstance.post('/auth/verify-otp', {
        email: data.email,
        otp: data.otp,
      });
      toast.success('Account verified! You can now login.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'OTP verification failed');
    }
  };

  const handleResend = async () => {
    try {
      const emailValue = getValues('email');
      if (!emailValue) {
        toast.error("Please enter email");
        return;
      }
      await axiosInstance.post(`/auth/resend-register-otp?email=${encodeURIComponent(emailValue)}`);
      toast.success('OTP resent to your email.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verify Your Account</CardTitle>
          <CardDescription>We sent a 6-digit code to your email</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email"
              {...register('email')}
              readOnly={Boolean(initialEmail)}
              error={errors.email?.message}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Enter 6-digit OTP
              </label>
              <OtpInput onChange={onOtpChange} />
              {errors.otp && <p className="text-red-500 text-sm text-center">{errors.otp.message}</p>}
            </div>

            <div className="space-y-3">
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Verify Account
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleResend}
              >
                Resend OTP
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

function OtpInput({ value, onChange }) {
  const [inputs, setInputs] = useState(Array(6).fill(''));

  const handleInput = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length > 1) return;
    const newInputs = [...inputs];
    newInputs[idx] = val;
    setInputs(newInputs);
    onChange(newInputs.join(''));
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`).focus();
    }
  };

  return (
    <div className="flex space-x-2 justify-center mb-4">
      {inputs.map((v, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          maxLength={1}
          className="w-10 h-12 text-center border rounded text-xl"
          value={v}
          onChange={e => handleInput(e, i)}
        />
      ))}
    </div>
  );
}

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email, otp: '' },
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
      await axiosInstance.post('/auth/send-reset-otp', { email });
      toast.success('OTP resent to your email.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Verify OTP</h2>
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input {...register('email')} className="w-full px-3 py-2 border rounded" readOnly />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>
        <label className="block mb-1">Enter 6-digit OTP</label>
        <OtpInput value={''} onChange={onOtpChange} />
        {errors.otp && <p className="text-red-500 text-sm mb-2">{errors.otp.message}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-2" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying...' : 'Verify'}
        </button>
        <button type="button" className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300" onClick={handleResend}>
          Resend OTP
        </button>
      </form>
    </div>
  );
}

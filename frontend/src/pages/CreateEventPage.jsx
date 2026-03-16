import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().min(5, 'Description required'),
  categoryId: z.string(),
  subCategoryId: z.string().optional(),
  venue: z.string().min(2, 'Venue required'),
  startTime: z.string(),
  endTime: z.string(),
});

export default function CreateEventPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const selectedCategory = watch('categoryId');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await axiosInstance.get('/categories');
        setCategories(res.data);
      } catch (err) {
        toast.error('Failed to load categories');
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchSubCategories() {
      if (!selectedCategory) {
        setSubCategories([]);
        return;
      }
      try {
        const res = await axiosInstance.get(`/categories/${selectedCategory}/sub`);
        setSubCategories(res.data);
      } catch (err) {
        toast.error('Failed to load sub-categories');
      }
    }
    fetchSubCategories();
  }, [selectedCategory]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await axiosInstance.post('/events', {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || null,
        venue: data.venue,
        startTime: data.startTime,
        endTime: data.endTime,
        userId: user.id,
      });
      toast.success('Event created successfully!');
      navigate('/my-events');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Event</h2>
        <div className="mb-4">
          <label className="block mb-1">Title</label>
          <input {...register('title')} className="w-full px-3 py-2 border rounded" />
          {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
        </div>
        <div className="mb-4">
          <label className="block mb-1">Description</label>
          <textarea {...register('description')} className="w-full px-3 py-2 border rounded" />
          {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
        </div>
        <div className="mb-4">
          <label className="block mb-1">Category</label>
          <select {...register('categoryId')} className="w-full px-3 py-2 border rounded">
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId.message}</p>}
        </div>
        {subCategories.length > 0 && (
          <div className="mb-4">
            <label className="block mb-1">Sub-Category</label>
            <select {...register('subCategoryId')} className="w-full px-3 py-2 border rounded">
              <option value="">Select sub-category</option>
              {subCategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-4">
          <label className="block mb-1">Venue</label>
          <input {...register('venue')} className="w-full px-3 py-2 border rounded" />
          {errors.venue && <p className="text-red-500 text-sm">{errors.venue.message}</p>}
        </div>
        <div className="mb-4">
          <label className="block mb-1">Start Time</label>
          <input type="datetime-local" {...register('startTime')} className="w-full px-3 py-2 border rounded" />
          {errors.startTime && <p className="text-red-500 text-sm">{errors.startTime.message}</p>}
        </div>
        <div className="mb-4">
          <label className="block mb-1">End Time</label>
          <input type="datetime-local" {...register('endTime')} className="w-full px-3 py-2 border rounded" />
          {errors.endTime && <p className="text-red-500 text-sm">{errors.endTime.message}</p>}
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}

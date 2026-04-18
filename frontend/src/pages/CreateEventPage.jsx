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
  categoryId: z.string().min(1, 'Category required'),
  subCategoryId: z.string().optional(),
  eventType: z.string().min(1, 'Event type required'),
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
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);

  const normalizeCategories = (items) => {
    return items.map((item) => ({
      ...item,
      name: item.name || item.categoryName || item.label || `Category ${item.id}`,
    }));
  };

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const selectedCategory = watch('categoryId');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await axiosInstance.get('/categories');
        setCategories(normalizeCategories(res.data));
      } catch (e) {
        toast.error('Failed to load categories');
        console.error(e);
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchSubCategories() {
      if (!selectedCategory) {
        setSubCategories([]);
        setSubCategoriesLoading(false);
        return;
      }
      setSubCategoriesLoading(true);
      try {
        const res = await axiosInstance.get(`/categories/${selectedCategory}/sub`);
        setSubCategories(normalizeCategories(res.data));
      } catch (e) {
        toast.error('Failed to load sub-categories');
        console.error(e);
      } finally {
        setSubCategoriesLoading(false);
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
        categoryId: data.subCategoryId || data.categoryId,
        eventType: data.eventType,
        venue: data.venue,
        startTime: data.startTime,
        endTime: data.endTime,
      });
      toast.success('Event created successfully!');
      navigate('/my-events');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to create event');
      console.error(e);
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
          <select
            {...register('categoryId')}
            defaultValue=""
            className="w-full px-3 py-2 border rounded"
            disabled={categoriesLoading}
          >
            <option value="">
              {categoriesLoading ? 'Loading categories...' : 'Select category'}
            </option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId.message}</p>}
        </div>
        {subCategories.length > 0 && (
          <div className="mb-4">
            <label className="block mb-1">Sub-Category</label>
            <select
              {...register('subCategoryId')}
              defaultValue=""
              className="w-full px-3 py-2 border rounded"
              disabled={subCategoriesLoading}
            >
              <option value="">
                {subCategoriesLoading ? 'Loading sub-categories...' : 'Select sub-category'}
              </option>
              {subCategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-4">
          <label className="block mb-1">Event Type</label>
          <select {...register('eventType')} className="w-full px-3 py-2 border rounded">
            <option value="">Select event type</option>
            <option value="CULTURAL">Cultural</option>
            <option value="TECHNICAL">Technical</option>
            <option value="ACADEMIC">Academic</option>
            <option value="SPORTS">Sports</option>
            <option value="URGENT">Urgent</option>
          </select>
          {errors.eventType && <p className="text-red-500 text-sm">{errors.eventType.message}</p>}
        </div>
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
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-70"
          disabled={isSubmitting || loading || categoriesLoading || categories.length === 0}
        >
          {isSubmitting || loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}

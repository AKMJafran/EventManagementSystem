import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import StudentLayout from '../components/layout/StudentLayout';

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().min(5, 'Description required'),
  categoryId: z.string().min(1, 'Category required'),
  subCategoryId: z.string().optional(),
  eventType: z.string().min(1, 'Event type required'),
  venue: z.string().min(2, 'Venue required'),
  startTime: z.string(),
  endTime: z.string(),
  imageId: z.string().optional(),
});

export default function CreateEventPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [existingImageId, setExistingImageId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);

  const normalizeCategories = (items) => {
    return items.map((item) => ({
      ...item,
      name: item.name || item.categoryName || item.label || `Category ${item.id}`,
    }));
  };

  const toDateTimeLocalValue = (dateString) => {
    if (!dateString) return '';
    const normalized = dateString.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      setImagePreview(null);
      setImageError('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedImage(null);
      setImagePreview(null);
      setImageError('Please select a valid image file.');
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelectedImage(null);
      setImagePreview(null);
      setImageError('Image size must be 5MB or less.');
      toast.error('File size should not exceed 5MB.');
      return;
    }

    setImageError('');
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result?.toString() || null);
    };
    reader.readAsDataURL(file);
  };

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
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
    if (!id) return;

    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/events/${id}`);
        const event = res.data;

        reset({
          title: event.title || '',
          description: event.description || '',
          categoryId: event.categoryId?.toString() || '',
          subCategoryId: '',
          eventType: event.eventType || '',
          venue: event.venue || '',
          startTime: toDateTimeLocalValue(event.startTime),
          endTime: toDateTimeLocalValue(event.endTime),
          imageId: event.imageId || '',
        });

        setExistingImageId(event.imageId || null);
        setSelectedImage(null);
        setImagePreview(event.imageUrl || null);
      } catch (e) {
        toast.error('Failed to load event for editing');
        console.error(e);
      }
    };

    fetchEvent();
  }, [id, reset]);

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
      let imageId = existingImageId;
      
      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);
        
        try {
          const uploadRes = await axiosInstance.post('/files/upload', formData);
          imageId = uploadRes.data.fileId;
        } catch (uploadError) {
          const status = uploadError?.response?.status;
          const serverData = uploadError?.response?.data;
          console.error('Image upload failed', { status, serverData, uploadError });
          toast.error(
            serverData?.error
              ? `${serverData.error}${serverData.details ? `: ${serverData.details}` : ''}`
              : 'Failed to upload image. Event creation was stopped.'
          );
          return;
        }
      }

      const payload = {
        title: data.title,
        description: data.description,
        categoryId: data.subCategoryId || data.categoryId,
        eventType: data.eventType,
        venue: data.venue,
        startTime: data.startTime,
        endTime: data.endTime,
        imageId: imageId,
      };

      if (isEditMode) {
        await axiosInstance.put(`/events/${id}`, payload);
        toast.success('Event updated successfully!');
      } else {
        await axiosInstance.post('/events', payload);
        toast.success('Event created successfully!');
      }
      navigate('/student/my-events');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to create event');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentLayout user={user}>
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-bold text-on-surface tracking-tight mb-2">
          {isEditMode ? 'Edit Pending Event' : 'Create New Event'}
        </h1>
        <p className="font-body text-on-surface-variant max-w-2xl">
          {isEditMode 
            ? 'Update the event details before faculty review.' 
            : 'Submit a detailed proposal for your upcoming event. Our coordination committee reviews submissions every Tuesday and Thursday.'}
        </p>
      </header>
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-12">
          <section className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_24px_40px_rgba(0,128,128,0.04)]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            
              {/* Section 1: Identity */}
              <div className="grid grid-cols-1 gap-8">
                <div className="relative">
                  <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Event Title</label>
                  <input 
                    {...register('title')} 
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 text-lg font-headline placeholder:opacity-30" 
                    placeholder="e.g., Annual Symposium on Digital Ethics" 
                    type="text"
                  />
                  {errors.title && <p className="text-error text-xs mt-1 font-bold">{errors.title.message}</p>}
                </div>
                
                <div className="relative">
                  <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Description</label>
                  <textarea 
                    {...register('description')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 resize-none placeholder:opacity-30" 
                    placeholder="Describe the purpose, target audience, and key highlights..." 
                    rows="4"
                  />
                  {errors.description && <p className="text-error text-xs mt-1 font-bold">{errors.description.message}</p>}
                </div>

                <div>
                  <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Event Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-2 text-sm file:bg-primary-container/20 file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-on-surface file:rounded-xl file:mr-4 file:cursor-pointer hover:file:bg-primary-container/30"
                  />
                  {imageError && (
                    <p className="text-error text-xs mt-2 font-bold">{imageError}</p>
                  )}
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Event preview"
                      className="mt-4 h-48 w-full rounded-2xl object-cover border border-primary/10 shadow-sm"
                    />
                  )}
                </div>
              </div>

              {/* Section 2: Classification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Category</label>
                  <select 
                    {...register('categoryId')}
                    disabled={categoriesLoading}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4"
                  >
                    <option value="">{categoriesLoading ? 'Loading...' : 'Select Category'}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && <p className="text-error text-xs mt-1 font-bold">{errors.categoryId.message}</p>}
                </div>
                
                {subCategories.length > 0 ? (
                  <div>
                    <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Sub-Category</label>
                    <select 
                      {...register('subCategoryId')}
                      disabled={subCategoriesLoading}
                      className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4"
                    >
                      <option value="">{subCategoriesLoading ? 'Loading...' : 'Select Sub-Category'}</option>
                      {subCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Event Type</label>
                    <select 
                      {...register('eventType')}
                      className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4"
                    >
                      <option value="">Select Event Type</option>
                      <option value="CULTURAL">Cultural</option>
                      <option value="TECHNICAL">Technical</option>
                      <option value="ACADEMIC">Academic</option>
                      <option value="SPORTS">Sports</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                    {errors.eventType && <p className="text-error text-xs mt-1 font-bold">{errors.eventType.message}</p>}
                  </div>
                )}
              </div>

              {subCategories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Event Type</label>
                    <select 
                      {...register('eventType')}
                      className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4"
                    >
                      <option value="">Select Event Type</option>
                      <option value="CULTURAL">Cultural</option>
                      <option value="TECHNICAL">Technical</option>
                      <option value="ACADEMIC">Academic</option>
                      <option value="SPORTS">Sports</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                    {errors.eventType && <p className="text-error text-xs mt-1 font-bold">{errors.eventType.message}</p>}
                  </div>
                  <div></div>
                </div>
              )}

              {/* Section 3: Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="md:col-span-2">
                  <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Venue</label>
                  <input 
                    {...register('venue')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4" 
                    placeholder="Enter Venue Name"
                  />
                  {errors.venue && <p className="text-error text-xs mt-1 font-bold">{errors.venue.message}</p>}
                </div>
                
                <div>
                  <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Start Date & Time</label>
                  <input 
                    {...register('startTime')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4" 
                    type="datetime-local"
                  />
                  {errors.startTime && <p className="text-error text-xs mt-1 font-bold">{errors.startTime.message}</p>}
                </div>
                
                <div>
                  <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">End Date & Time</label>
                  <input 
                    {...register('endTime')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4" 
                    type="datetime-local"
                  />
                  {errors.endTime && <p className="text-error text-xs mt-1 font-bold">{errors.endTime.message}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-6 pt-6">
                <button 
                  type="button"
                  onClick={() => navigate('/student')}
                  className="px-8 py-4 text-on-surface-variant font-semibold hover:bg-surface-container-high rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="px-10 py-4 bg-gradient-to-br from-[#006565] to-[#008080] text-white font-bold rounded-xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70"
                >
                  {isSubmitting || loading ? 'Submitting...' : (isEditMode ? 'Update Request' : 'Submit Request')}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Sidebar Guidelines */}
        <aside className="w-full lg:w-80 space-y-8">
          <div className="bg-surface-container-low p-8 rounded-xl border-l-4 border-tertiary">
            <h3 className="font-headline text-xl font-bold mb-4 text-primary">Submission Guidelines</h3>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-tertiary shrink-0">info</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">Ensure all event venues are booked at least <strong>2 weeks</strong> in advance.</p>
              </li>
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-tertiary shrink-0">verified_user</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">Risk assessment forms must be attached for outdoor events.</p>
              </li>
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-tertiary shrink-0">group</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">Events exceeding <strong>200 attendees</strong> require security clearance.</p>
              </li>
            </ul>
          </div>
          
          {/* Quick Context Card */}
          <div className="relative overflow-hidden group rounded-xl aspect-[4/5]">
            <img 
              alt="Academic Campus" 
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCokpOP5O0X7kVdS3rFhFSjWwQZNGmfy4v2Y7WrNufEG2FBoLo0nffJONmtdImpO6PJw1nHX2DucAqVTvZzUOtY-0Yfe-B-T7a3cB_uTWnfqmCuG76NvijQ7II8cNpeRzSsN6nzhHrQvGffDLdRPLYaRR2-fA7GRHwNqrCR1bb3sG9_PwywyRbVB8RvbkrlZ898XAmHIlbuetffdkqiQKgLzo--WUoIsOU4Roe5-HXoWyc81R45uxV0F4iKLcWv5hY0MTiGqwGEawc"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-6">
              <h4 className="font-headline text-white text-lg font-bold mb-1">Tradition of Excellence</h4>
              <p className="text-white/80 text-xs">Curating events that define our academic legacy.</p>
            </div>
          </div>
          
          {/* Tooltip Area */}
          <div className="p-4 bg-primary-container/10 border border-primary-container/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-sm mt-0.5">lightbulb</span>
              <div className="text-xs text-on-surface-variant italic">
                "Events with rich descriptions and clear categories are 40% more likely to be approved on the first review."
              </div>
            </div>
          </div>
        </aside>
      </div>
    </StudentLayout>
  );
}

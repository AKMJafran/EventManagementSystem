import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import StudentLayout from '../components/layout/StudentLayout';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

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
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [existingImageId, setExistingImageId] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedImageSignature, setSelectedImageSignature] = useState('');
  const [lastUploadedSignature, setLastUploadedSignature] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [imageFeedback, setImageFeedback] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle');
  const [removeImage, setRemoveImage] = useState(false);
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

  const buildFileSignature = (file) => {
    if (!file) return '';
    return [file.name, file.size, file.lastModified].join(':');
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setSelectedImageSignature('');
    setLastUploadedSignature('');
    setUploadedImage(null);
    setExistingImageId(null);
    setImagePreview(null);
    setImageError('');
    setImageFeedback('Image removed from this event.');
    setUploadProgress(0);
    setUploadState('idle');
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getImageValidationError = (file) => {
    const extension = file?.name?.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png'];

    if (!file) {
      return 'Please select an image file.';
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || !allowedExtensions.includes(extension)) {
      return 'Only JPG, JPEG, and PNG images are allowed.';
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Image size must be 5MB or less.';
    }

    return '';
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validationError = getImageValidationError(file);
    if (validationError) {
      setSelectedImage(null);
      setSelectedImageSignature('');
      setImageError(validationError);
      setImageFeedback('');
      setUploadProgress(0);
      setUploadState('idle');
      toast.error(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const nextSignature = buildFileSignature(file);
    if (nextSignature === selectedImageSignature && imagePreview) {
      setImageFeedback('That image is already selected.');
      return;
    }

    setImageError('');
    setImageFeedback('Image selected. It will upload when you submit the event.');
    setSelectedImage(file);
    setSelectedImageSignature(nextSignature);
    setLastUploadedSignature('');
    setUploadedImage(null);
    setUploadProgress(0);
    setUploadState('idle');
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const selectedCategory = watch('categoryId');

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith?.('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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

        const existingImage = event.imageId
          ? {
              fileId: event.imageId,
              originalFilename: event.imageOriginalFilename || '',
              contentType: event.imageContentType || '',
              uploadedAt: event.imageUploadedAt || null,
              checksum: event.imageChecksum || '',
              imageUrl: event.imageUrl || null,
            }
          : null;

        setExistingImageId(event.imageId || null);
        setUploadedImage(existingImage);
        setSelectedImageSignature('');
        setLastUploadedSignature('');
        setSelectedImage(null);
        setImagePreview(event.imageUrl || null);
        setImageError('');
        setImageFeedback(event.imageId ? 'Existing image loaded. You can keep, replace, or remove it.' : '');
        setUploadProgress(0);
        setUploadState('idle');
        setRemoveImage(false);
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
      let finalImage = uploadedImage;

      if (selectedImage) {
        if (!uploadedImage || lastUploadedSignature !== selectedImageSignature) {
          const formData = new FormData();
          formData.append('file', selectedImage);

          try {
            setUploadState('uploading');
            setUploadProgress(0);
            setImageError('');
            setImageFeedback('Uploading image to the file server...');

            const uploadRes = await axiosInstance.post('/files/upload', formData, {
              onUploadProgress: (progressEvent) => {
                if (!progressEvent.total) return;
                const nextProgress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                setUploadProgress(nextProgress);
              },
            });

            finalImage = uploadRes.data;
            setUploadedImage(uploadRes.data);
            setExistingImageId(uploadRes.data.fileId);
            setLastUploadedSignature(selectedImageSignature);
            setRemoveImage(false);
            setUploadState('success');
            setUploadProgress(100);
            setImageFeedback(
              uploadRes.data.reusedExisting
                ? 'This image already exists in the system, so the previous upload was reused.'
                : 'Image uploaded successfully.'
            );
          } catch (uploadError) {
            const serverData = uploadError?.response?.data;
            const errorMessage =
              serverData?.error
                ? `${serverData.error}${serverData.details ? `: ${serverData.details}` : ''}`
                : 'Failed to upload image. Please try again.';

            setUploadState('error');
            setUploadProgress(0);
            setImageError(errorMessage);
            setImageFeedback('');
            console.error('Image upload failed', uploadError);
            toast.error(errorMessage);
            throw uploadError;
          }
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
        imageId: removeImage ? null : finalImage?.fileId || existingImageId || null,
        imageOriginalFilename: removeImage ? null : finalImage?.originalFilename || null,
        imageContentType: removeImage ? null : finalImage?.contentType || null,
        imageUploadedAt: removeImage ? null : finalImage?.uploadedAt || null,
        imageChecksum: removeImage ? null : finalImage?.checksum || null,
        removeImage,
      };

      if (isEditMode) {
        const res = await axiosInstance.put(`/events/${id}`, payload);
        toast.success(
          res.data?.hasConflict
            ? 'Event updated. Conflict flagged for admin review.'
            : 'Event updated successfully!'
        );
      } else {
        const res = await axiosInstance.post('/events', payload);
        toast.success(
          res.data?.hasConflict
            ? 'Event created with a conflict. Admin review is required.'
            : 'Event created successfully!'
        );
      }
      navigate(user?.role === 'ADMIN' ? '/manage-events' : '/student/my-events');
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
        <h1 className="text-4xl font-bold text-on-surface mb-2 serif-heading">{isEditMode ? 'Edit Pending Event' : 'Create New Event'}</h1>
        <p className="text-on-surface-variant max-w-2xl">
          {isEditMode ? 'Update the event details before faculty review.' : 'Submit a detailed proposal for your upcoming event. Our coordination committee reviews submissions every Tuesday and Thursday.'}
        </p>
      </header>
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-12">
          <section className="bg-surface-container-lowest p-8 rounded-xl shadow-2xl shadow-primary/5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            
              <div className="grid grid-cols-1 gap-8">
                <div className="relative">
                  <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Event Title</label>
                  <input 
                    {...register('title')} 
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 text-lg font-bold placeholder:opacity-30 rounded-t-lg" 
                    placeholder="e.g., Annual Symposium on Digital Ethics" 
                    type="text"
                  />
                  {errors.title && <p className="text-error text-xs mt-1 font-bold">{errors.title.message}</p>}
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Description</label>
                  <textarea 
                    {...register('description')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 resize-none placeholder:opacity-30 rounded-t-lg" 
                    placeholder="Describe the purpose, target audience, and key highlights..." 
                    rows="4"
                  />
                  {errors.description && <p className="text-error text-xs mt-1 font-bold">{errors.description.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Event Image</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageChange}
                    className="w-full bg-surface-container-high border-0 focus:ring-0 rounded-t-lg text-sm file:bg-primary-container/20 file:border-0 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-on-surface file:rounded-xl"
                  />
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Supported formats: JPG, JPEG, PNG. Maximum size: 5MB.
                  </p>
                  {imageError && (
                    <p className="text-error text-xs mt-2 font-bold">{imageError}</p>
                  )}
                  {imageFeedback && !imageError && (
                    <p className={`text-xs mt-2 font-bold ${uploadState === 'success' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      {imageFeedback}
                    </p>
                  )}
                  {uploadState === 'uploading' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                        <span>Upload Progress</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {imagePreview && (
                    <div className="mt-4 space-y-4">
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="h-48 w-full rounded-2xl object-cover border border-primary/10"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl bg-surface-container-high px-4 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={clearImageSelection}
                          className="rounded-xl border border-error/30 px-4 py-2 text-xs font-bold text-error transition-colors hover:bg-error/5"
                        >
                          Remove Image
                        </button>
                        {uploadedImage?.originalFilename && (
                          <span className="text-xs font-medium text-on-surface-variant">
                            {uploadedImage.originalFilename}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Category</label>
                  <select 
                    {...register('categoryId')}
                    disabled={categoriesLoading}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 rounded-t-lg font-medium"
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
                    <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Sub-Category</label>
                    <select 
                      {...register('subCategoryId')}
                      disabled={subCategoriesLoading}
                      className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 rounded-t-lg font-medium"
                    >
                      <option value="">{subCategoriesLoading ? 'Loading...' : 'Select Sub-Category'}</option>
                      {subCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Event Type</label>
                    <select 
                      {...register('eventType')}
                      className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 rounded-t-lg font-medium"
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
                    <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Event Type</label>
                    <select 
                      {...register('eventType')}
                      className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 rounded-t-lg font-medium"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Venue</label>
                  <input 
                    {...register('venue')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 rounded-t-lg font-medium" 
                    placeholder="Enter Venue Name"
                  />
                  {errors.venue && <p className="text-error text-xs mt-1 font-bold">{errors.venue.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Start Date & Time</label>
                  <input 
                    {...register('startTime')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 rounded-t-lg font-medium" 
                    type="datetime-local"
                  />
                  {errors.startTime && <p className="text-error text-xs mt-1 font-bold">{errors.startTime.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">End Date & Time</label>
                  <input 
                    {...register('endTime')}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all p-4 rounded-t-lg font-medium" 
                    type="datetime-local"
                  />
                  {errors.endTime && <p className="text-error text-xs mt-1 font-bold">{errors.endTime.message}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 pt-6">
                <button 
                  type="button"
                  onClick={() => navigate(user?.role === 'ADMIN' ? '/manage-events' : '/student/dashboard')}
                  className="px-8 py-4 text-on-surface-variant font-bold hover:bg-surface-container-high rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="px-10 py-4 academic-gradient text-white font-bold rounded-xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70"
                >
                  {isSubmitting || loading ? 'Submitting...' : (isEditMode ? 'Update Request' : 'Submit Request')}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="w-full lg:w-80 space-y-8">
          <div className="bg-surface-container-low p-8 rounded-xl border-l-4 border-tertiary">
            <h3 className="text-xl font-bold mb-4 text-primary serif-heading">Submission Guidelines</h3>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-tertiary shrink-0">info</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">Ensure all event venues are booked at least <strong className="text-on-surface">2 weeks</strong> in advance.</p>
              </li>
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-tertiary shrink-0">verified_user</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">Risk assessment forms must be attached for outdoor events.</p>
              </li>
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-tertiary shrink-0">group</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">Events exceeding <strong className="text-on-surface">200 attendees</strong> require security clearance.</p>
              </li>
            </ul>
          </div>
          
          <div className="relative overflow-hidden group rounded-xl aspect-4/5">
            <img 
              alt="Academic Campus" 
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCokpOP5O0X7kVdS3rFhFSjWwQZNGmfy4v2Y7WrNufEG2FBoLo0nffJONmtdImpO6PJw1nHX2DucAqVTvZzUOtY-0Yfe-B-T7a3cB_uTWnfqmCuG76NvijQ7II8cNpeRzSsN6nzhHrQvGffDLdRPLYaRR2-fA7GRHwNqrCR1bb3sG9_PwywyRbVB8RvbkrlZ898XAmHIlbuetffdkqiQKgLzo--WUoIsOU4Roe5-HXoWyc81R45uxV0F4iKLcWv5hY0MTiGqwGEawc"
            />
            <div className="absolute inset-0 bg-linear-to-t from-primary/90 to-transparent flex flex-col justify-end p-6">
              <h4 className="text-white text-lg font-bold mb-1 serif-heading">Tradition of Excellence</h4>
              <p className="text-white/80 text-xs">Curating events that define our academic legacy.</p>
            </div>
          </div>
          
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

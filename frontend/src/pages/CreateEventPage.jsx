import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
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

  const normalizeCategories = (items) =>
    items.map((item) => ({
      ...item,
      name: item.name || item.categoryName || item.label || `Category ${item.id}`,
    }));

  const EVENT_TYPE_OPTIONS = [
    { value: 'CULTURAL', label: 'Cultural' },
    { value: 'TECHNICAL', label: 'Technical' },
    { value: 'ACADEMIC', label: 'Academic' },
    { value: 'SPORTS', label: 'Sports' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  const toDateTimeLocalValue = (dateString) => {
    if (!dateString) return '';
    const normalized = dateString.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const buildFileSignature = (file) =>
    file ? `${file.name}:${file.size}:${file.lastModified}` : '';

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getImageValidationError = (file) => {
    const extension = file?.name?.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png'];

    if (!file) return 'Please select an image file.';

    if (
      !ACCEPTED_IMAGE_TYPES.includes(file.type) ||
      !allowedExtensions.includes(extension)
    ) {
      return 'Only JPG, JPEG, and PNG images are allowed.';
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Image size must be 5MB or less.';
    }

    return '';
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = getImageValidationError(file);
    if (error) {
      setSelectedImage(null);
      setImageError(error);
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const signature = buildFileSignature(file);

    setSelectedImage(file);
    setSelectedImageSignature(signature);
    setImageError('');
    setImageFeedback('Image selected. It will upload on submit.');
    setUploadProgress(0);
    setUploadState('idle');
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const selectedCategory = watch('categoryId');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await axiosInstance.get('/categories');
        setCategories(normalizeCategories(res.data));
      } catch {
        toast.error('Failed to load categories');
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
        setUploadedImage(
          event.imageId
            ? {
                fileId: event.imageId,
                originalFilename: event.imageOriginalFilename,
                contentType: event.imageContentType,
                uploadedAt: event.imageUploadedAt,
                checksum: event.imageChecksum,
                imageUrl: event.imageUrl,
              }
            : null
        );

        setImagePreview(event.imageUrl || null);
      } catch {
        toast.error('Failed to load event');
      }
    };

    fetchEvent();
  }, [id, reset]);

  useEffect(() => {
    async function fetchSubCategories() {
      if (!selectedCategory) return setSubCategories([]);

      try {
        setSubCategoriesLoading(true);
        const res = await axiosInstance.get(
          `/categories/${selectedCategory}/sub`
        );
        setSubCategories(normalizeCategories(res.data));
      } catch {
        toast.error('Failed to load sub-categories');
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
        if (
          !uploadedImage ||
          lastUploadedSignature !== selectedImageSignature
        ) {
          const formData = new FormData();
          formData.append('file', selectedImage);

          setUploadState('uploading');

          const uploadRes = await axiosInstance.post(
            '/files/upload',
            formData,
            {
              onUploadProgress: (e) => {
                if (!e.total) return;
                setUploadProgress(
                  Math.round((e.loaded / e.total) * 100)
                );
              },
            }
          );

          finalImage = uploadRes.data;
          setUploadedImage(uploadRes.data);
          setLastUploadedSignature(selectedImageSignature);
          setUploadState('success');
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
        imageId: removeImage
          ? null
          : finalImage?.fileId || existingImageId,
        imageOriginalFilename: removeImage
          ? null
          : finalImage?.originalFilename,
        imageContentType: removeImage
          ? null
          : finalImage?.contentType,
        imageUploadedAt: removeImage
          ? null
          : finalImage?.uploadedAt,
        imageChecksum: removeImage ? null : finalImage?.checksum,
        removeImage,
      };

      if (isEditMode) {
        await axiosInstance.put(`/events/${id}`, payload);
        toast.success('Event updated successfully');
      } else {
        await axiosInstance.post('/events', payload);
        toast.success('Event created successfully');
      }

      navigate(
        user?.role === 'ADMIN'
          ? '/manage-events'
          : '/student/my-events'
      );
    } catch (e) {
      toast.error(
        e?.response?.data?.message || 'Failed to submit event'
      );
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id?.toString() || '',
    label: category.name || `Category ${category.id}`,
  }));

  const subCategoryOptions = subCategories.map((subCategory) => ({
    value: subCategory.id?.toString() || '',
    label: subCategory.name || `Subcategory ${subCategory.id}`,
  }));

  return (
    <StudentLayout user={user}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-on-background">
            {isEditMode ? 'Edit Event' : 'Create Event'}
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant max-w-2xl">
            {isEditMode
              ? 'Update your event details and submit changes for review.'
              : 'Fill in the event details to submit a new event request.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Input
              label="Event Title"
              placeholder="Enter event title"
              error={errors.title?.message}
              {...register('title')}
            />

            <Select
              label="Event Type"
              placeholder="Select event type"
              options={EVENT_TYPE_OPTIONS}
              error={errors.eventType?.message}
              {...register('eventType')}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Select
              label="Category"
              placeholder={categoriesLoading ? 'Loading categories...' : 'Select category'}
              options={categoryOptions}
              error={errors.categoryId?.message}
              disabled={categoriesLoading}
              {...register('categoryId')}
            />

            <Select
              label="Subcategory"
              placeholder={subCategoryOptions.length ? 'Select subcategory' : 'Choose category first'}
              options={subCategoryOptions}
              disabled={!selectedCategory || subCategoriesLoading}
              {...register('subCategoryId')}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Input
              label="Venue"
              placeholder="Enter venue or room"
              error={errors.venue?.message}
              {...register('venue')}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <Input
                label="Start Date & Time"
                type="datetime-local"
                error={errors.startTime?.message}
                {...register('startTime')}
              />
              <Input
                label="End Date & Time"
                type="datetime-local"
                error={errors.endTime?.message}
                {...register('endTime')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="min-h-[160px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe the event, agenda, and objective"
              {...register('description')}
            />
            {errors.description?.message && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Event image</p>
                <p className="text-sm text-gray-500">Upload a JPG or PNG file (max 5MB). Optional.</p>
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700"
                onClick={clearImageSelection}
              >
                Remove image
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-full file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-white file:hover:bg-primary-700"
              />
              {imageError && <p className="text-sm text-red-500">{imageError}</p>}
            </div>

            {imageFeedback && <p className="text-sm text-green-600">{imageFeedback}</p>}

            {imagePreview && (
              <div className="rounded-xl border border-gray-200 bg-surface-container-lowest p-3">
                <img
                  src={imagePreview}
                  alt="Selected preview"
                  className="max-h-80 w-full rounded-lg object-contain"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div className="text-sm text-on-surface-variant">
              {isEditMode
                ? 'Edit mode: existing event data is loaded automatically.'
                : 'Create mode: all fields are required except the image.'}
            </div>
            <Button type="submit" isLoading={loading} className="w-full sm:w-auto">
              {isEditMode ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </StudentLayout>
  );
}
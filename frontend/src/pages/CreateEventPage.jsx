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

  const EVENT_TYPE_OPTIONS = [
    { value: 'CULTURAL', label: 'Cultural' },
    { value: 'TECHNICAL', label: 'Technical' },
    { value: 'ACADEMIC', label: 'Academic' },
    { value: 'SPORTS', label: 'Sports' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  const normalizeCategories = (items) =>
    items.map((item) => ({
      ...item,
      name: item.name || item.categoryName || item.label || `Category ${item.id}`,
    }));

  const toDateTimeLocalValue = (dateString) => {
    if (!dateString) return '';

    const normalized = dateString.replace(' ', 'T');
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) return '';

    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getImageValidationError = (file) => {
    const extension = file?.name?.split('.').pop()?.toLowerCase();

    if (!file) return 'Please select an image file.';

    if (
      !ACCEPTED_IMAGE_TYPES.includes(file.type) ||
      !['jpg', 'jpeg', 'png'].includes(extension)
    ) {
      return 'Only JPG, JPEG and PNG allowed.';
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Image size must be 5MB or less.';
    }

    return '';
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const error = getImageValidationError(file);

    if (error) {
      setSelectedImage(null);
      setImageError(error);

      toast.error(error);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

    const signature = buildFileSignature(file);

    setSelectedImage(file);
    setSelectedImageSignature(signature);

    setImageError('');
    setImageFeedback('Image selected. Upload happens on submit.');

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
    formState: {
      errors,
      isSubmitting
    }
  } = useForm({
    resolver: zodResolver(schema),
  });

  const selectedCategory = watch('categoryId');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get('/categories');
        setCategories(normalizeCategories(res.data));
      } catch {
        toast.error('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };

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
    const fetchSubCategories = async () => {
      if (!selectedCategory) {
        setSubCategories([]);
        return;
      }

      try {
        setSubCategoriesLoading(true);

        const res = await axiosInstance.get(
          `/categories/${selectedCategory}/sub`
        );

        setSubCategories(
          normalizeCategories(res.data)
        );

      } catch {
        toast.error('Failed loading subcategories');
      } finally {
        setSubCategoriesLoading(false);
      }
    };

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

        imageChecksum: removeImage
          ? null
          : finalImage?.checksum,

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
        e?.response?.data?.message ||
        'Failed to submit event'
      );

    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id?.toString() || '',
    label: cat.name,
  }));

  const subCategoryOptions = subCategories.map((sub) => ({
    value: sub.id?.toString() || '',
    label: sub.name,
  }));

  return (
    <StudentLayout user={user}>
      <div className="mx-auto max-w-6xl px-4 py-10">

        <div className="mb-8">
          <h1 className="text-4xl font-bold">
            {isEditMode ? 'Edit Event' : 'Create Event'}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {isEditMode
              ? 'Update your event details.'
              : 'Submit a new event request.'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
        >

          <div className="grid gap-6 lg:grid-cols-2">
            <Input
              label="Event Title"
              error={errors.title?.message}
              {...register('title')}
            />

            <Select
              label="Event Type"
              options={EVENT_TYPE_OPTIONS}
              error={errors.eventType?.message}
              {...register('eventType')}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Select
              label="Category"
              options={categoryOptions}
              disabled={categoriesLoading}
              error={errors.categoryId?.message}
              {...register('categoryId')}
            />

            <Select
              label="Subcategory"
              options={subCategoryOptions}
              disabled={!selectedCategory || subCategoriesLoading}
              {...register('subCategoryId')}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            <Input
              label="Venue"
              error={errors.venue?.message}
              {...register('venue')}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <Input
                label="Start Time"
                type="datetime-local"
                {...register('startTime')}
              />

              <Input
                label="End Time"
                type="datetime-local"
                {...register('endTime')}
              />
            </div>

          </div>

          <div>
            <label className="block mb-2 font-medium">
              Description
            </label>

            <textarea
              {...register('description')}
              className="w-full rounded border p-3 min-h-[160px]"
            />

            {errors.description && (
              <p className="text-red-500 text-sm mt-2">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">
                Event Image
              </span>

              <button
                type="button"
                onClick={clearImageSelection}
                className="text-blue-600"
              >
                Remove Image
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
            />

            {imageError && (
              <p className="text-red-500">
                {imageError}
              </p>
            )}

            {imageFeedback && (
              <p className="text-green-600">
                {imageFeedback}
              </p>
            )}

            {uploadState === 'uploading' && (
              <p>Uploading {uploadProgress}%</p>
            )}

            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="rounded-xl max-h-80"
              />
            )}

          </div>

          <Button
            type="submit"
            isLoading={loading || isSubmitting}
          >
            {isEditMode
              ? 'Update Event'
              : 'Create Event'}
          </Button>

        </form>

      </div>
    </StudentLayout>
  );
}
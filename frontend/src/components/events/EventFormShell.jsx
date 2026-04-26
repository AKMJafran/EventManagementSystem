import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import {
  extractReadableErrorMessage,
  isVenueConflictError,
  normalizeCategories,
  normalizeVenues,
  toDateTimeLocalValue,
} from './eventFormShared';

function fieldClass(hasError, extra = '') {
  return [
    'w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-sm text-on-surface shadow-sm outline-none transition',
    'disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant',
    hasError
      ? 'border-error ring-2 ring-error/10 focus:border-error'
      : 'focus:border-primary focus:ring-2 focus:ring-primary/10',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

function Spinner({ label }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
      {label}
    </span>
  );
}

export default function EventFormShell({
  pageTitle,
  pageDescription,
  schema,
  defaultValues,
  hiddenFields = {},
  initialEvent = null,
  headerContent = null,
  headerActions = null,
  approvalContent = null,
  submitLabel,
  submittingLabel,
  cancelLabel = 'Cancel',
  onCancel,
  submitRequest,
  onSuccess,
  showDepartmentField = false,
  departmentReadOnly = false,
  departmentHelperText = '',
  conflictMessage = 'Venue conflict detected. Please choose a different venue or time.',
  generalErrorMessage = 'Failed to save event.',
}) {
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState('');
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialEvent?.imageUrl || null);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasVenueConflict, setHasVenueConflict] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      subCategoryId: '',
      venue: '',
      startTime: '',
      endTime: '',
      isMultiDay: false,
      isPublic: false,
      departmentName: '',
      imageId: '',
      ...defaultValues,
      ...hiddenFields,
    },
  });

  const descriptionValue = watch('description') || '';
  const selectedCategory = watch('categoryId');
  const watchedVenue = watch('venue');
  const watchedStart = watch('startTime');
  const watchedEnd = watch('endTime');

  function processSelectedFile(file) {
    if (!file) {
      setSelectedImage(null);
      setImagePreview(initialEvent?.imageUrl || null);
      setImageError('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedImage(null);
      setImagePreview(initialEvent?.imageUrl || null);
      setImageError('Please select a valid image file.');
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelectedImage(null);
      setImagePreview(initialEvent?.imageUrl || null);
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
  }

  const loadSubCategories = useCallback(async (parentId) => {
    if (!parentId) return [];
    const response = await axiosInstance.get(`/categories/${parentId}/sub`);
    return normalizeCategories(response.data);
  }, []);

  async function retryVenueLoad() {
    setVenuesLoading(true);
    setVenuesError('');

    try {
      const response = await axiosInstance.get('/venues');
      setVenues(normalizeVenues(response.data));
    } catch (error) {
      setVenues([]);
      setVenuesError(extractReadableErrorMessage(error, 'Failed to load venues.'));
      toast.error('Failed to load venues');
      console.error(error);
    } finally {
      setVenuesLoading(false);
    }
  }

  const resolveCategorySelection = useCallback(async (categoryId, parentCategories) => {
    const normalizedCategoryId = categoryId?.toString();
    if (!normalizedCategoryId) {
      return { categoryId: '', subCategoryId: '', subCategories: [] };
    }

    const matchingParent = parentCategories.find(
      (category) => category.id?.toString() === normalizedCategoryId
    );
    if (matchingParent) {
      return {
        categoryId: normalizedCategoryId,
        subCategoryId: '',
        subCategories: await loadSubCategories(normalizedCategoryId),
      };
    }

    for (const parentCategory of parentCategories) {
      const nestedSubCategories = await loadSubCategories(parentCategory.id);
      const matchingSubCategory = nestedSubCategories.find(
        (subCategory) => subCategory.id?.toString() === normalizedCategoryId
      );

      if (matchingSubCategory) {
        return {
          categoryId: String(parentCategory.id),
          subCategoryId: normalizedCategoryId,
          subCategories: nestedSubCategories,
        };
      }
    }

    return { categoryId: normalizedCategoryId, subCategoryId: '', subCategories: [] };
  }, [loadSubCategories]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      try {
        const response = await axiosInstance.get('/categories');
        if (!cancelled) {
          setCategories(normalizeCategories(response.data));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error('Failed to load categories');
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    }

    async function fetchVenues() {
      try {
        const response = await axiosInstance.get('/venues');
        if (!cancelled) {
          setVenuesError('');
          setVenues(normalizeVenues(response.data));
        }
      } catch (error) {
        if (!cancelled) {
          setVenues([]);
          setVenuesError(extractReadableErrorMessage(error, 'Failed to load venues.'));
          toast.error('Failed to load venues');
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setVenuesLoading(false);
        }
      }
    }

    fetchCategories();
    fetchVenues();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    Object.entries(hiddenFields).forEach(([field, value]) => {
      setValue(field, value ?? '');
    });
  }, [hiddenFields, setValue]);

  useEffect(() => {
    if (!initialEvent || categoriesLoading) return;

    let cancelled = false;

    async function initializeEditForm() {
      try {
        const categorySelection = await resolveCategorySelection(initialEvent.categoryId, categories);
        if (cancelled) return;

        setSubCategories(categorySelection.subCategories);
        reset({
          title: initialEvent.title || '',
          description: initialEvent.description || '',
          categoryId: categorySelection.categoryId,
          subCategoryId: categorySelection.subCategoryId,
          venue: initialEvent.venue || '',
          startTime: toDateTimeLocalValue(initialEvent.startTime),
          endTime: toDateTimeLocalValue(initialEvent.endTime),
          isMultiDay: Boolean(initialEvent.isMultiDay),
          isPublic: Boolean(initialEvent.isPublic),
          departmentName: initialEvent.departmentName || defaultValues?.departmentName || '',
          imageId: initialEvent.imageId || '',
          ...hiddenFields,
        });
        setSelectedImage(null);
        setImagePreview(initialEvent.imageUrl || null);
      } catch (error) {
        if (!cancelled) {
          toast.error('Failed to prepare the event form');
          console.error(error);
        }
      }
    }

    initializeEditForm();

    return () => {
      cancelled = true;
    };
  }, [categories, categoriesLoading, defaultValues?.departmentName, hiddenFields, initialEvent, reset, resolveCategorySelection]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSubCategories() {
      if (!selectedCategory) {
        setSubCategories([]);
        setSubCategoriesLoading(false);
        setValue('subCategoryId', '');
        return;
      }

      setSubCategoriesLoading(true);

      try {
        const nextSubCategories = await loadSubCategories(selectedCategory);
        if (cancelled) return;

        setSubCategories(nextSubCategories);

        const currentSubCategory = getValues('subCategoryId');
        const stillValid = nextSubCategories.some(
          (subCategory) => subCategory.id?.toString() === currentSubCategory?.toString()
        );

        if (!stillValid) {
          setValue('subCategoryId', '');
        }
      } catch (error) {
        if (!cancelled) {
          setSubCategories([]);
          setValue('subCategoryId', '');
          toast.error('Failed to load sub-categories');
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setSubCategoriesLoading(false);
        }
      }
    }

    fetchSubCategories();

    return () => {
      cancelled = true;
    };
  }, [getValues, loadSubCategories, selectedCategory, setValue]);

  useEffect(() => {
    if (hasVenueConflict) {
      setHasVenueConflict(false);
    }
  }, [hasVenueConflict, watchedVenue, watchedStart, watchedEnd]);

  async function uploadImageIfNeeded() {
    let imageId = initialEvent?.imageId || null;

    if (!selectedImage) {
      return imageId;
    }

    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const uploadResponse = await axiosInstance.post('/files/upload', formData);
      imageId = uploadResponse.data.fileId;
      return imageId;
    } catch (uploadError) {
      const status = uploadError?.response?.status;
      const serverData = uploadError?.response?.data;
      const isTimeout = uploadError?.code === 'ECONNABORTED';
      console.error('Image upload failed', { status, serverData, uploadError });
      toast.error(
        isTimeout
          ? 'Image upload is taking too long. Please try again in a moment.'
          : serverData?.error
            ? `${serverData.error}${serverData.details ? `: ${serverData.details}` : ''}`
            : 'Failed to upload image. Event creation was stopped.'
      );
      uploadError.__imageUploadHandled = true;
      throw uploadError;
    }
  }

  async function onSubmit(formData) {
    setSubmitting(true);

    try {
      const imageId = await uploadImageIfNeeded();
      const payload = {
        ...formData,
        categoryId: formData.subCategoryId || formData.categoryId,
        imageId,
      };

      const result = await submitRequest(payload);
      await onSuccess?.(result);
    } catch (error) {
      if (error?.__imageUploadHandled) {
        console.error(error);
        return;
      }

      if (isVenueConflictError(error)) {
        setHasVenueConflict(true);
        toast.error(conflictMessage);
      } else {
        toast.error(extractReadableErrorMessage(error, generalErrorMessage));
      }
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="serif-heading text-4xl font-bold tracking-tight text-primary md:text-5xl">
            {pageTitle}
          </h1>
          {pageDescription && (
            <p className="mt-3 max-w-3xl text-base leading-7 text-on-surface-variant">{pageDescription}</p>
          )}
        </div>
        {headerActions}
      </section>

      {headerContent}

      <section className="rounded-3xl border border-outline-variant/10 bg-white p-6 shadow-sm md:p-8">
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          {Object.entries(hiddenFields).map(([field]) => (
            <input key={field} type="hidden" {...register(field)} />
          ))}

          <div className="grid gap-6">
            <div className="border-b border-outline-variant/10 pb-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                Event Basics
              </h2>
              <div className="mt-5 grid gap-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-on-surface">Event Title *</label>
                  <input
                    {...register('title')}
                    maxLength={150}
                    className={fieldClass(Boolean(errors.title))}
                    placeholder="Enter a clear event title"
                    type="text"
                  />
                  {errors.title && <p className="mt-2 text-sm font-medium text-red-600">{errors.title.message}</p>}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-on-surface">Description *</label>
                    <span className="text-xs font-medium text-on-surface-variant">{descriptionValue.length}/1000</span>
                  </div>
                  <textarea
                    {...register('description')}
                    maxLength={1000}
                    rows={5}
                    className={fieldClass(Boolean(errors.description), 'resize-y')}
                    placeholder="Describe the event purpose, audience, and expected outcome."
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm font-medium text-red-600">{errors.description.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-b border-outline-variant/10 pb-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                Classification
              </h2>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-on-surface">Category *</label>
                    {categoriesLoading && <Spinner label="Loading categories" />}
                  </div>
                  <select
                    {...register('categoryId')}
                    className={fieldClass(Boolean(errors.categoryId))}
                    disabled={categoriesLoading}
                  >
                    <option value="">{categoriesLoading ? 'Loading categories...' : 'Select a category'}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="mt-2 text-sm font-medium text-red-600">{errors.categoryId.message}</p>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-on-surface">Sub-Category</label>
                    {subCategoriesLoading && <Spinner label="Loading sub-categories" />}
                  </div>
                  <select
                    {...register('subCategoryId')}
                    className={fieldClass(false)}
                    disabled={!selectedCategory || subCategoriesLoading}
                  >
                    <option value="">
                      {!selectedCategory
                        ? 'Select a category first'
                        : subCategoriesLoading
                          ? 'Loading sub-categories...'
                          : subCategories.length
                            ? 'Select a sub-category'
                            : 'No sub-categories available'}
                    </option>
                    {subCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {showDepartmentField && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-on-surface">Department *</label>
                    <input
                      {...register('departmentName')}
                      className={fieldClass(Boolean(errors.departmentName))}
                      disabled={departmentReadOnly}
                      placeholder="Enter department name"
                      type="text"
                    />
                    {(errors.departmentName || departmentHelperText) && (
                      <p
                        className={`mt-2 text-sm ${
                          errors.departmentName ? 'font-medium text-red-600' : 'text-on-surface-variant'
                        }`}
                      >
                        {errors.departmentName?.message || departmentHelperText}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-b border-outline-variant/10 pb-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                Schedule and Venue
              </h2>
              <div className="mt-5 grid gap-6">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-on-surface">Venue *</label>
                    {venuesLoading && <Spinner label="Loading venues" />}
                  </div>
                  <select
                    {...register('venue')}
                    className={fieldClass(Boolean(errors.venue) || hasVenueConflict)}
                    disabled={venuesLoading || venues.length === 0}
                  >
                    <option value="">{venuesLoading ? 'Loading venues...' : 'Select a venue'}</option>
                    {venues.map((venue) => (
                      <option key={venue.id || venue.value} value={venue.value}>
                        {venue.label}
                      </option>
                    ))}
                  </select>
                  {errors.venue && <p className="mt-2 text-sm font-medium text-red-600">{errors.venue.message}</p>}
                  {!errors.venue && venuesError && (
                    <div className="mt-3 rounded-2xl border border-error-container bg-error-container/50 px-4 py-3 text-sm text-on-error-container">
                      <p>{venuesError}</p>
                      <button
                        className="mt-3 inline-flex items-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
                        onClick={() => void retryVenueLoad()}
                        type="button"
                      >
                        Retry loading venues
                      </button>
                    </div>
                  )}
                  {!errors.venue && !venuesError && !venuesLoading && venues.length === 0 && (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      No venues are available yet. Ask an administrator to add one first.
                    </p>
                  )}
                  {!errors.venue && (
                    <p
                      className={`mt-2 text-xs ${
                        hasVenueConflict ? 'text-red-600' : 'text-on-surface-variant'
                      }`}
                    >
                      {hasVenueConflict
                        ? 'Please adjust the venue or event timing before submitting again.'
                        : 'Venue availability is checked automatically.'}
                    </p>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-on-surface">Start Date & Time *</label>
                    <input
                      {...register('startTime')}
                      className={fieldClass(Boolean(errors.startTime) || hasVenueConflict)}
                      type="datetime-local"
                    />
                    {errors.startTime && (
                      <p className="mt-2 text-sm font-medium text-red-600">{errors.startTime.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-on-surface">End Date & Time *</label>
                    <input
                      {...register('endTime')}
                      className={fieldClass(Boolean(errors.endTime) || hasVenueConflict)}
                      type="datetime-local"
                    />
                    {errors.endTime && (
                      <p className="mt-2 text-sm font-medium text-red-600">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>

                <label className="inline-flex items-start gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                  <input {...register('isMultiDay')} className="mt-1 h-4 w-4 accent-primary" type="checkbox" />
                  <span>
                    <span className="block text-sm font-semibold text-on-surface">Multi-day Event</span>
                    <span className="mt-1 block text-xs text-on-surface-variant">
                      End date can be multiple days after the start date.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="border-b border-outline-variant/10 pb-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                Media and Visibility
              </h2>
              <div className="mt-5 grid gap-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-on-surface">Event Image</label>
                  <div
                    className="rounded-[1.5rem] border border-dashed border-outline-variant/40 bg-surface-container-low p-5 transition hover:border-primary/35 hover:bg-primary/5"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      processSelectedFile(event.dataTransfer?.files?.[0]);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => processSelectedFile(event.target.files?.[0])}
                      type="file"
                    />
                    <button
                      className="w-full text-left"
                      onClick={(event) => {
                        event.preventDefault();
                        fileInputRef.current?.click();
                      }}
                      type="button"
                    >
                      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            Drag and drop an image here, or click to upload
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">Accepted: images only, maximum 5MB.</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm">
                          Choose File
                        </span>
                      </div>
                    </button>
                    {selectedImage && (
                      <p className="mt-3 text-xs font-medium text-on-surface-variant">Selected: {selectedImage.name}</p>
                    )}
                    {imageError && <p className="mt-3 text-sm font-medium text-red-600">{imageError}</p>}
                    {imagePreview && (
                      <img
                        alt="Event preview"
                        className="mt-4 h-56 w-full rounded-[1.5rem] object-cover ring-1 ring-slate-200"
                        src={imagePreview}
                      />
                    )}
                  </div>
                </div>

                <label className="inline-flex items-start gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                  <input {...register('isPublic')} className="mt-1 h-4 w-4 accent-primary" type="checkbox" />
                  <span>
                    <span className="block text-sm font-semibold text-on-surface">
                      Open to External Participants
                    </span>
                    <span className="mt-1 block text-xs text-on-surface-variant">
                      People outside the faculty can register for this event.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {approvalContent}

          <div className="flex flex-col gap-3 border-t border-outline-variant/10 pt-6 sm:flex-row sm:justify-end">
            <button
              className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
              onClick={onCancel}
              type="button"
            >
              {cancelLabel}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

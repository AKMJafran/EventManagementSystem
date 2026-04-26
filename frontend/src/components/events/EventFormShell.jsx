import React, { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import EventImage from '../EventImage';
import {
  extractReadableErrorMessage,
  getCurrentDateTimeLocalValue,
  isVenueConflictError,
  normalizeCategories,
  normalizeVenues,
  toDateTimeLocalValue,
} from './eventFormShared';
import { resolveAssetUrl } from '../../utils/assetUrl';

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
  const [imagePreview, setImagePreview] = useState(resolveAssetUrl(initialEvent?.imageUrl) || null);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasVenueConflict, setHasVenueConflict] = useState(false);
  const [venueSearch, setVenueSearch] = useState('');
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    setValue,
    getValues,
    clearErrors,
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
  const deferredVenueSearch = useDeferredValue(venueSearch);

  const filteredVenues = venues.filter((venue) => {
    const query = deferredVenueSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return (
      venue.name?.toLowerCase().includes(query) ||
      venue.location?.toLowerCase().includes(query) ||
      String(venue.capacity || '').includes(query)
    );
  });

  const selectedVenueOption = venues.find((venue) => venue.value === watchedVenue);

  function processSelectedFile(file) {
    if (!file) {
      setSelectedImage(null);
      setImagePreview(resolveAssetUrl(initialEvent?.imageUrl) || null);
      setImageError('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedImage(null);
      setImagePreview(resolveAssetUrl(initialEvent?.imageUrl) || null);
      setImageError('Please select a valid image file.');
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelectedImage(null);
      setImagePreview(resolveAssetUrl(initialEvent?.imageUrl) || null);
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

  async function loadVenues() {
    setVenuesLoading(true);
    setVenuesError('');

    try {
      const hasSchedule =
        watchedStart &&
        watchedEnd &&
        new Date(watchedEnd).getTime() > new Date(watchedStart).getTime();
      const params = hasSchedule
        ? { startTime: watchedStart, endTime: watchedEnd, excludeEventId: initialEvent?.id || undefined }
        : {};
      const response = await axiosInstance.get('/venues/availability', { params });
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

  async function retryVenueLoad() {
    await loadVenues();
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

    fetchCategories();

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
        setImagePreview(resolveAssetUrl(initialEvent.imageUrl) || null);
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadVenues();
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [initialEvent?.id, watchedEnd, watchedStart]);

  useEffect(() => {
    if (!watchedVenue) {
      return;
    }

    const matchingVenue = venues.find((venue) => venue.value === watchedVenue);
    if (matchingVenue) {
      clearErrors('venue');
      return;
    }

    setError('venue', {
      type: 'validate',
      message: 'Please select a valid venue from the approved venue list.',
    });
  }, [clearErrors, setError, venues, watchedVenue]);

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
    const selectedVenue = venues.find((venue) => venue.value === formData.venue);
    if (!selectedVenue) {
      setError('venue', {
        type: 'validate',
        message: 'Please select a valid venue from the approved venue list.',
      });
      return;
    }

    if (!selectedVenue.active) {
      setError('venue', {
        type: 'validate',
        message: 'This venue is inactive and cannot be booked.',
      });
      return;
    }

    if (watchedStart && watchedEnd && selectedVenue.status === 'RESERVED') {
      setError('venue', {
        type: 'validate',
        message: selectedVenue.reservedEventTitle
          ? `"${selectedVenue.name}" is already reserved for "${selectedVenue.reservedEventTitle}" during this time.`
          : 'This venue is already reserved during the selected time.',
      });
      return;
    }

    if (!initialEvent && new Date(formData.startTime) < new Date()) {
      setError('startTime', {
        type: 'validate',
        message: 'Start time cannot be in the past.',
      });
      return;
    }

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
          <input type="hidden" {...register('venue')} />
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
                  <div className={`rounded-[1.75rem] border bg-surface-container-low/40 p-4 ${Boolean(errors.venue) || hasVenueConflict ? 'border-error/50' : 'border-outline-variant/20'}`}>
                    <label className="relative block">
                      <span className="sr-only">Search venues</span>
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                        search
                      </span>
                      <input
                        type="text"
                        value={venueSearch}
                        onChange={(event) => setVenueSearch(event.target.value)}
                        className="w-full rounded-2xl border border-outline-variant/25 bg-white py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                        placeholder="Search venues by name, location, or capacity"
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedVenueOption ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {selectedVenueOption.name}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-on-surface-variant ring-1 ring-outline-variant/15">
                          Select one approved venue to continue
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                      {filteredVenues.map((venue) => {
                        const isSelected = watchedVenue === venue.value;
                        const isDisabled =
                          !venue.active || (Boolean(watchedStart && watchedEnd) && venue.status === 'RESERVED');

                        return (
                          <button
                            key={venue.id || venue.value}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              setValue('venue', venue.value, { shouldDirty: true, shouldValidate: true });
                              clearErrors('venue');
                              setHasVenueConflict(false);
                            }}
                            className={[
                              'rounded-[1.5rem] border px-4 py-4 text-left transition',
                              isSelected
                                ? 'border-primary bg-primary/8 shadow-sm'
                                : 'border-outline-variant/20 bg-white hover:border-primary/30 hover:bg-primary/5',
                              isDisabled ? 'cursor-not-allowed opacity-60 hover:border-outline-variant/20 hover:bg-white' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-on-surface">{venue.name}</p>
                                <p className="mt-1 text-xs text-on-surface-variant">{venue.location}</p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                  venue.status === 'INACTIVE'
                                    ? 'bg-slate-200 text-slate-700'
                                    : venue.status === 'RESERVED'
                                      ? 'bg-error-container text-on-error-container'
                                      : 'bg-secondary-container text-on-secondary-container'
                                }`}
                              >
                                {venue.status}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                              <span className="rounded-full bg-surface-container-low px-3 py-1">
                                Capacity: {venue.capacity || 'N/A'}
                              </span>
                            </div>
                            {venue.status === 'RESERVED' && venue.reservedEventTitle && (
                              <p className="mt-3 text-xs font-medium text-error">
                                Reserved for: {venue.reservedEventTitle}
                              </p>
                            )}
                            {venue.status === 'INACTIVE' && (
                              <p className="mt-3 text-xs font-medium text-slate-600">
                                This venue is inactive and cannot be booked right now.
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                  {!errors.venue && !venuesError && !venuesLoading && venues.length > 0 && filteredVenues.length === 0 && (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      No venues match the current search. Try a different keyword.
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
                        : watchedStart && watchedEnd
                          ? 'Venue availability is checked automatically for the selected schedule.'
                          : 'Select the schedule to see live venue reservation status.'}
                    </p>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-on-surface">Start Date & Time *</label>
                    <input
                      {...register('startTime')}
                      className={fieldClass(Boolean(errors.startTime) || hasVenueConflict)}
                      min={!initialEvent ? getCurrentDateTimeLocalValue() : undefined}
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
                      min={watchedStart || (!initialEvent ? getCurrentDateTimeLocalValue() : undefined)}
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
                      <EventImage
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

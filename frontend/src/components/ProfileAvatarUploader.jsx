import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import ProfileAvatar from './ProfileAvatar';

export default function ProfileAvatarUploader({
  user,
  title = 'Change profile picture',
  sizeClassName = 'h-10 w-10',
  className = '',
}) {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, []);

  const replacePreviewUrl = (nextUrl) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should not exceed 5MB.');
      return;
    }

    replacePreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    const toastId = toast.loading('Updating profile picture...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axiosInstance.post('/files/upload', formData);
      const saveResponse = await axiosInstance.patch('/users/me/profile-picture', {
        fileId: uploadResponse.data?.fileId,
      });

      updateUserProfile({
        profilePictureUrl:
          saveResponse.data?.profilePictureUrl ||
          uploadResponse.data?.imageUrl ||
          uploadResponse.data?.fileId ||
          null,
      });

      replacePreviewUrl(null);
      toast.success('Profile picture updated.', { id: toastId });
    } catch (error) {
      replacePreviewUrl(null);
      toast.error(error?.response?.data?.message || 'Failed to update profile picture.', { id: toastId });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'group relative rounded-full transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        title={title}
        aria-label={title}
      >
        <ProfileAvatar
          src={previewUrl || user?.profilePictureUrl}
          name={user?.name}
          sizeClassName={sizeClassName}
        />
        <span
          className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-full text-white transition ${
            uploading ? 'bg-slate-950/35' : 'bg-slate-950/0 group-hover:bg-slate-950/35'
          }`}
        >
          <span className={`material-symbols-outlined text-[18px] transition ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {uploading ? 'progress_activity' : 'edit'}
          </span>
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleFileChange}
      />
    </>
  );
}

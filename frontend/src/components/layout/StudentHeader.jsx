import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import NotificationBell from '../NotificationBell';

export default function StudentHeader({ user }) {
  const fileInputRef = useRef(null);
  const location = useLocation();

  const handleProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Optional: add small validation for file type and size
    if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB Limit
        toast.error('File size should not exceed 5MB');
        return;
    }

    const toastId = toast.loading('Uploading profile picture...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await axiosInstance.post('/files/upload', formData);
      
      const fileId = uploadRes.data.fileId;
      
      await axiosInstance.patch('/users/me/profile-picture', { fileId });
      
      toast.success('Profile picture updated! Please log in again to see changes.', { id: toastId });
      // In a more complex app, we would directly update AuthContext state here or refetch. 
      // Telling the user to log in again is a simpler approach to refresh JWT token claims.
    } catch (error) {
      toast.error(
        error?.code === 'ECONNABORTED'
          ? 'Profile picture upload is taking too long. Please try again.'
          : 'Failed to update profile picture',
        { id: toastId }
      );
      console.error(error);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,101,101,0.05)] pl-72">
      <div className="flex justify-between items-center px-12 h-20 w-full">
        <div className="flex items-center gap-12">
          <span className="text-2xl font-serif italic text-teal-800 dark:text-teal-200">Scholastic Ledger</span>
        </div>
        
        <div className="flex items-center gap-6">
          <NotificationBell enableStudentUiFixes key={location.pathname} />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface leading-none">{user?.name || 'Student'}</p>
                <p className="text-[10px] text-on-surface-variant">Student</p>
              </div>
              <div 
                className="w-10 h-10 rounded-full bg-teal-100 overflow-hidden flex items-center justify-center text-teal-800 font-bold cursor-pointer relative group"
                onClick={handleProfileClick}
                title="Change Profile Picture"
              >
                {user?.profilePictureUrl ? (
                  <img 
                    src={user.profilePictureUrl} 
                    alt="Student Portrait" 
                    className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" 
                  />
                ) : (
                  <span className="group-hover:opacity-50 transition-opacity">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/40">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/jpg" 
                onChange={handleFileChange} 
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

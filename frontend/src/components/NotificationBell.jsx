import React, { useEffect, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import useAuthStore from '../context/AuthContext';
import ModalPortal from './ui/ModalPortal';

const PREVIEW_LIMIT = 82;

const truncateText = (value, limit = PREVIEW_LIMIT) => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit).trim()}...` : value;
};

export default function NotificationBell({ enableStudentUiFixes = false }) {
  const { isAuthenticated, authLoaded, user } = useAuthStore();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = async (showError = false) => {
    if (!authLoaded || !isAuthenticated) {
      return;
    }

    try {
      const [countRes, listRes] = await Promise.all([
        axiosInstance.get('/notifications/count'),
        axiosInstance.get('/notifications'),
      ]);

      setCount(countRes.data.unreadCount || 0);
      setNotifications((listRes.data || []).slice(0, 5));
    } catch (error) {
      if (showError) {
        toast.error('Failed to load notifications');
      }
      console.error(error);
    }
  };

  useEffect(() => {
    if (!authLoaded || !isAuthenticated) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const [countRes, listRes] = await Promise.all([
          axiosInstance.get('/notifications/count'),
          axiosInstance.get('/notifications'),
        ]);

        if (cancelled) return;

        setCount(countRes.data.unreadCount || 0);
        setNotifications((listRes.data || []).slice(0, 5));
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };

    run();
    const interval = setInterval(run, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authLoaded, isAuthenticated]);

  useEffect(() => {
    const handleClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClick);
    }

    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!enableStudentUiFixes || !selectedNotification) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [enableStudentUiFixes, selectedNotification]);

  const updateNotificationReadState = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
    setSelectedNotification((current) =>
      current && current.id === id ? { ...current, isRead: true } : current
    );
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await axiosInstance.patch(`/notifications/${notification.id}/read`);
        updateNotificationReadState(notification.id);
        setCount((current) => Math.max(0, current - 1));
      }

      setOpen(false);
      setSelectedNotification({ ...notification, isRead: true });
    } catch (error) {
      toast.error('Failed to open notification');
      console.error(error);
    }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.patch('/notifications/read-all');
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true }))
      );
      setSelectedNotification((current) =>
        current ? { ...current, isRead: true } : current
      );
      setCount(0);
      await fetchNotifications();
    } catch (error) {
      toast.error('Failed to mark all as read');
      console.error(error);
    }
  };

  const toggleDropdown = async () => {
    const nextState = !open;

    if (enableStudentUiFixes && nextState) {
      setSelectedNotification(null);
    }

    setOpen(nextState);

    if (nextState) {
      await fetchNotifications(true);
    }
  };

  const notificationDetailModal = selectedNotification && (
    <div
      className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      onMouseDown={enableStudentUiFixes ? () => setSelectedNotification(null) : undefined}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">
              {selectedNotification.type?.replace('_', ' ') || 'Notification'}
            </p>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mt-2">
              {selectedNotification.title || 'Notification'}
            </h2>
          </div>
          <button
            onClick={() => setSelectedNotification(null)}
            className="text-slate-500 hover:text-slate-900"
            type="button"
            aria-label="Close notification details"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-slate-500">Sender / Source</p>
              <p className="font-semibold text-slate-900 mt-1">System Administrator</p>
              <p className="text-slate-600">Automated Notification</p>
              <p className="text-xs text-slate-400 mt-1">SYSTEM GENERATED</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-slate-500">Delivery State</p>
              <p className="font-semibold text-slate-900 mt-1">{selectedNotification.isRead ? 'Read' : 'New'}</p>
              <p className="text-slate-600">{new Date(selectedNotification.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Full Message</p>
            <p className="text-slate-700 leading-7 whitespace-pre-wrap">
              {selectedNotification.message}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedNotification(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button className="relative" onClick={toggleDropdown} type="button">
          <FaBell className="text-2xl text-gray-700" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center gap-4">
              <div>
                <span className="font-semibold text-slate-900">Notifications</span>
                <p className="text-xs text-slate-500">Latest updates for your account</p>
              </div>
              <button
                className="text-xs text-blue-600 hover:underline disabled:text-slate-400"
                onClick={markAllRead}
                disabled={notifications.length === 0}
                type="button"
              >
                Mark all read
              </button>
            </div>

            <ul className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="p-6 text-gray-500 text-center">No notifications</li>
              ) : (
                notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`px-4 py-4 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors ${
                      notification.isRead ? 'bg-white' : 'bg-blue-50/70'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {notification.title || 'Notification'}
                            </p>
                            <p className="text-sm text-slate-600 mt-1">
                              {truncateText(notification.message)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <span className="mt-1 w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0" />
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                          <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                          <span className="uppercase tracking-wide">{notification.type?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>

            {user?.role === 'ADMIN' && (
              <div className="px-4 py-3 border-t bg-slate-50">
                <Link
                  to="/admin/notifications"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-teal-700 hover:text-teal-900"
                >
                  Open notification manager
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedNotification && (
        enableStudentUiFixes ? <ModalPortal>{notificationDetailModal}</ModalPortal> : notificationDetailModal
      )}
    </>
  );
}

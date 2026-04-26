import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import ModalPortal from './ui/ModalPortal';

const PREVIEW_LIMIT = 82;

function truncateText(value, limit = PREVIEW_LIMIT) {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit).trim()}...` : value;
}

function buildDropdownPosition(anchorRect) {
  const viewportPadding = 16;
  const preferredWidth = Math.min(420, window.innerWidth - viewportPadding * 2);
  const availableRight = window.innerWidth - viewportPadding;
  const left = Math.max(
    viewportPadding,
    Math.min(anchorRect.right - preferredWidth, availableRight - preferredWidth)
  );
  const top = Math.min(anchorRect.bottom + 12, window.innerHeight - 120);

  return {
    left,
    top,
    width: preferredWidth,
  };
}

export default function NotificationBell() {
  const { isAuthenticated, authLoaded, user } = useAuthStore();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const triggerRef = useRef(null);
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
    if (!open || !triggerRef.current) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setDropdownStyle(buildDropdownPosition(rect));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;
      if (trigger?.contains(event.target) || dropdown?.contains(event.target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!selectedNotification) {
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
  }, [selectedNotification]);

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
    setOpen(nextState);

    if (nextState) {
      await fetchNotifications(true);
    }
  };

  const dropdown = open && dropdownStyle && (
    <ModalPortal>
      <div className="fixed inset-0 z-[95]">
        <div
          ref={dropdownRef}
          className="absolute max-h-[min(32rem,calc(100vh-7rem))] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-950/5"
          style={{
            left: `${dropdownStyle.left}px`,
            top: `${dropdownStyle.top}px`,
            width: `${dropdownStyle.width}px`,
          }}
        >
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-semibold text-slate-900">Notifications</span>
                <p className="mt-1 text-xs text-slate-500">Latest updates for your account</p>
              </div>
              <button
                className="text-xs font-semibold text-primary hover:underline disabled:text-slate-400"
                onClick={markAllRead}
                disabled={notifications.length === 0}
                type="button"
              >
                Mark all read
              </button>
            </div>
          </div>

          <ul className="max-h-[22rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="p-6 text-center text-sm text-slate-500">No notifications</li>
            ) : (
              notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`cursor-pointer border-b border-slate-100 px-4 py-4 transition-colors last:border-b-0 hover:bg-slate-50 ${
                    notification.isRead ? 'bg-white' : 'bg-blue-50/70'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {notification.title || 'Notification'}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {truncateText(notification.message)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                        <span className="uppercase tracking-[0.18em]">
                          {notification.type?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          {user?.role === 'ADMIN' && (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
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
      </div>
    </ModalPortal>
  );

  const notificationTypeLabel = useMemo(
    () => selectedNotification?.type?.replaceAll('_', ' ') || 'Notification',
    [selectedNotification]
  );

  return (
    <>
      <button
        ref={triggerRef}
        className="relative"
        onClick={() => void toggleDropdown()}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open notifications"
      >
        <FaBell className="text-2xl text-gray-700" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {dropdown}

      {selectedNotification && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onMouseDown={() => setSelectedNotification(null)}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {notificationTypeLabel}
                  </p>
                  <h2 className="mt-2 text-3xl font-serif font-bold text-slate-900">
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

              <div className="space-y-5 overflow-y-auto px-6 py-6">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-slate-500">Sender / Source</p>
                    <p className="mt-1 font-semibold text-slate-900">System Administrator</p>
                    <p className="text-slate-600">Automated Notification</p>
                    <p className="mt-1 text-xs text-slate-400">SYSTEM GENERATED</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-slate-500">Delivery State</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedNotification.isRead ? 'Read' : 'New'}
                    </p>
                    <p className="text-slate-600">
                      {new Date(selectedNotification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Full Message</p>
                  <p className="whitespace-pre-wrap leading-7 text-slate-700">
                    {selectedNotification.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}

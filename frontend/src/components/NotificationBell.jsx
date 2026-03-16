import React, { useEffect, useState, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count and latest notifications
  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        axiosInstance.get('/notifications/count'),
        axiosInstance.get('/notifications'),
      ]);
      setCount(countRes.data);
      setNotifications(listRes.data.slice(0, 5));
    } catch (err) {
      // Optionally toast error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAsRead = async (id) => {
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button className="relative" onClick={() => setOpen((v) => !v)}>
        <FaBell className="text-2xl text-gray-700" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg z-50">
          <div className="p-3 border-b flex justify-between items-center">
            <span className="font-semibold">Notifications</span>
            <button className="text-xs text-blue-600 hover:underline" onClick={markAllRead}>Mark all read</button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="p-4 text-gray-500 text-center">No notifications</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${n.isRead ? '' : 'bg-blue-50'}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex-1">
                    <div className="text-sm">{n.message}</div>
                    <div className="text-xs text-gray-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</div>
                  </div>
                  {!n.isRead && <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full mt-2" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

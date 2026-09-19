// Keep your existing NotificationToast.tsx - it works perfectly as is
import React, { useEffect } from 'react';
import { Notification } from '../types';

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onDismiss }) => {
  useEffect(() => {
    notifications.forEach(notification => {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, 4000);
      return () => clearTimeout(timer);
    });
  }, [notifications, onDismiss]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div key={notification.id}
          className={`p-4 rounded-lg shadow-lg flex items-start gap-3 animate-slideIn ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
          <span className="text-xl">
            {notification.type === 'success' ? '✓' :
             notification.type === 'error' ? '✗' :
             notification.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <p className="flex-1 text-sm">{notification.message}</p>
          <button onClick={() => onDismiss(notification.id)} className="text-white/80 hover:text-white">×</button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
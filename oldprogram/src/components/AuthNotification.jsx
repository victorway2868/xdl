import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * Authentication notification component
 *
 * @param {Object} props Component props
 * @param {string} props.message Notification message
 * @param {boolean} props.isVisible Whether the notification is visible
 * @param {Function} props.onClose Function to call when notification is closed
 * @returns {JSX.Element|null} Notification component or null if not visible
 */
const AuthNotification = ({ message, isVisible, onClose }) => {
  const [isShown, setIsShown] = useState(false);

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      setIsShown(true);

      // Auto-hide after 20 seconds if not closed manually
      const timer = setTimeout(() => {
        setIsShown(false);
        if (onClose) onClose();
      }, 20000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  // Animation classes
  const baseClasses = "fixed inset-0 flex items-center justify-center z-50";
  const overlayClasses = "absolute inset-0 bg-black/50";
  const notificationClasses = "bg-slate-700 text-white rounded-lg p-3 shadow-lg flex items-center gap-2 transition-all duration-300 max-w-xs relative";
  const visibilityClasses = isShown
    ? "opacity-100 scale-100"
    : "opacity-0 scale-95 pointer-events-none";

  if (!isVisible && !isShown) return null;

  return (
    <div className={`${baseClasses} ${visibilityClasses}`}>
      <div className={overlayClasses} onClick={() => {
        setIsShown(false);
        if (onClose) onClose();
      }}></div>
      <div className={`${notificationClasses} ${visibilityClasses}`}>
        <AlertCircle className="h-4 w-4 flex-shrink-0 text-slate-300" />
        <div className="flex-1">
          <p className="text-sm text-slate-200">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsShown(false);
            if (onClose) onClose();
          }}
          className="text-slate-400 hover:text-white rounded-full p-1 hover:bg-slate-600 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default AuthNotification;

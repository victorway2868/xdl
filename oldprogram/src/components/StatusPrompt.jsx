import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * Status prompt component for displaying status messages
 *
 * @param {Object} props Component props
 * @param {string} props.message Notification message
 * @param {boolean} props.isVisible Whether the notification is visible
 * @param {Function} props.onClose Function to call when notification is closed
 * @param {string} props.type Type of status message ('warning', 'info', 'error')
 * @returns {JSX.Element|null} Notification component or null if not visible
 */
const StatusPrompt = ({ message, isVisible, onClose, type = 'info' }) => {
  const [isShown, setIsShown] = useState(false);

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      setIsShown(true);
    } else {
      setIsShown(false);
    }
  }, [isVisible]);

  // Animation classes
  const baseClasses = "fixed inset-0 flex items-center justify-center z-50";
  const overlayClasses = "absolute inset-0 bg-black/50";
  
  // Determine color based on type
  let bgColor = "bg-blue-700";
  let textColor = "text-white";
  
  if (type === 'warning') {
    bgColor = "bg-yellow-600";
  } else if (type === 'error') {
    bgColor = "bg-red-600";
  }
  
  const notificationClasses = `${bgColor} ${textColor} rounded-lg p-4 shadow-lg flex items-center gap-3 transition-all duration-300 max-w-md relative`;
  const visibilityClasses = isShown
    ? "opacity-100 scale-100"
    : "opacity-0 scale-95 pointer-events-none";

  if (!isVisible && !isShown) return null;

  return (
    <div className={`${baseClasses} ${visibilityClasses}`}>
      <div className={overlayClasses} onClick={() => {
        if (onClose) onClose();
      }}></div>
      <div className={`${notificationClasses} ${visibilityClasses}`}>
        <AlertCircle className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="flex-1">
          <p className="text-base text-white">{message}</p>
        </div>
        <button
          onClick={() => {
            if (onClose) onClose();
          }}
          className="text-white/80 hover:text-white rounded-full p-1 hover:bg-white/20 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default StatusPrompt;

/**
 * TOAST COMPONENT
 * ================
 * 
 * Visual component for displaying toast notifications.
 * Appears in top-right corner with smooth slide-in animation.
 * 
 * FEATURES:
 * - Color-coded by type (green=success, red=error, yellow=warning, blue=info)
 * - Progress bar showing time remaining
 * - Close button for manual dismissal
 * - Slide-in from right animation
 * - Fade-out on dismiss
 */

import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast, type Toast as ToastType } from '../contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
}

export default function Toast({ toast }: ToastProps) {
  const { removeToast } = useToast();
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / (toast.duration ?? 5000)) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Match animation duration
  };

  // Icon and color based on toast type
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-500',
      borderColor: 'border-green-600',
      textColor: 'text-green-50',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-500',
      borderColor: 'border-red-600',
      textColor: 'text-red-50',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-600',
      textColor: 'text-yellow-50',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-600',
      textColor: 'text-blue-50',
    },
  };

  const { icon: Icon, bgColor, borderColor, textColor } = config[toast.type];

  return (
    <div
      className={`
        ${bgColor} ${borderColor} ${textColor}
        border-l-4 rounded-lg shadow-lg overflow-hidden
        min-w-[320px] max-w-105
        transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      style={{
        animation: isExiting ? 'none' : 'slideIn 0.3s ease-out',
      }}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />

        {/* Message */}
        <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="h-1 bg-black/20">
          <div
            className="h-full bg-white/40 transition-all duration-50 linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}


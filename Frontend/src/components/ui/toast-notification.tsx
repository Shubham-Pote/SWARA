import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  onClose: () => void;
}

export function ToastNotification({ title, description, variant = 'default', onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 w-full max-w-sm transform transition-all duration-300 ease-in-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div
        className={cn(
          "rounded-lg border p-4 shadow-lg",
          variant === 'destructive'
            ? "border-red-500 bg-red-950 text-red-100"
            : "border-gray-600 bg-gray-800 text-white"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            {description && (
              <p className="mt-1 text-sm opacity-90">{description}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="ml-3 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; title: string; description?: string; variant?: 'default' | 'destructive' }>;
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ top: `${16 + index * 80}px` }} className="fixed right-4 z-50">
          <ToastNotification
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
}
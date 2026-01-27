/**
 * TOAST CONTAINER
 * ================
 * 
 * Renders all active toasts in a fixed container.
 * Positioned at top-right of screen.
 * Stacks multiple toasts vertically.
 */

import { useToast } from '../contexts/ToastContext';
import Toast from './Toast';

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

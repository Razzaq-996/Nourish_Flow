/**
 * Alert banner component.
 * type: 'error' | 'success' | 'warning' | 'info'
 */
import { X } from 'lucide-react';

const styles = {
  error:   'bg-red-900/40 border-red-700 text-red-300',
  success: 'bg-brand-900/40 border-brand-700 text-brand-300',
  warning: 'bg-yellow-900/40 border-yellow-700 text-yellow-300',
  info:    'bg-blue-900/40 border-blue-700 text-blue-300',
};

export default function Alert({ type = 'info', message, onClose, className = '' }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg border text-sm animate-fade-in ${styles[type]} ${className}`}
    >
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

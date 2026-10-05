/**
 * Alert banner component.
 * type: 'error' | 'success' | 'warning' | 'info'
 */
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const styles = {
  error:   'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200',
  warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-200',
  info:    'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 text-sky-800 dark:text-sky-200',
};

const icons = {
  error:   AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info:    Info,
};

export default function Alert({ type = 'info', message, onClose, className = '' }) {
  if (!message) return null;
  const Icon = icons[type] || Info;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm animate-fade-in shadow-xs ${styles[type]} ${className}`}
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <span className="flex-1 font-medium leading-relaxed">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 opacity-70 hover:opacity-100 p-0.5 transition-opacity"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

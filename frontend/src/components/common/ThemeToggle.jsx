import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light mode', icon: Sun },
    { value: 'system', label: 'System theme', icon: Monitor },
    { value: 'dark', label: 'Dark mode', icon: Moon },
  ];

  return (
    <div
      role="group"
      aria-label="Theme selector"
      className={`inline-flex items-center p-0.5 rounded-lg border border-surface-border bg-surface-muted/80 backdrop-blur-xs ${className}`}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            title={label}
            className={`p-1.5 rounded-md transition-all duration-150 flex items-center justify-center ${
              isActive
                ? 'bg-surface-card text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

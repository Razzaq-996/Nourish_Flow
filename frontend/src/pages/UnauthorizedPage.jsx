/** Unauthorized (403) page — shown when a user lacks the required role */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDashboardPath } from '../utils/roleRouter';
import { ShieldAlert } from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 relative transition-colors">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="text-center animate-fade-in max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-bold text-content-primary tracking-tight mb-2">Access Denied</h1>
        <p className="text-content-muted mb-6 text-sm leading-relaxed">
          Your account role does not have authorization to view this operational sector.
        </p>
        <button
          onClick={() => navigate(getDashboardPath(user?.role))}
          className="btn-primary"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

/** Unauthorized (403) page — shown when a user lacks the required role */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDashboardPath } from '../utils/roleRouter';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center animate-fade-in">
        <ShieldAlert size={56} className="text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-6">
          You don&apos;t have permission to view this page.
        </p>
        <button
          onClick={() => navigate(getDashboardPath(user?.role))}
          className="btn-primary"
        >
          Back to my dashboard
        </button>
      </div>
    </div>
  );
}

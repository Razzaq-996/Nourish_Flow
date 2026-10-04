/**
 * AppHeader — top bar shown on all authenticated pages.
 * Shows the current page title (via React Router location), breadcrumb hints,
 * and a user avatar / role pill.
 */
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { humanizeSnake } from '../../utils/formatters';

function deriveTitle(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  return humanizeSnake(last ?? 'Dashboard');
}

export default function AppHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const title = deriveTitle(location.pathname);

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-surface-border bg-surface-card/80 backdrop-blur-sm">
      <h1 className="text-base font-semibold text-slate-100">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-slate-300 leading-none">{user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-sm font-semibold text-brand-100 select-none">
          {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  );
}

/**
 * AppHeader — top navigation bar shown on all authenticated pages.
 * Shows mobile drawer button, route title, live network status pill,
 * light/dark/system theme toggle, and user info pill.
 */
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { humanizeSnake } from '../../utils/formatters';
import ThemeToggle from '../common/ThemeToggle';
import ProfileDropdown from './ProfileDropdown';

function deriveTitle(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  return humanizeSnake(last ?? 'Dashboard');
}

export default function AppHeader({ onOpenSidebar }) {
  const { user } = useAuth();
  const location = useLocation();
  const title = deriveTitle(location.pathname);

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-30 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} />
        </button>

        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400">Rescue Network</span>
            <span>/</span>
            <span className="capitalize">{user?.role?.toLowerCase() || 'portal'}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-slate-50 tracking-tight leading-none mt-0.5">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Operational Live Status indicator (Professional touch like Zomato/Swiggy order central) */}
        <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="tracking-wide text-[11px]">Dispatch Active</span>
        </div>

        {/* Light / Dark / System Theme Switcher */}
        <ThemeToggle />

        {/* Interactive User Profile Menu */}
        <div className="pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}

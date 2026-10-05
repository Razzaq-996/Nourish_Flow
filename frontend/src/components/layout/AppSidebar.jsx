/**
 * AppSidebar — the persistent left navigation sidebar.
 * Supports desktop sticky layout and mobile slide-out drawer.
 * Renders role-appropriate nav items and a sign-out action.
 */
import { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import { humanizeSnake } from '../../utils/formatters';
import {
  LayoutDashboard,
  HandHeart,
  ClipboardList,
  Truck,
  Building2,
  ShieldCheck,
  LogOut,
  Leaf,
  X,
  Sparkles,
} from 'lucide-react';

function navForRole(role) {
  switch (role) {
    case USER_ROLES.DONOR:
      return [
        { to: '/donor/dashboard',  label: 'Overview',     icon: LayoutDashboard },
        { to: '/donor/donations',  label: 'My Donations', icon: HandHeart },
      ];
    case USER_ROLES.ORG_ADMIN:
      return [
        { to: '/org/dashboard',   label: 'Overview',      icon: LayoutDashboard },
        { to: '/org/donations',   label: 'Donations Hub', icon: HandHeart },
        { to: '/org/requests',    label: 'Food Requests', icon: ClipboardList },
        { to: '/org/assignments', label: 'Assignments',   icon: Truck },
        { to: '/org/profile',     label: 'Organization',  icon: Building2 },
      ];
    case USER_ROLES.VOLUNTEER:
      return [
        { to: '/volunteer/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
        { to: '/volunteer/assignments', label: 'My Missions',  icon: Truck },
      ];
    case USER_ROLES.ADMIN:
      return [
        { to: '/admin/dashboard',      label: 'Command Center', icon: LayoutDashboard },
        { to: '/admin/verifications',  label: 'Verifications',  icon: ShieldCheck },
        { to: '/admin/donations',      label: 'All Donations',  icon: HandHeart },
        { to: '/admin/requests',       label: 'Food Requests',  icon: ClipboardList },
        { to: '/admin/assignments',    label: 'Dispatches',     icon: Truck },
      ];
    default:
      return [];
  }
}

export default function AppSidebar({ mobileOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = navForRole(user?.role);

  // Close mobile drawer on route change
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname, onClose]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-colors select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-emerald-800 flex items-center justify-center shadow-md shadow-emerald-900/10">
            <Leaf size={20} className="text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold font-display text-slate-900 dark:text-slate-50 tracking-tight leading-none">
                FoodRescue
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                PRO
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block tracking-wide">
              Operations Hub
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-1.5">
        <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>Main Menu</span>
          <Sparkles size={11} className="text-emerald-500/70" />
        </div>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to.endsWith('dashboard')}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200/90 dark:border-emerald-800/80 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} className="shrink-0 transition-transform group-hover:scale-105" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer Card */}
      <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2.5 bg-slate-50/70 dark:bg-slate-950/40">
        <NavLink
          to="/profile"
          title="Click to view and edit account profile"
          className={({ isActive }) =>
            `p-3 rounded-xl border shadow-xs text-left transition-all duration-150 group cursor-pointer block ${
              isActive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700'
                : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700'
            }`
          }
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {user?.name}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {humanizeSnake(user?.role || '')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1 flex items-center justify-between">
            <span>{user?.email}</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold group-hover:underline">View Profile</span>
          </p>
        </NavLink>

        <button
          id="sidebar-logout-btn"
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
        >
          <LogOut size={15} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-20 shadow-xs">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-fade-in">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

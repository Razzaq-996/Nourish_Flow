/**
 * AppSidebar — the persistent left navigation sidebar.
 * Renders role-appropriate nav items and a logout button.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import {
  LayoutDashboard,
  HandHeart,
  ClipboardList,
  Truck,
  Building2,
  ShieldCheck,
  LogOut,
  Leaf,
} from 'lucide-react';

function navForRole(role) {
  const shared = [];

  switch (role) {
    case USER_ROLES.DONOR:
      return [
        { to: '/donor/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
        { to: '/donor/donations',  label: 'My Donations', icon: HandHeart },
      ];
    case USER_ROLES.ORG_ADMIN:
      return [
        { to: '/org/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
        { to: '/org/donations',   label: 'Donations',    icon: HandHeart },
        { to: '/org/requests',    label: 'Food Requests', icon: ClipboardList },
        { to: '/org/assignments', label: 'Assignments',  icon: Truck },
        { to: '/org/profile',     label: 'Organization', icon: Building2 },
      ];
    case USER_ROLES.VOLUNTEER:
      return [
        { to: '/volunteer/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
        { to: '/volunteer/assignments', label: 'Assignments', icon: Truck },
      ];
    case USER_ROLES.ADMIN:
      return [
        { to: '/admin/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
        { to: '/admin/verifications',  label: 'Verifications',  icon: ShieldCheck },
        { to: '/admin/donations',      label: 'Donations',      icon: HandHeart },
        { to: '/admin/requests',       label: 'Food Requests',  icon: ClipboardList },
        { to: '/admin/assignments',    label: 'Assignments',    icon: Truck },
      ];
    default:
      return shared;
  }
}

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'bg-brand-900/60 text-brand-300 border border-brand-800/60'
      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-muted'
  }`;

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navForRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-surface-card border-r border-surface-border">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-border">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Leaf size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100 leading-none">Food Rescue</p>
          <p className="text-xs text-slate-500 mt-0.5">Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} end={to.endsWith('dashboard')}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-surface-border pt-3 flex flex-col gap-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          <span className="mt-1 badge badge-slate text-xs">{user?.role}</span>
        </div>
        <button
          id="sidebar-logout-btn"
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../services/userService';
import { USER_ROLES, VOLUNTEER_AVAILABILITY_STATUSES } from '../../utils/constants';
import { humanizeSnake, userStatusBadge } from '../../utils/formatters';
import Badge from '../common/Badge';
import IdChip from '../common/IdChip';
import {
  ChevronDown,
  User,
  LogOut,
  Building,
  Truck,
  HandHeart,
  ClipboardList,
  ShieldCheck,
  Power,
  Settings,
  Sparkles
} from 'lucide-react';

/**
 * ProfileDropdown — real-world platform profile menu (Swiggy / Zomato / Udemy / Stripe style).
 * Triggers interactive flyout menu with role shortcuts, status toggle, account navigation, and logout.
 */
export default function ProfileDropdown() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!user) return null;

  const roleLabel = humanizeSnake(user.role);
  const isVolunteer = user.role === USER_ROLES.VOLUNTEER;
  const isOrgAdmin = user.role === USER_ROLES.ORG_ADMIN;
  const isDonor = user.role === USER_ROLES.DONOR;
  const isAdmin = user.role === USER_ROLES.ADMIN;
  const isAvailable = user.availabilityStatus === VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE;

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  const handleToggleDuty = async (e) => {
    e.stopPropagation();
    setTogglingDuty(true);
    try {
      const nextStatus = isAvailable
        ? VOLUNTEER_AVAILABILITY_STATUSES.UNAVAILABLE
        : VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE;
      await updateProfile({ availabilityStatus: nextStatus });
      await refreshUser();
    } catch {
      // silently fallback
    } finally {
      setTogglingDuty(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1 pl-2 sm:pl-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-150 select-none group"
      >
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[130px]">
            {user.name}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 capitalize font-medium flex items-center justify-end gap-1">
            <span>{roleLabel}</span>
          </p>
        </div>

        <div className="relative">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-emerald-800 flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-xs select-none font-display">
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </div>

        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-modal z-50 overflow-hidden animate-fade-in divide-y divide-slate-100 dark:divide-slate-800">
          {/* Header Card */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-950/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
              </div>
              <Badge variant={userStatusBadge(user.status || 'ACTIVE')} className="shrink-0 text-[10px] py-0.5 px-2">
                {user.status || 'ACTIVE'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {roleLabel}
              </span>
              <IdChip id={user._id} prefix="UID" />
            </div>

            {/* Volunteer Duty Quick Switcher */}
            {isVolunteer && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Mission Duty</span>
                <button
                  type="button"
                  onClick={handleToggleDuty}
                  disabled={togglingDuty}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    isAvailable
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <Power size={11} className={isAvailable ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>{isAvailable ? 'On Duty' : 'Off Duty'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Role Navigation Shortcuts */}
          <div className="p-1.5 space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Role Navigation
            </div>

            {isDonor && (
              <>
                <Link
                  to="/donor/donations"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <HandHeart size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>My Food Donations</span>
                </Link>
              </>
            )}

            {isOrgAdmin && (
              <>
                <Link
                  to="/org/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Building size={15} className="text-blue-600 dark:text-blue-400" />
                  <span>Organization Profile</span>
                </Link>
                <Link
                  to="/org/requests"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <ClipboardList size={15} className="text-amber-500" />
                  <span>Food Requests</span>
                </Link>
                <Link
                  to="/org/assignments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Truck size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Volunteer Dispatches</span>
                </Link>
              </>
            )}

            {isVolunteer && (
              <Link
                to="/volunteer/assignments"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
              >
                <Truck size={15} className="text-amber-500" />
                <span>My Rescue Missions</span>
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/admin/verifications"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <ShieldCheck size={15} className="text-purple-600 dark:text-purple-400" />
                  <span>Verifications Queue</span>
                </Link>
                <Link
                  to="/admin/assignments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Truck size={15} className="text-blue-500" />
                  <span>Platform Dispatches</span>
                </Link>
              </>
            )}
          </div>

          {/* Account Profile Action */}
          <div className="p-1.5 space-y-0.5">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <User size={15} className="text-slate-400" />
              <span>Account & Profile Details</span>
            </Link>
          </div>

          {/* Sign Out Action */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

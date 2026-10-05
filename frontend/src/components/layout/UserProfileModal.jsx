import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../services/userService';
import { USER_ROLES, VOLUNTEER_AVAILABILITY_STATUSES } from '../../utils/constants';
import { userStatusBadge, formatDate, humanizeSnake, extractErrorMessage } from '../../utils/formatters';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import IdChip from '../common/IdChip';
import Spinner from '../common/Spinner';
import Alert from '../common/Alert';
import { User, Mail, Phone, Shield, Calendar, Building, Power, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * UserProfileModal — comprehensive account details and profile editor for all roles.
 * Appears when user selects "Account Profile" from profile menu.
 */
export default function UserProfileModal({ isOpen, onClose }) {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    availabilityStatus: VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE,
    maxTravelDistanceKm: 15,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (user && isOpen) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        availabilityStatus: user.availabilityStatus || VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE,
        maxTravelDistanceKm: user.maxTravelDistanceKm || 15,
      });
      setError(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  if (!user) return null;

  const isVolunteer = user.role === USER_ROLES.VOLUNTEER;
  const isOrgAdmin = user.role === USER_ROLES.ORG_ADMIN;
  const isDonor = user.role === USER_ROLES.DONOR;
  const isAdmin = user.role === USER_ROLES.ADMIN;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
      };

      if (isVolunteer) {
        payload.availabilityStatus = form.availabilityStatus;
        if (form.maxTravelDistanceKm) {
          payload.maxTravelDistanceKm = Number(form.maxTravelDistanceKm);
        }
      }

      await updateProfile(payload);
      await refreshUser();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Profile" maxWidth="max-w-xl">
      <div className="space-y-5 text-sm">
        {/* Messages */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

        {/* User Hero Banner */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-50 dark:to-slate-800/60 border border-emerald-500/20 dark:border-emerald-500/15">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-emerald-800 flex items-center justify-center text-xl font-black text-white shadow-md shadow-emerald-900/15 select-none font-display">
              {user.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</h4>
              <Badge variant={userStatusBadge(user.status || 'ACTIVE')}>{user.status || 'ACTIVE'}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                {humanizeSnake(user.role)}
              </span>
              <IdChip id={user._id} prefix="UID" />
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-name" className="form-label text-xs font-semibold flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="form-input text-xs sm:text-sm py-2"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="form-label text-xs font-semibold flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user.email}
                className="form-input text-xs sm:text-sm py-2 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-80"
                title="Email is fixed and tied to your authentication account"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-phone" className="form-label text-xs font-semibold flex items-center gap-1.5">
                <Phone size={14} className="text-slate-400" /> Phone Number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="form-input text-xs sm:text-sm py-2"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label className="form-label text-xs font-semibold flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" /> Member Since
              </label>
              <div className="form-input text-xs sm:text-sm py-2 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                {formatDate(user.createdAt || new Date())}
              </div>
            </div>
          </div>

          {/* Volunteer Specific Configuration */}
          {isVolunteer && (
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/90 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Power size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mission Availability</span>
                </div>
                <select
                  value={form.availabilityStatus}
                  onChange={(e) => setForm((p) => ({ ...p, availabilityStatus: e.target.value }))}
                  className="form-input text-xs py-1.5 w-auto"
                >
                  <option value={VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE}>Available for Missions</option>
                  <option value={VOLUNTEER_AVAILABILITY_STATUSES.BUSY}>Busy on Mission</option>
                  <option value={VOLUNTEER_AVAILABILITY_STATUSES.UNAVAILABLE}>Off Duty</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Max Travel Radius: <strong>{form.maxTravelDistanceKm} km</strong></span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={form.maxTravelDistanceKm}
                  onChange={(e) => setForm((p) => ({ ...p, maxTravelDistanceKm: e.target.value }))}
                  className="w-full mt-1.5 accent-emerald-600"
                />
              </div>
            </div>
          )}

          {/* Organization Admin Context */}
          {isOrgAdmin && user.organizationId && (
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-bold text-blue-900 dark:text-blue-200">Managed Organization</p>
                  <p className="text-blue-700 dark:text-blue-400">ID: {String(user.organizationId).slice(-8)}</p>
                </div>
              </div>
              <Link
                to="/org/profile"
                onClick={onClose}
                className="btn-secondary text-xs py-1 px-2.5 bg-white dark:bg-slate-800"
              >
                Edit Org Details
              </Link>
            </div>
          )}

          {/* Donor Context */}
          {isDonor && (
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">Surplus Food Donor Account</p>
                <p className="text-emerald-700 dark:text-emerald-400">Authorized to publish food listings to network.</p>
              </div>
              <Link
                to="/donor/donations"
                onClick={onClose}
                className="btn-secondary text-xs py-1 px-2.5 bg-white dark:bg-slate-800"
              >
                My Listings
              </Link>
            </div>
          )}

          {/* Admin Context */}
          {isAdmin && (
            <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900/60 flex items-center gap-2 text-xs">
              <Shield size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <div>
                <p className="font-bold text-purple-900 dark:text-purple-200">Root Operations Administrator</p>
                <p className="text-purple-700 dark:text-purple-400">Full system verification and dispatch override permissions.</p>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-3.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              {loading ? <Spinner size={13} /> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

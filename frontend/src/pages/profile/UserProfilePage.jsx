import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../services/userService';
import { USER_ROLES, VOLUNTEER_AVAILABILITY_STATUSES } from '../../utils/constants';
import { userStatusBadge, formatDate, humanizeSnake, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import IdChip from '../../components/common/IdChip';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Truck,
  HandHeart,
  Shield,
  Save,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Power,
  Sliders,
  LogOut,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function UserProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    availabilityStatus: VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE,
    maxTravelDistanceKm: 15,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        availabilityStatus: user.availabilityStatus || VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE,
        maxTravelDistanceKm: user.maxTravelDistanceKm || 15,
      });
    }
  }, [user]);

  if (!user) return null;

  const isVolunteer = user.role === USER_ROLES.VOLUNTEER;
  const isOrgAdmin = user.role === USER_ROLES.ORG_ADMIN;
  const isDonor = user.role === USER_ROLES.DONOR;
  const isAdmin = user.role === USER_ROLES.ADMIN;
  const roleLabel = humanizeSnake(user.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      setSuccessMsg('Your profile changes have been saved successfully.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Breadcrumb & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to previous
          </button>
          <h1 className="page-title text-2xl font-extrabold font-display">Account & Profile</h1>
          <p className="page-subtitle text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your personal credentials, contact details, and role-specific rescue operational settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* User Hero Banner (Swiggy / Stripe / Udemy style) */}
      <div className="card p-6 bg-gradient-to-br from-emerald-600/10 via-teal-600/5 to-slate-50 dark:to-slate-900/80 border-emerald-500/20 dark:border-emerald-500/15 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-emerald-800 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-lg shadow-emerald-900/15 select-none font-display">
                {user.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user.name}</h2>
                <Badge variant={userStatusBadge(user.status || 'ACTIVE')}>{user.status || 'ACTIVE'}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                <span>{user.email}</span>
              </p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80 uppercase tracking-wide">
                  {roleLabel}
                </span>
                <IdChip id={user._id} prefix="UID" />
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={13} /> Member since {formatDate(user.createdAt || new Date())}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editable Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User size={16} className="text-emerald-600" /> Personal Identity & Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your display name and contact phone number.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-name" className="form-label text-xs font-semibold">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="user-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="form-input text-xs sm:text-sm pl-9 py-2.5"
                    placeholder="Your legal or contact name"
                  />
                  <User size={15} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              <div>
                <label htmlFor="user-email" className="form-label text-xs font-semibold flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock size={10} /> Verified & Fixed
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="user-email"
                    type="email"
                    disabled
                    value={user.email}
                    className="form-input text-xs sm:text-sm pl-9 py-2.5 bg-slate-100/80 dark:bg-slate-800/40 text-slate-500 cursor-not-allowed opacity-90"
                  />
                  <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-phone" className="form-label text-xs font-semibold">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    id="user-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="form-input text-xs sm:text-sm pl-9 py-2.5"
                    placeholder="+1 (555) 000-0000"
                  />
                  <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="form-label text-xs font-semibold">
                  Account Status
                </label>
                <div className="form-input text-xs sm:text-sm py-2.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Identity Verified</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} /> Active
                  </span>
                </div>
              </div>
            </div>

            {/* Volunteer Mission Preferences */}
            {isVolunteer && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Power size={16} className="text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Mission Duty Status
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Choose if organizations can dispatch new food rescues to you.
                      </p>
                    </div>
                  </div>
                  <select
                    value={form.availabilityStatus}
                    onChange={(e) => setForm((p) => ({ ...p, availabilityStatus: e.target.value }))}
                    className="form-input text-xs py-1.5 w-auto font-semibold"
                  >
                    <option value={VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE}>Available for Missions</option>
                    <option value={VOLUNTEER_AVAILABILITY_STATUSES.BUSY}>Busy on Active Mission</option>
                    <option value={VOLUNTEER_AVAILABILITY_STATUSES.UNAVAILABLE}>Off Duty / Inactive</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sliders size={14} className="text-emerald-600" /> Max Travel Radius
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {form.maxTravelDistanceKm} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={form.maxTravelDistanceKm}
                    onChange={(e) => setForm((p) => ({ ...p, maxTravelDistanceKm: e.target.value }))}
                    className="w-full mt-2 accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>5 km (Local)</span>
                    <span>50 km</span>
                    <span>100 km (Wide Regional)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs sm:text-sm py-2.5 px-5 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Spinner size={15} /> Saving changes...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Profile Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Role Privileges & Quick Shortcuts */}
        <div className="space-y-6">
          {/* Role Status Card */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Role & Operational Access
            </h3>

            {isDonor && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <HandHeart size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Surplus Food Donor</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Publish surplus food listings, manage pickup time slots, and monitor rescue fulfillment.
                    </p>
                  </div>
                </div>

                <Link
                  to="/donor/donations"
                  className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-2"
                >
                  <HandHeart size={14} className="text-emerald-600" />
                  <span>View My Donations</span>
                  <ExternalLink size={12} className="text-slate-400" />
                </Link>
              </div>
            )}

            {isOrgAdmin && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Building size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Community Organization</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Request food donations, assign verified volunteers, and coordinate distributions.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Link
                    to="/org/profile"
                    className="btn-secondary w-full text-xs py-2 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Building size={14} className="text-blue-600" /> Manage Org Details
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </Link>
                  <Link
                    to="/org/requests"
                    className="btn-secondary w-full text-xs py-2 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Truck size={14} className="text-amber-500" /> Food Requests Hub
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </Link>
                </div>
              </div>
            )}

            {isVolunteer && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Rescue Logistics Volunteer</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Accept pickup missions, navigate to donors, verify pickups, and complete safe drop-offs.
                    </p>
                  </div>
                </div>

                <Link
                  to="/volunteer/assignments"
                  className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-2"
                >
                  <Truck size={14} className="text-amber-500" />
                  <span>My Active Missions</span>
                  <ExternalLink size={12} className="text-slate-400" />
                </Link>
              </div>
            )}

            {isAdmin && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Operations Administrator</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Full platform command: Organization verification, audit trails, and global dispatch controls.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Link
                    to="/admin/verifications"
                    className="btn-secondary w-full text-xs py-2 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Shield size={14} className="text-purple-600" /> Verifications Queue
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </Link>
                  <Link
                    to="/admin/dashboard"
                    className="btn-secondary w-full text-xs py-2 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Sliders size={14} className="text-emerald-600" /> Command Center
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Security & Authentication Info */}
          <div className="card p-5 space-y-3 text-xs bg-slate-50/60 dark:bg-slate-900/60">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-600" /> Security & Session
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Your session is authenticated via secure cryptographic JWT tokens with role-based access control.
            </p>
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Token Storage</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">Encrypted Session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

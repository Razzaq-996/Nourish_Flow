import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  ShieldCheck,
  HandHeart,
  Truck,
  ArrowRight,
  UserCheck,
  Users,
  Building2,
  RefreshCw,
  PackageCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPlatformAnalytics } from '../../services/analyticsService';
import { extractErrorMessage } from '../../utils/formatters';
import StatCard from '../../components/common/StatCard';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlatformAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Format data for charts
  const donationStatusData = analytics?.donations?.byStatus
    ? Object.entries(analytics.donations.byStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.replace(/_/g, ' '),
          value: count
        }))
    : [];

  const requestStatusData = analytics?.foodRequests?.byStatus
    ? Object.entries(analytics.foodRequests.byStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.replace(/_/g, ' '),
          count
        }))
    : [];

  const assignmentStatusData = analytics?.assignments?.byStatus
    ? Object.entries(analytics.assignments.byStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.replace(/_/g, ' '),
          value: count
        }))
    : [];

  const userRoleData = analytics?.users?.byRole
    ? Object.entries(analytics.users.byRole)
        .filter(([, count]) => count > 0)
        .map(([role, count]) => ({
          name: role.replace(/_/g, ' '),
          count
        }))
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome banner */}
      <div className="card bg-gradient-to-r from-purple-950/70 via-surface-card to-surface-card border-purple-800/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-900/60 border border-purple-700/60 text-purple-300 text-xs font-medium mb-2">
              <ShieldCheck size={13} /> Platform Administrator Command Center
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Welcome, {user?.name} 🛡️</h2>
            <p className="text-slate-400 mt-1 text-sm max-w-xl">
              Live operational metrics, verification status, community food flows, and cross-platform logistics analytics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAnalytics}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link
              to="/admin/verifications"
              className="btn-primary shrink-0 self-start sm:self-auto bg-purple-600 hover:bg-purple-500 text-xs"
            >
              <UserCheck size={15} /> Review Verifications
            </Link>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* High-level Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value={loading ? '...' : analytics?.users?.total ?? 0}
          subtitle={`Active: ${analytics?.users?.byStatus?.ACTIVE ?? 0} | Pending: ${analytics?.users?.byStatus?.PENDING_VERIFICATION ?? 0}`}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Organizations"
          value={loading ? '...' : analytics?.organizations?.total ?? 0}
          subtitle={`Verified: ${analytics?.organizations?.byStatus?.VERIFIED ?? 0} | Pending: ${analytics?.organizations?.byStatus?.PENDING ?? 0}`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Food Listings"
          value={loading ? '...' : analytics?.donations?.total ?? 0}
          subtitle={`Available: ${analytics?.donations?.byStatus?.AVAILABLE ?? 0} | Allocated: ${analytics?.donations?.byStatus?.FULLY_ALLOCATED ?? 0}`}
          icon={HandHeart}
          color="brand"
        />
        <StatCard
          title="Rescue Deliveries"
          value={loading ? '...' : analytics?.assignments?.completedCount ?? 0}
          subtitle={`Pending: ${analytics?.assignments?.pendingCount ?? 0} | Failed: ${analytics?.assignments?.failedCount ?? 0}`}
          icon={PackageCheck}
          color="amber"
        />
      </div>

      {/* Analytics Charts Grid */}
      {loading && !analytics ? (
        <div className="card py-16 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donation Status Breakdown */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Donations by Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Real-time state distribution of all food listings
            </p>
            {donationStatusData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No donation data recorded yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donationStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {donationStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Food Requests by Status */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Food Requests by Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Community food needs fulfillment status
            </p>
            {requestStatusData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No request data recorded yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestStatusData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Assignment & Logistics Status */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Volunteer Missions by Lifecycle Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Status distribution across all volunteer rescue runs
            </p>
            {assignmentStatusData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No assignment missions dispatched yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assignmentStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {assignmentStatusData.map((_, index) => (
                        <Cell key={`cell-asgn-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* User Distribution by Role */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
              User Network by Role
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Platform participant distribution
            </p>
            {userRoleData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No user accounts found.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userRoleData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unit-Aware Volume Matrix */}
      {analytics && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
            Physical Volume Flows (Grouped by Unit)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Requested, allocated, and physically delivered quantities partitioned by unit to maintain measurement accuracy.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.keys(analytics.donations?.allocatedQuantityByUnit || {}).map((unit) => {
              const allocated = analytics.donations?.allocatedQuantityByUnit?.[unit] || 0;
              const delivered = analytics.assignments?.deliveredQuantityByUnit?.[unit] || 0;
              const requested = analytics.foodRequests?.requestedQuantityByUnit?.[unit] || 0;

              return (
                <div key={unit} className="p-3 bg-surface rounded-xl border border-surface-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span className="uppercase tracking-wider">{unit}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Requested:</span>
                    <span className="text-slate-200 font-semibold">{requested}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Allocated:</span>
                    <span className="text-blue-400 font-semibold">{allocated}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-surface-border/50">
                    <span>Delivered:</span>
                    <span className="text-emerald-400 font-bold">{delivered}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/verifications"
          className="card hover:border-purple-600/60 transition-all p-5 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400 group-hover:scale-105 transition-transform">
              <UserCheck size={22} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                Pending Verifications Queue
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Review and approve organizations and volunteer onboarding
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-purple-300 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/admin/assignments"
          className="card hover:border-amber-600/60 transition-all p-5 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 group-hover:scale-105 transition-transform">
              <Truck size={22} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                Rescue Logistics Central
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Track volunteer dispatches, transit status, and delivery completion
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}

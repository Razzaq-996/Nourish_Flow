import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  HandHeart,
  Plus,
  PackageCheck,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDonorAnalytics } from '../../services/analyticsService';
import { DONATION_STATUSES } from '../../utils/constants';
import { donationStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import DonationFormModal from '../../components/donations/DonationFormModal';
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
import { useTheme } from '../../hooks/useTheme';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function DonorDashboard() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: '0.5rem',
    fontSize: '12px',
    boxShadow: isDark ? '0 10px 15px -3px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
  };
  const axisStroke = isDark ? '#64748b' : '#94a3b8';

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDonorAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format chart data
  const statusChartData = analytics?.donationsByStatus
    ? Object.entries(analytics.donationsByStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.replace(/_/g, ' '),
          value: count
        }))
    : [];

  const categoryChartData = analytics?.donationsByCategory
    ? Object.entries(analytics.donationsByCategory)
        .filter(([, count]) => count > 0)
        .map(([cat, count]) => ({
          name: cat.replace(/_/g, ' '),
          count
        }))
    : [];

  const totalCount = analytics?.totalDonations ?? 0;
  const availableCount = (analytics?.donationsByStatus?.[DONATION_STATUSES.AVAILABLE] || 0) +
    (analytics?.donationsByStatus?.[DONATION_STATUSES.PARTIALLY_ALLOCATED] || 0);
  const fullyAllocatedCount = analytics?.donationsByStatus?.[DONATION_STATUSES.FULLY_ALLOCATED] || 0;

  return (
    <div className="animate-fade-in space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900/60 border border-emerald-500/20 dark:border-emerald-500/15 p-6 sm:p-7 shadow-xs">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <HandHeart size={12} strokeWidth={2.5} /> Donor Impact Hub
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified Logistics Partner
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-slate-50 tracking-tight">
              Welcome back, {user?.name}
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-2xl leading-relaxed">
              Real-time surplus food dispatch. Coordinate listings, match nearby shelters, and monitor food delivered to communities.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadData}
              className="btn-secondary text-xs px-3.5 py-2.5 flex items-center gap-1.5 rounded-xl font-semibold"
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary shrink-0 text-xs px-4 py-2.5 flex items-center gap-2 rounded-xl font-bold shadow-md shadow-emerald-900/10"
            >
              <Plus size={16} strokeWidth={2.5} /> List Surplus Food
            </button>
          </div>
        </div>
      </div>

      {/* Operations Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Listed"
          value={loading ? '...' : totalCount}
          subtitle="All lifetime surplus listings"
          icon={HandHeart}
          color="brand"
        />
        <StatCard
          title="Active Listings"
          value={loading ? '...' : availableCount}
          subtitle="Currently open for rescue matching"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Fully Allocated"
          value={loading ? '...' : fullyAllocatedCount}
          subtitle="Matched & dispatched to shelters"
          icon={PackageCheck}
          color="purple"
        />
      </div>

      {/* Visual Analytics */}
      {loading && !analytics ? (
        <div className="card py-16 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Donations by Lifecycle Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Overview of all your posted surplus listings
            </p>
            {statusChartData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No donations listed yet.</p>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-donor-st-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Food Categories Donated
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Distribution of food categories provided
            </p>
            {categoryChartData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No category data recorded.</p>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <XAxis dataKey="name" stroke={axisStroke} fontSize={11} />
                    <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Physical Volume Metrics (Grouped by Unit) */}
      {analytics && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
            Physical Volume Flows (Grouped by Unit)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Total donated, allocated, remaining, and successfully delivered volumes derived directly from verified assignment records.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.keys(analytics.quantities?.donatedByUnit || {}).map((unit) => {
              const donated = analytics.quantities?.donatedByUnit?.[unit] || 0;
              const allocated = analytics.quantities?.allocatedByUnit?.[unit] || 0;
              const remaining = analytics.quantities?.remainingByUnit?.[unit] || 0;
              const delivered = analytics.quantities?.deliveredByUnit?.[unit] || 0;

              return (
                <div key={unit} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">{unit}</span>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Donated:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">{donated}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Allocated:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{allocated}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Remaining:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{remaining}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                    <span>Delivered:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{delivered}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent donations table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title">Recent Donations</h3>
            <p className="text-xs text-slate-400 mt-0.5">Your latest food rescue listings</p>
          </div>
          <Link
            to="/donor/donations"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all listings <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : (analytics?.recentDonations || []).length === 0 ? (
          <EmptyState
            title="No surplus food listed yet"
            description="Start by listing your first excess meals or groceries. Our system will automatically coordinate with verified rescue organizations."
            actionLabel="List Surplus Food"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Qty</th>
                  <th>Allocated</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentDonations.map((d) => (
                  <tr key={d._id}>
                    <td className="font-semibold text-slate-900 dark:text-slate-100">
                      {d.foodCategory?.replace(/_/g, ' ')}
                    </td>
                    <td className="text-slate-700 dark:text-slate-300 font-medium">{d.totalQuantity} {d.unit}</td>
                    <td className="text-blue-600 dark:text-blue-400 font-semibold">{d.allocatedQuantity ?? 0} {d.unit}</td>
                    <td className="text-emerald-600 dark:text-emerald-400 font-semibold">{d.remainingQuantity} {d.unit}</td>
                    <td>
                      <Badge variant={donationStatusBadge(d.status)}>{d.status}</Badge>
                    </td>
                    <td className="text-xs text-slate-500 dark:text-slate-400">{formatDate(d.expiresAt)}</td>
                    <td className="text-xs text-slate-400 dark:text-slate-500">{formatDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <DonationFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}

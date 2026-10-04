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

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function DonorDashboard() {
  const { user } = useAuth();
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
      <div className="card bg-gradient-to-r from-brand-950/80 via-surface-card to-surface-card border-brand-800/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-900/60 border border-brand-700/60 text-brand-300 text-xs font-medium mb-2">
              <HandHeart size={13} /> Donor Impact Hub
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Welcome back, {user?.name} 👋</h2>
            <p className="text-slate-400 mt-1 text-sm max-w-xl">
              Turn food surplus into community relief. List donations, monitor matching allocations, and track food safely delivered to local shelters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary shrink-0 self-start sm:self-auto text-xs flex items-center gap-1.5"
            >
              <Plus size={15} /> New Donation
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
                <div key={unit} className="p-3 bg-surface rounded-xl border border-surface-border text-xs space-y-1.5">
                  <span className="font-bold text-slate-200 uppercase tracking-wider block">{unit}</span>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Donated:</span>
                    <span className="text-slate-200 font-semibold">{donated}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Allocated:</span>
                    <span className="text-blue-400 font-semibold">{allocated}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Remaining:</span>
                    <span className="text-amber-400 font-semibold">{remaining}</span>
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
          <div className="py-10 text-center text-slate-500 text-sm">
            <p>No food donations listed yet.</p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-3 btn-secondary text-xs"
            >
              List your first donation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    <td className="font-medium text-slate-200">
                      {d.foodCategory?.replace(/_/g, ' ')}
                    </td>
                    <td>{d.totalQuantity} {d.unit}</td>
                    <td className="text-blue-400 font-semibold">{d.allocatedQuantity ?? 0} {d.unit}</td>
                    <td className="text-brand-400 font-semibold">{d.remainingQuantity} {d.unit}</td>
                    <td>
                      <Badge variant={donationStatusBadge(d.status)}>{d.status}</Badge>
                    </td>
                    <td className="text-xs text-slate-400">{formatDate(d.expiresAt)}</td>
                    <td className="text-xs text-slate-500">{formatDate(d.createdAt)}</td>
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

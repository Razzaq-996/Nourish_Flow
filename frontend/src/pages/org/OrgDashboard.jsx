import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Building2,
  Plus,
  ArrowRight,
  Award,
  RefreshCw,
  ClipboardList,
  HandHeart,
  Truck,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOrganizationAnalytics } from '../../services/analyticsService';
import { completeAssignment } from '../../services/assignmentService';
import { ASSIGNMENT_STATUSES } from '../../utils/constants';
import {
  assignmentStatusBadge,
  formatDate,
  extractErrorMessage,
  orgStatusBadge
} from '../../utils/formatters';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function OrgDashboard() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getOrganizationAnalytics(orgId);
      setAnalytics(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleComplete = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await completeAssignment(id);
      setSuccessMsg('Assignment completed and verified successfully!');
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Prepare chart data
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

  return (
    <div className="animate-fade-in space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Welcome banner */}
      <div className="card bg-gradient-to-r from-blue-950/70 via-surface-card to-surface-card border-blue-800/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-900/60 border border-blue-700/60 text-blue-300 text-xs font-medium mb-2">
              <Building2 size={13} /> Organization Operations Center
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100">
                {analytics?.organization?.name || user?.name}
              </h2>
              {analytics?.organization?.verificationStatus && (
                <Badge variant={orgStatusBadge(analytics.organization.verificationStatus)}>
                  {analytics.organization.verificationStatus}
                </Badge>
              )}
            </div>
            <p className="text-slate-400 mt-1 text-sm max-w-xl">
              Coordinate food relief, monitor supply allocations, track volunteer rescue deliveries, and verify mission completion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link to="/org/requests" className="btn-primary text-xs flex items-center gap-1.5">
              <Plus size={15} /> New Food Request
            </Link>
          </div>
        </div>
      </div>

      {/* Key Fulfillment Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Food Requests"
          value={loading ? '...' : analytics?.foodRequests?.total ?? 0}
          subtitle={`Open Needs: ${analytics?.foodRequests?.open ?? 0}`}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          title="Associated Donations"
          value={loading ? '...' : analytics?.donationsAssociatedCount ?? 0}
          subtitle="Donors paired with your requests"
          icon={HandHeart}
          color="brand"
        />
        <StatCard
          title="In Transit Rescues"
          value={loading ? '...' : analytics?.assignments?.inTransitCount ?? 0}
          subtitle="Active volunteer transport runs"
          icon={Truck}
          color="amber"
        />
        <StatCard
          title="Completed Deliveries"
          value={loading ? '...' : analytics?.assignments?.completedCount ?? 0}
          subtitle={`Failed: ${analytics?.assignments?.failedCount ?? 0}`}
          icon={CheckCircle2}
          color="purple"
        />
      </div>

      {/* Analytics Charts */}
      {loading && !analytics ? (
        <div className="card py-16 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requests Status Distribution */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Requests Fulfillment Status
              </h3>
              <Link to="/org/requests" className="text-xs text-blue-400 hover:text-blue-300">
                View all &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time distribution of your posted meal and grocery demands
            </p>
            {requestStatusData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No food requests posted yet.</p>
            ) : (
              <div className="h-60 w-full">
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

          {/* Volunteer Missions Status */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Logistics & Mission Breakdown
              </h3>
              <Link to="/org/assignments" className="text-xs text-blue-400 hover:text-blue-300">
                Manage &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Current state of all volunteer delivery dispatches
            </p>
            {assignmentStatusData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No assignments dispatched yet.</p>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assignmentStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {assignmentStatusData.map((_, index) => (
                        <Cell key={`cell-org-asgn-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
        </div>
      )}

      {/* Allocated vs Delivered Quantities (Unit-Aware) */}
      {analytics && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
            Fulfillment Volume by Unit (Allocated vs Delivered)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Total quantities needed, matched by donor allocations, and successfully delivered to your center.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.keys(analytics.quantities?.requestedByUnit || {}).map((unit) => {
              const req = analytics.quantities?.requestedByUnit?.[unit] || 0;
              const alloc = analytics.quantities?.allocatedByUnit?.[unit] || 0;
              const deliv = analytics.quantities?.deliveredByUnit?.[unit] || 0;

              return (
                <div key={unit} className="p-3 bg-surface rounded-xl border border-surface-border text-xs space-y-1.5">
                  <span className="font-bold text-slate-200 uppercase tracking-wider block">{unit}</span>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Requested:</span>
                    <span className="text-slate-200 font-semibold">{req}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Allocated:</span>
                    <span className="text-blue-400 font-semibold">{alloc}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-surface-border/50">
                    <span>Delivered:</span>
                    <span className="text-emerald-400 font-bold">{deliv}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Operational Delivery Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title">Recent Delivery Missions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Live volunteer logistics & verification</p>
          </div>
          <Link
            to="/org/assignments"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            View all assignments <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center"><Spinner size={20} /></div>
        ) : (analytics?.recentDeliveries || []).length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No delivery missions dispatched yet.
          </div>
        ) : (
          <div className="space-y-3">
            {analytics.recentDeliveries.map((a) => (
              <div
                key={a._id}
                className="p-3 bg-surface rounded-lg border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 text-sm">
                      {a.quantity} {a.unit}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Req ...{String(a.requestId).slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5 font-mono">
                    <span>Volunteer: ...{String(a.volunteerUserId).slice(-6)}</span>
                    {a.assignedAt && <span>Dispatched: {formatDate(a.assignedAt)}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant={assignmentStatusBadge(a.status)}>{a.status}</Badge>

                  {a.status === ASSIGNMENT_STATUSES.DELIVERED && (
                    <button
                      type="button"
                      onClick={() => handleComplete(a._id)}
                      disabled={actionLoading === a._id}
                      className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                      title="Verify & Complete Mission"
                    >
                      {actionLoading === a._id ? <Spinner size={12} /> : <><Award size={13} /> Complete</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Truck, CheckCircle2, Clock, Power, ArrowRight, PackageCheck, Send, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  listAssignments,
  acceptAssignment,
  startPickup,
  confirmPickedUp,
  startDelivery,
  confirmDelivered
} from '../../services/assignmentService';
import { getVolunteerAnalytics } from '../../services/analyticsService';
import { updateProfile } from '../../services/userService';
import { ASSIGNMENT_STATUSES, VOLUNTEER_AVAILABILITY_STATUSES } from '../../utils/constants';
import { assignmentStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function VolunteerDashboard() {
  const { user, refreshUser } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const isAvailable = user?.availabilityStatus === VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE;

  const loadData = async () => {
    try {
      setAnalyticsLoading(true);
      const [assignmentsRes, analyticsRes] = await Promise.allSettled([
        listAssignments({ limit: 10 }),
        getVolunteerAnalytics()
      ]);

      if (assignmentsRes.status === 'fulfilled') {
        const data = assignmentsRes.value;
        setAssignments(Array.isArray(data) ? data : (data?.assignments || []));
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value);
      }
    } catch {
      // Handled via defaults
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAvailability = async () => {
    setToggling(true);
    setError(null);
    try {
      const nextStatus = isAvailable
        ? VOLUNTEER_AVAILABILITY_STATUSES.UNAVAILABLE
        : VOLUNTEER_AVAILABILITY_STATUSES.AVAILABLE;

      await updateProfile({ availabilityStatus: nextStatus });
      await refreshUser();
      setSuccessMsg(`Availability updated: You are now ${nextStatus}.`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const handleAction = async (id, actionFn, successMsgText) => {
    try {
      await actionFn(id);
      setSuccessMsg(successMsgText);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const totalAssigned = analytics?.assignments?.total ?? assignments.length;
  const pendingCount = analytics?.assignments?.pending ?? assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.PENDING).length;
  const acceptedCount = analytics?.assignments?.accepted ?? assignments.filter((a) => [
    ASSIGNMENT_STATUSES.ACCEPTED,
    ASSIGNMENT_STATUSES.PICKUP_STARTED,
    ASSIGNMENT_STATUSES.PICKED_UP,
    ASSIGNMENT_STATUSES.DELIVERY_STARTED
  ].includes(a.status)).length;
  const completedCount = analytics?.assignments?.completed ?? assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.COMPLETED || a.status === ASSIGNMENT_STATUSES.DELIVERED).length;
  const failedCount = analytics?.assignments?.failed ?? assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.FAILED).length;

  const statusChartData = analytics?.assignments?.byStatus
    ? Object.entries(analytics.assignments.byStatus).map(([status, count]) => ({
        status: status.replace(/_/g, ' '),
        count
      }))
    : [];

  const deliveredUnits = analytics?.quantities?.deliveredByUnit
    ? Object.entries(analytics.quantities.deliveredByUnit).filter(([, val]) => val > 0)
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Volunteer Status Banner */}
      <div className="card bg-gradient-to-r from-amber-950/60 via-surface-card to-surface-card border-amber-800/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-900/60 border border-amber-700/60 text-amber-300 text-xs font-medium mb-2">
              <Truck size={13} /> Volunteer Responder Hub
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Welcome, {user?.name} 🚚</h2>
            <p className="text-slate-400 mt-1 text-sm max-w-xl">
              You are the bridge between food surplus and families in need. Stay ready for pickup and transport missions.
            </p>
          </div>

          {/* Availability Toggle */}
          <div className="p-3 bg-surface rounded-xl border border-surface-border flex items-center gap-3 self-start sm:self-auto">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Duty Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs font-semibold text-slate-200">
                  {isAvailable ? 'Available for Missions' : 'Off-Duty (Unavailable)'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={toggling}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                isAvailable
                  ? 'bg-amber-950/50 border-amber-800 text-amber-300 hover:bg-amber-900/50'
                  : 'bg-emerald-950/50 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              {toggling ? <Spinner size={14} /> : <Power size={15} />}
            </button>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Missions"
          value={analyticsLoading ? '...' : totalAssigned}
          subtitle="All assigned tasks"
          icon={Truck}
          color="brand"
        />
        <StatCard
          title="Pending Response"
          value={analyticsLoading ? '...' : pendingCount}
          subtitle="Awaiting your acceptance"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Active Missions"
          value={analyticsLoading ? '...' : acceptedCount}
          subtitle="In transit & underway"
          icon={PackageCheck}
          color="blue"
        />
        <StatCard
          title="Successfully Delivered"
          value={analyticsLoading ? '...' : completedCount}
          subtitle={failedCount > 0 ? `${failedCount} mission(s) failed` : 'Zero mission failures'}
          icon={failedCount > 0 ? AlertCircle : CheckCircle2}
          color={failedCount > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* Successfully Delivered Quantities Grouped By Physical Unit */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title">Delivered Rescue Volume (Strictly By Physical Unit)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculated exclusively from confirmed and delivered assignments</p>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="py-6 flex justify-center"><Spinner size={20} /></div>
        ) : deliveredUnits.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No completed delivery volume recorded yet. Complete assigned pickups to see your rescue impact here!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {deliveredUnits.map(([unit, qty]) => (
              <div key={unit} className="p-3 bg-surface rounded-lg border border-surface-border text-center">
                <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">{unit}</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{qty.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">delivered</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mission Status Chart */}
      <div className="card">
        <h3 className="section-title mb-4">Mission Status Distribution</h3>
        {analyticsLoading ? (
          <div className="h-64 flex items-center justify-center"><Spinner size={24} /></div>
        ) : statusChartData.length === 0 || statusChartData.every((d) => d.count === 0) ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No assignment history available for visual analysis.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="status" stroke="#94a3b8" fontSize={11} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#cbd5e1', fontWeight: 600 }}
                />
                <Bar dataKey="count" name="Assignments" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Immediate missions board */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title">Assigned Missions & Recent Activity</h3>
            <p className="text-xs text-slate-400 mt-0.5">Urgent deliveries dispatched to you</p>
          </div>
          <Link
            to="/volunteer/assignments"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center"><Spinner size={20} /></div>
        ) : assignments.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No missions currently assigned to you.
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.slice(0, 5).map((a) => (
              <div key={a._id} className="p-3 bg-surface rounded-lg border border-surface-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">
                    {a.quantity} {a.unit}
                  </span>
                  <span className="text-slate-500">
                    Assigned {formatDate(a.assignedAt || a.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={assignmentStatusBadge(a.status)}>{a.status}</Badge>
                  {a.status === ASSIGNMENT_STATUSES.PENDING && (
                    <button
                      type="button"
                      onClick={() => handleAction(a._id, acceptAssignment, 'Assignment accepted! Prepare for pickup.')}
                      className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Accept
                    </button>
                  )}
                  {a.status === ASSIGNMENT_STATUSES.ACCEPTED && (
                    <button
                      type="button"
                      onClick={() => handleAction(a._id, startPickup, 'Pickup started! Head to donor location.')}
                      className="btn-primary text-xs py-1 px-2.5 bg-blue-600 hover:bg-blue-500 flex items-center gap-1"
                    >
                      <Truck size={12} /> Start Pickup
                    </button>
                  )}
                  {a.status === ASSIGNMENT_STATUSES.PICKUP_STARTED && (
                    <button
                      type="button"
                      onClick={() => handleAction(a._id, confirmPickedUp, 'Food collected from donor.')}
                      className="btn-primary text-xs py-1 px-2.5 bg-blue-600 hover:bg-blue-500 flex items-center gap-1"
                    >
                      <PackageCheck size={12} /> Picked Up
                    </button>
                  )}
                  {a.status === ASSIGNMENT_STATUSES.PICKED_UP && (
                    <button
                      type="button"
                      onClick={() => handleAction(a._id, startDelivery, 'Delivery started! In transit to center.')}
                      className="btn-primary text-xs py-1 px-2.5 bg-amber-600 hover:bg-amber-500 flex items-center gap-1"
                    >
                      <Send size={12} /> Start Delivery
                    </button>
                  )}
                  {a.status === ASSIGNMENT_STATUSES.DELIVERY_STARTED && (
                    <button
                      type="button"
                      onClick={() => handleAction(a._id, confirmDelivered, 'Food marked as delivered!')}
                      className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Delivered
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


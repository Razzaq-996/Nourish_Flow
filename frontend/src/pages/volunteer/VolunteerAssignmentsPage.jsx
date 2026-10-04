import { useState, useEffect, useCallback } from 'react';
import {
  Filter,
  RefreshCw,
  CheckCircle2,
  Eye,
  Truck,
  PackageCheck,
  Send,
  XCircle,
  Clock,
  Award
} from 'lucide-react';
import {
  listAssignments,
  acceptAssignment,
  rejectAssignment,
  cancelAssignment,
  startPickup,
  confirmPickedUp,
  startDelivery,
  confirmDelivered
} from '../../services/assignmentService';
import { ASSIGNMENT_STATUSES } from '../../utils/constants';
import { assignmentStatusBadge, formatDateTime, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import AssignmentDetailsModal from '../../components/assignments/AssignmentDetailsModal';

export default function VolunteerAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const data = await listAssignments(params);
      setAssignments(Array.isArray(data) ? data : (data?.assignments || []));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const runTransition = async (id, actionFn, successMessage, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setActionLoading(id);
    setError(null);
    try {
      await actionFn(id);
      setSuccessMsg(successMessage);
      await fetchAssignments();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.PENDING).length;
  const inTransitCount = assignments.filter((a) => [
    ASSIGNMENT_STATUSES.ACCEPTED,
    ASSIGNMENT_STATUSES.PICKUP_STARTED,
    ASSIGNMENT_STATUSES.PICKED_UP,
    ASSIGNMENT_STATUSES.DELIVERY_STARTED
  ].includes(a.status)).length;
  const completedCount = assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.COMPLETED).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div>
        <h2 className="page-title">My Rescue Missions</h2>
        <p className="text-sm text-slate-400 mt-1">
          Track volunteer assignments dispatched to you. Accept runs, navigate pickup, and confirm deliveries.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-surface rounded-xl border border-surface-border flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Pending Acceptance</span>
            <span className="text-xl font-bold text-slate-100">{loading ? '...' : pendingCount}</span>
          </div>
          <Clock size={18} className="text-amber-400" />
        </div>
        <div className="p-3.5 bg-surface rounded-xl border border-surface-border flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">In Progress</span>
            <span className="text-xl font-bold text-slate-100">{loading ? '...' : inTransitCount}</span>
          </div>
          <Truck size={18} className="text-blue-400" />
        </div>
        <div className="p-3.5 bg-surface rounded-xl border border-surface-border flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Delivered & Completed</span>
            <span className="text-xl font-bold text-slate-100">{loading ? '...' : completedCount}</span>
          </div>
          <Award size={18} className="text-emerald-400" />
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input text-xs py-2 w-auto"
          >
            <option value="">All Statuses</option>
            {Object.values(ASSIGNMENT_STATUSES).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchAssignments}
          title="Refresh Missions"
          className="btn-secondary px-3 py-2"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Cards */}
      {loading && assignments.length === 0 ? (
        <div className="card flex items-center justify-center h-48">
          <Spinner size={28} />
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No rescue missions found"
          description={
            statusFilter
              ? 'No missions match this filter.'
              : 'You have no assigned delivery runs right now. Ensure your duty status is set to Available!'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((asgn) => {
            const isPending = asgn.status === ASSIGNMENT_STATUSES.PENDING;
            const isAccepted = asgn.status === ASSIGNMENT_STATUSES.ACCEPTED;
            const isPickupStarted = asgn.status === ASSIGNMENT_STATUSES.PICKUP_STARTED;
            const isPickedUp = asgn.status === ASSIGNMENT_STATUSES.PICKED_UP;
            const isDeliveryStarted = asgn.status === ASSIGNMENT_STATUSES.DELIVERY_STARTED;
            const isDelivered = asgn.status === ASSIGNMENT_STATUSES.DELIVERED;
            const isCompleted = asgn.status === ASSIGNMENT_STATUSES.COMPLETED;

            return (
              <div
                key={asgn._id}
                className="card flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Food Rescue Mission
                    </span>
                    <Badge variant={assignmentStatusBadge(asgn.status)}>{asgn.status}</Badge>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100">
                    {asgn.quantity} {asgn.unit} of surplus food
                  </h3>

                  <div className="mt-3 p-3 bg-surface rounded-lg border border-surface-border text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Donation ID:</span>
                      <span className="font-mono text-slate-300">...{String(asgn.donationId).slice(-8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Food Request ID:</span>
                      <span className="font-mono text-slate-300">...{String(asgn.requestId).slice(-8)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-surface-border/50">
                      <span>Dispatched:</span>
                      <span>{formatDateTime(asgn.assignedAt || asgn.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* State Machine Transition Actions */}
                <div className="pt-3 border-t border-surface-border flex flex-wrap items-center justify-between gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedAssignment(asgn)}
                    className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                  >
                    <Eye size={13} /> Mission Details
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* PENDING -> Accept or Decline */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => runTransition(asgn._id, rejectAssignment, 'Assignment declined.', 'Decline this rescue assignment?')}
                          disabled={actionLoading === asgn._id}
                          className="btn-secondary text-xs py-1.5 px-2.5 text-red-400 hover:text-red-300"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => runTransition(asgn._id, acceptAssignment, 'Assignment accepted! Prepare for pickup.')}
                          disabled={actionLoading === asgn._id}
                          className="btn-primary text-xs py-1.5 px-3 bg-brand-600 hover:bg-brand-500 flex items-center gap-1"
                        >
                          {actionLoading === asgn._id ? <Spinner size={12} /> : <><CheckCircle2 size={13} /> Accept</>}
                        </button>
                      </>
                    )}

                    {/* ACCEPTED -> Start Pickup or Cancel */}
                    {isAccepted && (
                      <>
                        <button
                          type="button"
                          onClick={() => runTransition(asgn._id, cancelAssignment, 'Assignment cancelled.', 'Are you sure you want to cancel this mission?')}
                          disabled={actionLoading === asgn._id}
                          className="btn-secondary text-xs py-1.5 px-2 text-red-400 hover:text-red-300"
                          title="Cancel Mission"
                        >
                          {actionLoading === asgn._id ? <Spinner size={12} /> : <XCircle size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => runTransition(asgn._id, startPickup, 'Pickup started! Head to donor location.')}
                          disabled={actionLoading === asgn._id}
                          className="btn-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-500 flex items-center gap-1"
                        >
                          {actionLoading === asgn._id ? <Spinner size={12} /> : <><Truck size={13} /> Start Pickup</>}
                        </button>
                      </>
                    )}

                    {/* PICKUP_STARTED -> Confirm Picked Up or Cancel */}
                    {isPickupStarted && (
                      <>
                        <button
                          type="button"
                          onClick={() => runTransition(asgn._id, cancelAssignment, 'Assignment cancelled.', 'Are you sure you want to cancel this mission?')}
                          disabled={actionLoading === asgn._id}
                          className="btn-secondary text-xs py-1.5 px-2 text-red-400 hover:text-red-300"
                          title="Cancel Mission"
                        >
                          {actionLoading === asgn._id ? <Spinner size={12} /> : <XCircle size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => runTransition(asgn._id, confirmPickedUp, 'Food collected from donor! Ready for delivery.')}
                          disabled={actionLoading === asgn._id}
                          className="btn-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-500 flex items-center gap-1"
                        >
                          {actionLoading === asgn._id ? <Spinner size={12} /> : <><PackageCheck size={13} /> Picked Up</>}
                        </button>
                      </>
                    )}

                    {/* PICKED_UP -> Start Delivery */}
                    {isPickedUp && (
                      <button
                        type="button"
                        onClick={() => runTransition(asgn._id, startDelivery, 'Delivery started! In transit to center.')}
                        disabled={actionLoading === asgn._id}
                        className="btn-primary text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500 flex items-center gap-1"
                      >
                        {actionLoading === asgn._id ? <Spinner size={12} /> : <><Send size={13} /> Start Delivery</>}
                      </button>
                    )}

                    {/* DELIVERY_STARTED -> Confirm Delivered */}
                    {isDeliveryStarted && (
                      <button
                        type="button"
                        onClick={() => runTransition(asgn._id, confirmDelivered, 'Food safely delivered at recipient center!')}
                        disabled={actionLoading === asgn._id}
                        className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                      >
                        {actionLoading === asgn._id ? <Spinner size={12} /> : <><CheckCircle2 size={13} /> Confirm Delivered</>}
                      </button>
                    )}

                    {/* DELIVERED -> Waiting for Org Admin Verification */}
                    {isDelivered && (
                      <span className="text-[11px] text-emerald-400 font-medium px-2 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded-md">
                        Delivered — Awaiting Org Verification
                      </span>
                    )}

                    {/* COMPLETED */}
                    {isCompleted && (
                      <span className="text-[11px] text-brand-300 font-medium px-2 py-1 bg-brand-950/40 border border-brand-800/40 rounded-md">
                        ✓ Mission Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      <AssignmentDetailsModal
        assignment={selectedAssignment}
        isOpen={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        onUpdated={() => fetchAssignments()}
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, Eye, XCircle, Award } from 'lucide-react';
import { listAssignments, cancelAssignment, completeAssignment } from '../../services/assignmentService';
import { ASSIGNMENT_STATUSES } from '../../utils/constants';
import { assignmentStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import IdChip from '../../components/common/IdChip';
import AssignmentDetailsModal from '../../components/assignments/AssignmentDetailsModal';

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleCancel = async (id) => {
    if (!window.confirm('Admin Action: Cancel this logistics mission?')) return;
    setActionLoading(id);
    setError(null);
    try {
      await cancelAssignment(id);
      setSuccessMsg('Assignment cancelled by Admin.');
      fetchAssignments();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await completeAssignment(id);
      setSuccessMsg('Assignment completed and verified by Admin.');
      fetchAssignments();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = assignments.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(item.donationId)?.toLowerCase().includes(term) ||
      String(item.requestId)?.toLowerCase().includes(term) ||
      String(item.volunteerUserId)?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Platform Rescue Missions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global monitoring of all volunteer rescue pickups, deliveries, and fulfillment status.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      <div className="card p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID (Donation, Request, Volunteer)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 text-xs sm:text-sm font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400 hidden sm:block shrink-0" />
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

          <button
            type="button"
            onClick={fetchAssignments}
            title="Refresh"
            className="btn-secondary px-3 py-2 shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && assignments.length === 0 ? (
        <div className="card flex items-center justify-center h-48"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No missions found" description="No platform assignments match your criteria." />
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quantity</th>
                <th>Mission ID</th>
                <th>Donation ID</th>
                <th>Request ID</th>
                <th>Volunteer ID</th>
                <th>Status</th>
                <th>Assigned Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="font-bold text-slate-900 dark:text-slate-100">
                    {a.quantity} <span className="text-xs font-normal text-slate-500 uppercase">{a.unit}</span>
                  </td>
                  <td>
                    <IdChip id={a._id} prefix="MIS" />
                  </td>
                  <td>
                    <IdChip id={a.donationId} prefix="DON" />
                  </td>
                  <td>
                    <IdChip id={a.requestId} prefix="REQ" />
                  </td>
                  <td>
                    <IdChip id={a.volunteerUserId} prefix="VOL" />
                  </td>
                  <td>
                    <Badge variant={assignmentStatusBadge(a.status)}>{a.status}</Badge>
                  </td>
                  <td className="text-xs text-slate-500 font-medium">{formatDate(a.assignedAt || a.createdAt)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedAssignment(a)}
                        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        <Eye size={13} /> View
                      </button>
                      {a.status === ASSIGNMENT_STATUSES.DELIVERED && (
                        <button
                          type="button"
                          onClick={() => handleComplete(a._id)}
                          disabled={actionLoading === a._id}
                          className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                          title="Complete Assignment"
                        >
                          {actionLoading === a._id ? <Spinner size={12} /> : <><Award size={13} /> Complete</>}
                        </button>
                      )}
                      {[ASSIGNMENT_STATUSES.PENDING, ASSIGNMENT_STATUSES.ACCEPTED, ASSIGNMENT_STATUSES.PICKUP_STARTED].includes(a.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(a._id)}
                          disabled={actionLoading === a._id}
                          className="btn-secondary text-xs py-1 px-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Cancel Mission"
                        >
                          {actionLoading === a._id ? <Spinner size={12} /> : <XCircle size={13} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssignmentDetailsModal
        assignment={selectedAssignment}
        isOpen={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        onUpdated={() => fetchAssignments()}
      />
    </div>
  );
}

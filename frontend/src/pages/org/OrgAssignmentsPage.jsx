import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, RefreshCw, Eye, XCircle, Award, Truck, Layers, CheckCircle2, Clock } from 'lucide-react';
import { listAssignments, cancelAssignment, completeAssignment } from '../../services/assignmentService';
import { listDonations } from '../../services/donationService';
import { ASSIGNMENT_STATUSES } from '../../utils/constants';
import { assignmentStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import IdChip from '../../components/common/IdChip';
import { FoodCategoryIndicator } from '../../components/common/FoodTags';
import AssignmentFormModal from '../../components/assignments/AssignmentFormModal';
import AssignmentDetailsModal from '../../components/assignments/AssignmentDetailsModal';

const ACTIVE_ASSIGNMENT_STATUSES = [
  ASSIGNMENT_STATUSES.PENDING,
  ASSIGNMENT_STATUSES.ACCEPTED,
  ASSIGNMENT_STATUSES.PICKUP_STARTED,
  ASSIGNMENT_STATUSES.PICKED_UP,
  ASSIGNMENT_STATUSES.DELIVERY_STARTED,
  ASSIGNMENT_STATUSES.DELIVERED,
];

export default function OrgAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [unassignedAllocations, setUnassignedAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'allocations'
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [selectedAllocationForDispatch, setSelectedAllocationForDispatch] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [asgnData, donData] = await Promise.all([
        listAssignments(params),
        listDonations({ limit: 100 }).catch(() => [])
      ]);

      const asgnList = Array.isArray(asgnData) ? asgnData : (asgnData?.assignments || []);
      setAssignments(asgnList);

      // Find unassigned allocations from donations
      const donList = Array.isArray(donData) ? donData : (donData?.donations || []);
      const activePairs = new Set(
        asgnList
          .filter((a) => ACTIVE_ASSIGNMENT_STATUSES.includes(a.status))
          .map((a) => `${String(a.donationId)}_${String(a.requestId)}`)
      );

      const unassigned = [];
      donList.forEach((donation) => {
        (donation.allocations || []).forEach((alloc) => {
          const pairKey = `${String(donation._id)}_${String(alloc.requestId)}`;
          if (!activePairs.has(pairKey)) {
            unassigned.push({
              donationId: String(donation._id),
              requestId: String(alloc.requestId),
              quantity: alloc.quantity,
              unit: donation.unit,
              foodCategory: donation.foodCategory,
              allocatedAt: alloc.createdAt || donation.createdAt,
            });
          }
        });
      });
      setUnassignedAllocations(unassigned);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this assignment?')) return;
    setActionLoading(id);
    setError(null);
    try {
      await cancelAssignment(id);
      setSuccessMsg('Assignment cancelled.');
      fetchData();
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
      setSuccessMsg('Assignment verified and completed successfully!');
      fetchData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatchAllocation = (alloc) => {
    setSelectedAllocationForDispatch(alloc);
    setIsDispatchOpen(true);
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

  const pendingCount = assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.PENDING).length;
  const inTransitCount = assignments.filter((a) => [
    ASSIGNMENT_STATUSES.ACCEPTED,
    ASSIGNMENT_STATUSES.PICKUP_STARTED,
    ASSIGNMENT_STATUSES.PICKED_UP,
    ASSIGNMENT_STATUSES.DELIVERY_STARTED
  ].includes(a.status)).length;
  const deliveredCount = assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.DELIVERED).length;
  const completedCount = assignments.filter((a) => a.status === ASSIGNMENT_STATUSES.COMPLETED).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="page-title">Delivery & Logistics Dispatch</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch verified volunteers to transport claimed food donations to your center and confirm receipts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedAllocationForDispatch(null);
            setIsDispatchOpen(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} /> Create Assignment
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Pending Acceptance</span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black font-display text-slate-900 dark:text-slate-100 mt-1">{loading ? '...' : pendingCount}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>In Transit</span>
            <Truck size={15} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black font-display text-slate-900 dark:text-slate-100 mt-1">{loading ? '...' : inTransitCount}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Delivered (Verify)</span>
            <Award size={15} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-display text-slate-900 dark:text-slate-100 mt-1">{loading ? '...' : deliveredCount}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Completed</span>
            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-display text-slate-900 dark:text-slate-100 mt-1">{loading ? '...' : completedCount}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-surface-border">
        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'assignments'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck size={14} /> All Assignments ({assignments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('allocations')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'allocations'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={14} /> Allocations Ready to Assign ({unassignedAllocations.length})
        </button>
      </div>

      {/* Tab 1: All Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Filter toolbar */}
          <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by ID (Donation, Request, Volunteer)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-9 font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-500 hidden sm:block" />
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
                onClick={fetchData}
                title="Refresh"
                className="btn-secondary px-3 py-2"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Assignments table */}
          {loading && assignments.length === 0 ? (
            <div className="card flex items-center justify-center h-48">
              <Spinner size={28} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No assignments found"
              description={searchTerm || statusFilter ? 'Try clearing your filters.' : 'No volunteer assignments have been created yet.'}
              actionLabel="Create Assignment from Allocation"
              onAction={() => {
                setSelectedAllocationForDispatch(null);
                setIsDispatchOpen(true);
              }}
            />
          ) : (
            <div className="overflow-x-auto card p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quantity</th>
                    <th>Donation ID</th>
                    <th>Request ID</th>
                    <th>Volunteer ID</th>
                    <th>Status</th>
                    <th>Assigned Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asgn) => {
                    const canCancel = [
                      ASSIGNMENT_STATUSES.PENDING,
                      ASSIGNMENT_STATUSES.ACCEPTED,
                      ASSIGNMENT_STATUSES.PICKUP_STARTED
                    ].includes(asgn.status);
                    const canComplete = asgn.status === ASSIGNMENT_STATUSES.DELIVERED;

                    return (
                      <tr key={asgn._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="font-bold text-slate-900 dark:text-slate-100">
                          {asgn.quantity} <span className="text-xs font-normal text-slate-500 uppercase">{asgn.unit}</span>
                        </td>
                        <td>
                          <IdChip id={asgn.donationId} prefix="DON" />
                        </td>
                        <td>
                          <IdChip id={asgn.requestId} prefix="REQ" />
                        </td>
                        <td>
                          <IdChip id={asgn.volunteerUserId} prefix="VOL" />
                        </td>
                        <td>
                          <Badge variant={assignmentStatusBadge(asgn.status)}>{asgn.status}</Badge>
                        </td>
                        <td className="text-xs text-slate-500 font-medium">
                          {formatDate(asgn.assignedAt || asgn.createdAt)}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAssignment(asgn)}
                              className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                              title="View Mission Details"
                            >
                              <Eye size={13} /> View
                            </button>

                            {canComplete && (
                              <button
                                type="button"
                                onClick={() => handleComplete(asgn._id)}
                                disabled={actionLoading === asgn._id}
                                className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                                title="Complete Assignment"
                              >
                                {actionLoading === asgn._id ? <Spinner size={12} /> : <><Award size={13} /> Complete</>}
                              </button>
                            )}

                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => handleCancel(asgn._id)}
                                disabled={actionLoading === asgn._id}
                                className="btn-secondary text-xs py-1 px-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                title="Cancel Assignment"
                              >
                                {actionLoading === asgn._id ? <Spinner size={12} /> : <XCircle size={13} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Allocations Ready for Assignment */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
            These are active surplus allocations claimed for your requests that do not yet have a volunteer driver dispatched. Click <strong>Dispatch Volunteer</strong> to assign a mission.
          </div>

          {unassignedAllocations.length === 0 ? (
            <EmptyState
              title="No unassigned allocations"
              description="All current allocations already have active volunteer missions dispatched or no allocations are pending."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedAllocations.map((alloc, idx) => (
                <div key={idx} className="card flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <FoodCategoryIndicator category={alloc.foodCategory} />
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          {alloc.foodCategory ? alloc.foodCategory.replace(/_/g, ' ') : 'Food Surplus'}
                        </span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold">
                        Ready to Dispatch
                      </span>
                    </div>

                    <h3 className="text-xl font-black font-display text-slate-900 dark:text-slate-100 mt-1">
                      {alloc.quantity} <span className="text-sm font-semibold text-slate-500 uppercase">{alloc.unit}</span>
                    </h3>

                    <div className="mt-3 p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/90 dark:border-slate-700/80 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Claimed Donation:</span>
                        <IdChip id={alloc.donationId} prefix="DON" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Target Request:</span>
                        <IdChip id={alloc.requestId} prefix="REQ" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDispatchAllocation(alloc)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Truck size={14} /> Dispatch Volunteer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AssignmentFormModal
        isOpen={isDispatchOpen}
        initialAllocation={selectedAllocationForDispatch}
        onClose={() => {
          setIsDispatchOpen(false);
          setSelectedAllocationForDispatch(null);
        }}
        onSuccess={() => {
          setSuccessMsg('Assignment dispatched to volunteer in PENDING status.');
          setActiveTab('assignments');
          fetchData();
        }}
      />

      <AssignmentDetailsModal
        assignment={selectedAssignment}
        isOpen={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        onUpdated={() => fetchData()}
      />
    </div>
  );
}

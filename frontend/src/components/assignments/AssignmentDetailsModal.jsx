import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Spinner from '../common/Spinner';
import Alert from '../common/Alert';
import { useAuth } from '../../hooks/useAuth';
import {
  acceptAssignment,
  rejectAssignment,
  cancelAssignment,
  startPickup,
  confirmPickedUp,
  startDelivery,
  confirmDelivered,
  completeAssignment,
  getAssignment
} from '../../services/assignmentService';
import { ASSIGNMENT_STATUSES, USER_ROLES } from '../../utils/constants';
import { assignmentStatusBadge, formatDateTime, extractErrorMessage } from '../../utils/formatters';
import { CheckCircle2, Truck, PackageCheck, Send, ShieldAlert, Award, XCircle, RotateCcw } from 'lucide-react';

const PROGRESS_STEPS = [
  { key: ASSIGNMENT_STATUSES.PENDING, label: 'Assigned' },
  { key: ASSIGNMENT_STATUSES.ACCEPTED, label: 'Accepted' },
  { key: ASSIGNMENT_STATUSES.PICKUP_STARTED, label: 'Pickup Started' },
  { key: ASSIGNMENT_STATUSES.PICKED_UP, label: 'Picked Up' },
  { key: ASSIGNMENT_STATUSES.DELIVERY_STARTED, label: 'Delivery Started' },
  { key: ASSIGNMENT_STATUSES.DELIVERED, label: 'Delivered' },
  { key: ASSIGNMENT_STATUSES.COMPLETED, label: 'Completed' },
];

export default function AssignmentDetailsModal({ assignment, isOpen, onClose, onUpdated }) {
  const { user } = useAuth();
  const [currentAssignment, setCurrentAssignment] = useState(assignment);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    setCurrentAssignment(assignment);
    setError(null);
    setSuccessMsg(null);
  }, [assignment, isOpen]);

  if (!isOpen || !currentAssignment) return null;

  const isVolunteer = user?.role === USER_ROLES.VOLUNTEER && String(currentAssignment.volunteerUserId) === String(user?._id);
  const isOrgAdminOrAdmin = user?.role === USER_ROLES.ORG_ADMIN || user?.role === USER_ROLES.ADMIN;

  const currentStatus = currentAssignment.status;
  const isTerminal = [
    ASSIGNMENT_STATUSES.COMPLETED,
    ASSIGNMENT_STATUSES.REJECTED,
    ASSIGNMENT_STATUSES.CANCELLED,
    ASSIGNMENT_STATUSES.FAILED
  ].includes(currentStatus);

  const stepIndex = PROGRESS_STEPS.findIndex((s) => s.key === currentStatus);

  const executeAction = async (actionFn, successText, promptConfirm) => {
    if (promptConfirm && !window.confirm(promptConfirm)) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await actionFn(currentAssignment._id);
      // Immediately refetch from backend to ensure source of truth
      const fresh = await getAssignment(currentAssignment._id);
      setCurrentAssignment(fresh);
      setSuccessMsg(successText);
      onUpdated?.(fresh);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assignment Mission Details" maxWidth="max-w-2xl">
      <div className="space-y-5 text-sm">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

        {/* Mission Payload & Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-surface rounded-xl border border-surface-border gap-3">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block">Mission Payload (Fixed)</span>
            <p className="text-xl font-bold text-slate-100 mt-0.5">
              {currentAssignment.quantity} {currentAssignment.unit}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 select-all">
              Assignment ID: {currentAssignment._id}
            </p>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Current State</span>
            <Badge variant={assignmentStatusBadge(currentStatus)}>{currentStatus}</Badge>
          </div>
        </div>

        {/* Linear Progress Stepper */}
        {!['REJECTED', 'CANCELLED', 'FAILED'].includes(currentStatus) && (
          <div className="p-4 bg-surface/50 rounded-xl border border-surface-border">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Rescue Pipeline</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {PROGRESS_STEPS.map((step, idx) => {
                const isPassed = stepIndex >= idx;
                const isCurrent = stepIndex === idx;

                return (
                  <div
                    key={step.key}
                    className={`p-2 rounded-lg text-center border transition-all ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 font-semibold'
                        : isPassed
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                        : 'bg-surface border-surface-border/60 text-slate-500'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider opacity-70">Step {idx + 1}</div>
                    <div className="text-xs mt-0.5 truncate" title={step.label}>{step.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Terminal Alerts */}
        {currentStatus === ASSIGNMENT_STATUSES.REJECTED && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Assignment Declined by Volunteer</p>
              <p className="text-red-300/80 mt-0.5">
                The assigned volunteer rejected this mission at {formatDateTime(currentAssignment.rejectedAt)}. The organization can re-assign another volunteer from the allocation.
              </p>
            </div>
          </div>
        )}

        {currentStatus === ASSIGNMENT_STATUSES.CANCELLED && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
            <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Assignment Cancelled</p>
              <p className="text-red-300/80 mt-0.5">
                This mission was cancelled at {formatDateTime(currentAssignment.cancelledAt)}.
              </p>
            </div>
          </div>
        )}

        {currentStatus === ASSIGNMENT_STATUSES.FAILED && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Mission Marked as Failed</p>
              <p className="text-red-300/80 mt-0.5">
                Failure recorded at {formatDateTime(currentAssignment.failedAt)}.
                {currentAssignment.failureReason && <span> Reason: &quot;{currentAssignment.failureReason}&quot;</span>}
              </p>
            </div>
          </div>
        )}

        {currentStatus === ASSIGNMENT_STATUSES.COMPLETED && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
            <Award size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">Mission Fully Completed & Verified</p>
              <p className="text-emerald-300/80 mt-0.5">
                Food successfully delivered and verified by recipient organization on {formatDateTime(currentAssignment.completedAt)}.
              </p>
            </div>
          </div>
        )}

        {/* Resources metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-surface/50 rounded-lg border border-surface-border">
            <p className="text-slate-500 uppercase tracking-wider text-[10px]">Source Donation ID</p>
            <p className="font-mono text-slate-300 mt-1 break-all select-all">{currentAssignment.donationId}</p>
          </div>
          <div className="p-3 bg-surface/50 rounded-lg border border-surface-border">
            <p className="text-slate-500 uppercase tracking-wider text-[10px]">Destination Food Request ID</p>
            <p className="font-mono text-slate-300 mt-1 break-all select-all">{currentAssignment.requestId}</p>
          </div>
          <div className="p-3 bg-surface/50 rounded-lg border border-surface-border">
            <p className="text-slate-500 uppercase tracking-wider text-[10px]">Assigned Volunteer User ID</p>
            <p className="font-mono text-slate-300 mt-1 break-all select-all">{currentAssignment.volunteerUserId}</p>
          </div>
          <div className="p-3 bg-surface/50 rounded-lg border border-surface-border">
            <p className="text-slate-500 uppercase tracking-wider text-[10px]">Dispatched At</p>
            <p className="text-slate-200 mt-1">{formatDateTime(currentAssignment.assignedAt || currentAssignment.createdAt)}</p>
          </div>
        </div>

        {/* Milestone Timestamps */}
        <div className="p-3.5 bg-surface/40 rounded-xl border border-surface-border text-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Milestone Timestamps</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">Accepted:</span>
              <span className="text-slate-200">{formatDateTime(currentAssignment.acceptedAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Pickup Started:</span>
              <span className="text-slate-200">{formatDateTime(currentAssignment.pickupStartedAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Picked Up:</span>
              <span className="text-slate-200">{formatDateTime(currentAssignment.pickedUpAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Delivery Started:</span>
              <span className="text-slate-200">{formatDateTime(currentAssignment.deliveryStartedAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Delivered:</span>
              <span className="text-slate-200">{formatDateTime(currentAssignment.deliveredAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Completed:</span>
              <span className="text-slate-200">{formatDateTime(currentAssignment.completedAt)}</span>
            </div>
          </div>
        </div>

        {/* Status History Log */}
        {currentAssignment.statusHistory && currentAssignment.statusHistory.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Audit Transition Log</p>
            <div className="border-l-2 border-surface-border pl-3 space-y-2 text-xs max-h-40 overflow-y-auto">
              {currentAssignment.statusHistory.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-surface-card" />
                  <p className="font-semibold text-slate-200">{item.status}</p>
                  <p className="text-slate-500 text-[11px]">{formatDateTime(item.at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State Machine Transition Action Toolbar */}
        <div className="pt-4 border-t border-surface-border flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* VOLUNTEER Actions */}
            {isVolunteer && !isTerminal && (
              <>
                {currentStatus === ASSIGNMENT_STATUSES.PENDING && (
                  <>
                    <button
                      type="button"
                      onClick={() => executeAction(rejectAssignment, 'Assignment declined.', 'Decline this rescue assignment?')}
                      disabled={actionLoading}
                      className="btn-secondary text-xs py-1.5 px-3 text-red-400 hover:text-red-300"
                    >
                      {actionLoading ? <Spinner size={12} /> : 'Decline'}
                    </button>
                    <button
                      type="button"
                      onClick={() => executeAction(acceptAssignment, 'Assignment accepted! Prepare for pickup.')}
                      disabled={actionLoading}
                      className="btn-primary text-xs py-1.5 px-3 bg-brand-600 hover:bg-brand-500"
                    >
                      {actionLoading ? <Spinner size={12} /> : <><CheckCircle2 size={13} /> Accept Mission</>}
                    </button>
                  </>
                )}

                {currentStatus === ASSIGNMENT_STATUSES.ACCEPTED && (
                  <>
                    <button
                      type="button"
                      onClick={() => executeAction(cancelAssignment, 'Assignment cancelled.', 'Are you sure you want to cancel this mission?')}
                      disabled={actionLoading}
                      className="btn-secondary text-xs py-1.5 px-2.5 text-red-400 hover:text-red-300"
                    >
                      {actionLoading ? <Spinner size={12} /> : 'Cancel Mission'}
                    </button>
                    <button
                      type="button"
                      onClick={() => executeAction(startPickup, 'Pickup started! Head to the donor location.')}
                      disabled={actionLoading}
                      className="btn-primary text-xs py-1.5 px-3.5 bg-blue-600 hover:bg-blue-500"
                    >
                      {actionLoading ? <Spinner size={12} /> : <><Truck size={13} /> Start Pickup</>}
                    </button>
                  </>
                )}

                {currentStatus === ASSIGNMENT_STATUSES.PICKUP_STARTED && (
                  <>
                    <button
                      type="button"
                      onClick={() => executeAction(cancelAssignment, 'Assignment cancelled.', 'Are you sure you want to cancel this mission?')}
                      disabled={actionLoading}
                      className="btn-secondary text-xs py-1.5 px-2.5 text-red-400 hover:text-red-300"
                    >
                      {actionLoading ? <Spinner size={12} /> : 'Cancel Mission'}
                    </button>
                    <button
                      type="button"
                      onClick={() => executeAction(confirmPickedUp, 'Food confirmed picked up from donor.')}
                      disabled={actionLoading}
                      className="btn-primary text-xs py-1.5 px-3.5 bg-blue-600 hover:bg-blue-500"
                    >
                      {actionLoading ? <Spinner size={12} /> : <><PackageCheck size={13} /> Confirm Picked Up</>}
                    </button>
                  </>
                )}

                {currentStatus === ASSIGNMENT_STATUSES.PICKED_UP && (
                  <button
                    type="button"
                    onClick={() => executeAction(startDelivery, 'Delivery started! In transit to destination.')}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-1.5 px-3.5 bg-amber-600 hover:bg-amber-500"
                  >
                    {actionLoading ? <Spinner size={12} /> : <><Send size={13} /> Start Delivery</>}
                  </button>
                )}

                {currentStatus === ASSIGNMENT_STATUSES.DELIVERY_STARTED && (
                  <button
                    type="button"
                    onClick={() => executeAction(confirmDelivered, 'Food marked as delivered at recipient center!')}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {actionLoading ? <Spinner size={12} /> : <><CheckCircle2 size={13} /> Confirm Delivered</>}
                  </button>
                )}
              </>
            )}

            {/* ORG_ADMIN / ADMIN Actions */}
            {isOrgAdminOrAdmin && !isTerminal && (
              <>
                {currentStatus === ASSIGNMENT_STATUSES.DELIVERED && (
                  <button
                    type="button"
                    onClick={() => executeAction(completeAssignment, 'Assignment verified and marked COMPLETED!')}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {actionLoading ? <Spinner size={12} /> : <><Award size={14} /> Complete Assignment</>}
                  </button>
                )}

                {[ASSIGNMENT_STATUSES.PENDING, ASSIGNMENT_STATUSES.ACCEPTED, ASSIGNMENT_STATUSES.PICKUP_STARTED].includes(currentStatus) && (
                  <button
                    type="button"
                    onClick={() => executeAction(cancelAssignment, 'Assignment cancelled.', 'Are you sure you want to cancel this assignment?')}
                    disabled={actionLoading}
                    className="btn-secondary text-xs py-1.5 px-2.5 text-red-400 hover:text-red-300"
                  >
                    {actionLoading ? <Spinner size={12} /> : <><RotateCcw size={13} /> Cancel Assignment</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

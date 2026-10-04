import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import { createAssignment, listAssignments, listAvailableVolunteers } from '../../services/assignmentService';
import { listDonations } from '../../services/donationService';
import { extractErrorMessage, formatDate } from '../../utils/formatters';
import { ASSIGNMENT_STATUSES } from '../../utils/constants';
import { Truck, CheckCircle2, UserCheck, Layers, ExternalLink, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ACTIVE_ASSIGNMENT_STATUSES = [
  ASSIGNMENT_STATUSES.PENDING,
  ASSIGNMENT_STATUSES.ACCEPTED,
  ASSIGNMENT_STATUSES.PICKUP_STARTED,
  ASSIGNMENT_STATUSES.PICKED_UP,
  ASSIGNMENT_STATUSES.DELIVERY_STARTED,
  ASSIGNMENT_STATUSES.DELIVERED,
];

export default function AssignmentFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialAllocation = null
}) {
  const [allocationMode, setAllocationMode] = useState('list'); // 'list' | 'manual'
  const [availableAllocations, setAvailableAllocations] = useState([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  // Selected allocation fields
  const [selectedAllocation, setSelectedAllocation] = useState(initialAllocation);
  const [manualDonationId, setManualDonationId] = useState('');
  const [manualRequestId, setManualRequestId] = useState('');
  const [manualQuantity, setManualQuantity] = useState('');

  // Volunteer selection
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [volunteerUserId, setVolunteerUserId] = useState('');
  const [volunteerMode, setVolunteerMode] = useState('select'); // 'select' | 'manual'

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load existing allocations and active volunteers
  const loadPrerequisites = useCallback(async () => {
    setLoadingAllocations(true);
    setLoadingVolunteers(true);
    setError(null);

    try {
      const [donationsRes, assignmentsRes, volunteersRes] = await Promise.all([
        listDonations({ limit: 100 }).catch(() => []),
        listAssignments({ limit: 100 }).catch(() => []),
        listAvailableVolunteers().catch(() => [])
      ]);

      const donationsList = Array.isArray(donationsRes) ? donationsRes : (donationsRes?.donations || []);
      const assignmentsList = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.assignments || []);
      const vols = Array.isArray(volunteersRes) ? volunteersRes : (volunteersRes?.volunteers || []);

      setAvailableVolunteers(vols);
      if (vols.length > 0 && !volunteerUserId) {
        setVolunteerUserId(vols[0]._id);
        setVolunteerMode('select');
      } else if (vols.length === 0) {
        setVolunteerMode('manual');
      }

      // Identify active assignment pairs (donationId + requestId)
      const activePairs = new Set(
        assignmentsList
          .filter((a) => ACTIVE_ASSIGNMENT_STATUSES.includes(a.status))
          .map((a) => `${String(a.donationId)}_${String(a.requestId)}`)
      );

      // Collect all allocations from donations
      const allocs = [];
      donationsList.forEach((donation) => {
        (donation.allocations || []).forEach((alloc) => {
          const pairKey = `${String(donation._id)}_${String(alloc.requestId)}`;
          const hasActive = activePairs.has(pairKey);

          allocs.push({
            donationId: String(donation._id),
            requestId: String(alloc.requestId),
            quantity: alloc.quantity,
            unit: donation.unit,
            foodCategory: donation.foodCategory,
            allocatedAt: alloc.createdAt || donation.createdAt,
            hasActiveAssignment: hasActive,
          });
        });
      });

      setAvailableAllocations(allocs);

      if (initialAllocation) {
        setSelectedAllocation(initialAllocation);
        setAllocationMode('list');
      } else {
        const unassigned = allocs.filter((a) => !a.hasActiveAssignment);
        if (unassigned.length > 0) {
          setSelectedAllocation(unassigned[0]);
          setAllocationMode('list');
        } else if (allocs.length > 0) {
          setSelectedAllocation(allocs[0]);
          setAllocationMode('list');
        } else {
          setAllocationMode('manual');
        }
      }
    } catch {
      setAllocationMode('manual');
      setVolunteerMode('manual');
    } finally {
      setLoadingAllocations(false);
      setLoadingVolunteers(false);
    }
  }, [initialAllocation, volunteerUserId]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialAllocation) {
        setSelectedAllocation(initialAllocation);
        setManualDonationId(initialAllocation.donationId || '');
        setManualRequestId(initialAllocation.requestId || '');
        setManualQuantity(initialAllocation.quantity ? String(initialAllocation.quantity) : '');
      }
      loadPrerequisites();
    }
  }, [isOpen, initialAllocation, loadPrerequisites]);

  const activeAllocation = useMemo(() => {
    if (allocationMode === 'list') {
      return selectedAllocation;
    }
    return {
      donationId: manualDonationId.trim(),
      requestId: manualRequestId.trim(),
      quantity: manualQuantity ? Number(manualQuantity) : undefined,
      unit: selectedAllocation?.unit || 'units'
    };
  }, [allocationMode, selectedAllocation, manualDonationId, manualRequestId, manualQuantity]);

  const selectedVolunteerObj = useMemo(() => {
    return availableVolunteers.find((v) => String(v._id) === String(volunteerUserId));
  }, [availableVolunteers, volunteerUserId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const donationId = activeAllocation?.donationId?.trim();
    const requestId = activeAllocation?.requestId?.trim();
    const volunteerId = volunteerUserId.trim();
    const quantity = activeAllocation?.quantity ? Number(activeAllocation.quantity) : undefined;

    if (!donationId) {
      setError('A valid source Donation ID is required.');
      return;
    }
    if (!requestId) {
      setError('A valid destination Food Request ID is required.');
      return;
    }
    if (!volunteerId) {
      setError('Please select or enter an eligible Volunteer User ID.');
      return;
    }
    if (!/^[a-f\d]{24}$/i.test(donationId)) {
      setError('Donation ID must be a 24-character hexadecimal ObjectId.');
      return;
    }
    if (!/^[a-f\d]{24}$/i.test(requestId)) {
      setError('Food Request ID must be a 24-character hexadecimal ObjectId.');
      return;
    }
    if (!/^[a-f\d]{24}$/i.test(volunteerId)) {
      setError('Volunteer User ID must be a 24-character hexadecimal ObjectId.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        donationId,
        requestId,
        volunteerUserId: volunteerId,
        ...(quantity !== undefined && !Number.isNaN(quantity) ? { quantity } : {})
      };

      const res = await createAssignment(payload);
      const created = res?.assignment || res;
      onSuccess?.(created);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Volunteer Delivery Assignment"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Workflow Info Banner */}
        <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs text-amber-200/90 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <Truck size={14} /> One-Click Volunteer Dispatch
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Select an existing surplus food allocation and pick an available volunteer driver from the dropdown list.
            No manual ID copy-pasting is required.
          </p>
        </div>

        {/* 1. Allocation Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="form-label mb-0 flex items-center gap-1.5" htmlFor="asgnAllocationSelect">
              <Layers size={14} className="text-brand-400" />
              1. Select Food Allocation
            </label>
            {!initialAllocation && (
              <div className="flex gap-1.5 text-xs">
                {availableAllocations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAllocationMode(allocationMode === 'list' ? 'manual' : 'list')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                  >
                    {allocationMode === 'list' ? 'Switch to manual IDs' : 'Choose from allocations'}
                  </button>
                )}
              </div>
            )}
          </div>

          {loadingAllocations ? (
            <div className="py-4 flex justify-center"><Spinner size={18} /></div>
          ) : allocationMode === 'list' && availableAllocations.length > 0 ? (
            <div className="space-y-2">
              <select
                id="asgnAllocationSelect"
                value={`${selectedAllocation?.donationId}_${selectedAllocation?.requestId}`}
                onChange={(e) => {
                  const found = availableAllocations.find(
                    (a) => `${a.donationId}_${a.requestId}` === e.target.value
                  );
                  if (found) setSelectedAllocation(found);
                }}
                className="form-input text-xs py-2"
                required
              >
                {availableAllocations.map((alloc) => (
                  <option
                    key={`${alloc.donationId}_${alloc.requestId}`}
                    value={`${alloc.donationId}_${alloc.requestId}`}
                    disabled={alloc.hasActiveAssignment}
                  >
                    {alloc.foodCategory ? `${alloc.foodCategory.replace(/_/g, ' ')} — ` : ''}
                    {alloc.quantity} {alloc.unit}
                    {alloc.hasActiveAssignment ? ' (Active Assignment In Progress)' : ' (Ready to Dispatch)'}
                    {' — '}Req ...{alloc.requestId.slice(-6)}
                  </option>
                ))}
              </select>

              {selectedAllocation && (
                <div className="p-3 bg-surface rounded-lg border border-surface-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mission Food Quantity:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {selectedAllocation.quantity} {selectedAllocation.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-surface-border/50">
                    <span>Donation: ...{String(selectedAllocation.donationId).slice(-8)}</span>
                    <span>Request: ...{String(selectedAllocation.requestId).slice(-8)}</span>
                  </div>
                  {selectedAllocation.allocatedAt && (
                    <div className="text-[10px] text-slate-500">
                      Allocated on: {formatDate(selectedAllocation.allocatedAt)}
                    </div>
                  )}
                  {selectedAllocation.hasActiveAssignment && (
                    <div className="text-[11px] text-amber-400 font-medium pt-1">
                      ⚠️ An active assignment already exists for this allocation. Choose an unassigned allocation or cancel the existing run first.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {availableAllocations.length === 0 && (
                <div className="p-3 bg-surface rounded-lg border border-surface-border text-xs text-slate-300 space-y-2">
                  <p className="flex items-center gap-1.5 text-amber-300 font-medium">
                    <HelpCircle size={14} /> No allocations found yet
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    To create an assignment, you first need to claim a surplus food donation for one of your requests.
                  </p>
                  <Link
                    to="/org/donations"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium"
                  >
                    Go to Available Donations to Claim <ExternalLink size={12} />
                  </Link>
                </div>
              )}

              <div className="space-y-2 p-3 bg-surface/50 border border-surface-border rounded-lg text-xs">
                <div>
                  <label className="text-slate-400 block mb-1" htmlFor="manDonationId">
                    Source Donation ID *
                  </label>
                  <input
                    id="manDonationId"
                    type="text"
                    placeholder="24-char ObjectId"
                    value={manualDonationId}
                    onChange={(e) => setManualDonationId(e.target.value)}
                    className="form-input font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1" htmlFor="manRequestId">
                    Destination Food Request ID *
                  </label>
                  <input
                    id="manRequestId"
                    type="text"
                    placeholder="24-char ObjectId"
                    value={manualRequestId}
                    onChange={(e) => setManualRequestId(e.target.value)}
                    className="form-input font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1" htmlFor="manQty">
                    Allocation Quantity *
                  </label>
                  <input
                    id="manQty"
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="Exact allocated quantity"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(e.target.value)}
                    className="form-input text-xs"
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Volunteer Selection */}
        <div className="space-y-2 pt-2 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <label className="form-label mb-0 flex items-center gap-1.5" htmlFor="asgnVolunteerSelect">
              <UserCheck size={14} className="text-brand-400" />
              2. Assign Volunteer Driver
            </label>
            {availableVolunteers.length > 0 && (
              <button
                type="button"
                onClick={() => setVolunteerMode(volunteerMode === 'select' ? 'manual' : 'select')}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                {volunteerMode === 'select' ? 'Enter ID manually' : 'Choose from active list'}
              </button>
            )}
          </div>

          {loadingVolunteers ? (
            <div className="py-3 flex justify-center"><Spinner size={16} /></div>
          ) : volunteerMode === 'select' && availableVolunteers.length > 0 ? (
            <div className="space-y-2">
              <select
                id="asgnVolunteerSelect"
                value={volunteerUserId}
                onChange={(e) => setVolunteerUserId(e.target.value)}
                className="form-input text-xs py-2"
                required
              >
                <option value="">-- Choose an Available Volunteer Driver --</option>
                {availableVolunteers.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.email}) {v.phone ? `• ${v.phone}` : ''} — Available on duty
                  </option>
                ))}
              </select>

              {selectedVolunteerObj && (
                <div className="p-2.5 bg-surface rounded-lg border border-surface-border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block">{selectedVolunteerObj.name}</span>
                    <span className="text-[11px] text-slate-400">{selectedVolunteerObj.email} {selectedVolunteerObj.phone ? `• ${selectedVolunteerObj.phone}` : ''}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[10px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ready on Duty
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {availableVolunteers.length === 0 && (
                <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[11px] text-amber-300/90">
                  ℹ️ No volunteers are currently marked <strong>Available</strong> on duty. You can paste a known Volunteer User ID below, or have a volunteer toggle their duty status to Available on their dashboard.
                </div>
              )}
              <input
                id="asgnVolunteerInput"
                type="text"
                placeholder="Paste Volunteer User ObjectId (e.g. 64f1a2b3c4d5e6f7a8b9c0d3)"
                value={volunteerUserId}
                onChange={(e) => setVolunteerUserId(e.target.value)}
                className="form-input font-mono text-xs"
                required
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 flex justify-end gap-3 border-t border-surface-border">
          <button type="button" onClick={onClose} className="btn-secondary text-xs" disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary text-xs py-2 px-4"
            disabled={submitting || (allocationMode === 'list' && selectedAllocation?.hasActiveAssignment)}
          >
            {submitting ? (
              <span className="flex items-center gap-1.5"><Spinner size={14} /> Dispatching...</span>
            ) : (
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Dispatch Assignment (PENDING)</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

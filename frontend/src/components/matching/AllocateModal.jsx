import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import Badge from '../common/Badge';
import { useAuth } from '../../hooks/useAuth';
import { listFoodRequests, getFoodRequest } from '../../services/foodRequestService';
import { listDonations, getDonation } from '../../services/donationService';
import { allocate } from '../../services/matchingService';
import { FOOD_REQUEST_STATUSES, DONATION_STATUSES, USER_ROLES } from '../../utils/constants';
import { donationStatusBadge, requestStatusBadge, formatDate, formatDateTime, extractErrorMessage } from '../../utils/formatters';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function AllocateModal({ donation: initialDonation, request: initialRequest, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();

  // Mode: if donation is provided, we allocate to a request; if request is provided, we allocate from a donation
  const isDonationSource = Boolean(initialDonation);
  const donation = initialDonation;
  const request = initialRequest;

  // Requests state (when source is donation)
  const [candidateRequests, setCandidateRequests] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [requestMode, setRequestMode] = useState('select'); // 'select' | 'auto' | 'manual'
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [manualRequestId, setManualRequestId] = useState('');

  // Donations state (when source is request)
  const [candidateDonations, setCandidateDonations] = useState([]);
  const [selectedDonationId, setSelectedDonationId] = useState('');
  const [manualDonationId, setManualDonationId] = useState('');
  const [donationMode, setDonationMode] = useState('select'); // 'select' | 'manual'

  // Quantity and submission
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load candidate requests when source is donation
  const loadCandidateRequests = useCallback(async () => {
    if (!donation) return;
    setLoadingCandidates(true);
    setError(null);

    // Only ORG_ADMIN and ADMIN are permitted to list food requests
    if (user?.role === USER_ROLES.DONOR) {
      setRequestMode('auto');
      setLoadingCandidates(false);
      return;
    }

    try {
      const data = await listFoodRequests({ foodCategory: donation.foodCategory });
      const list = Array.isArray(data) ? data : (data?.requests || []);
      const now = new Date();

      // Filter compatible requests according to backend business rules:
      // 1. Status OPEN or PARTIALLY_FULFILLED
      // 2. Matching foodCategory and unit
      // 3. Not expired (neededBy > now)
      // 4. Positive remainingQuantity
      // 5. Not already allocated to this donation
      const alreadyAllocatedIds = new Set(
        (donation.allocations || []).map((a) => String(a.requestId?._id || a.requestId))
      );

      const eligible = list.filter((r) => {
        const isStatusEligible = r.status === FOOD_REQUEST_STATUSES.OPEN || r.status === FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED;
        const isCategoryMatch = r.foodCategory === donation.foodCategory;
        const isUnitMatch = r.unit === donation.unit;
        const isNotExpired = new Date(r.neededBy) > now;
        const hasRemaining = (r.remainingQuantity || 0) > 0.000001;
        const notAllocatedYet = !alreadyAllocatedIds.has(String(r._id));

        return isStatusEligible && isCategoryMatch && isUnitMatch && isNotExpired && hasRemaining && notAllocatedYet;
      });

      setCandidateRequests(eligible);
      if (eligible.length > 0) {
        setRequestMode('select');
        setSelectedRequestId(eligible[0]._id);
      } else {
        setRequestMode('auto');
      }
    } catch {
      // If listFoodRequests fails (e.g., unauthorized), fall back to auto-matching
      setRequestMode('auto');
    } finally {
      setLoadingCandidates(false);
    }
  }, [donation, user]);

  // Load candidate donations when source is request
  const loadCandidateDonations = useCallback(async () => {
    if (!request) return;
    setLoadingCandidates(true);
    setError(null);

    try {
      const data = await listDonations({ foodCategory: request.foodCategory });
      const list = Array.isArray(data) ? data : (data?.donations || []);
      const now = new Date();

      const eligible = list.filter((d) => {
        const isStatusEligible = d.status === DONATION_STATUSES.AVAILABLE || d.status === DONATION_STATUSES.PARTIALLY_ALLOCATED;
        const isCategoryMatch = d.foodCategory === request.foodCategory;
        const isUnitMatch = d.unit === request.unit;
        const isNotExpired = new Date(d.expiresAt) > now;
        const hasRemaining = (d.remainingQuantity || 0) > 0.000001;
        const notAllocatedYet = !(d.allocations || []).some((a) => String(a.requestId?._id || a.requestId) === String(request._id));

        return isStatusEligible && isCategoryMatch && isUnitMatch && isNotExpired && hasRemaining && notAllocatedYet;
      });

      setCandidateDonations(eligible);
      if (eligible.length > 0) {
        setDonationMode('select');
        setSelectedDonationId(eligible[0]._id);
      } else {
        setDonationMode('manual');
      }
    } catch {
      setDonationMode('manual');
    } finally {
      setLoadingCandidates(false);
    }
  }, [request]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (isDonationSource) {
        loadCandidateRequests();
      } else if (request) {
        loadCandidateDonations();
      }
    }
  }, [isOpen, isDonationSource, loadCandidateRequests, loadCandidateDonations, request]);

  // Determine active selected request object
  const activeSelectedRequest = useMemo(() => {
    if (!isDonationSource) return request;
    if (requestMode === 'select') {
      return candidateRequests.find((r) => r._id === selectedRequestId) || null;
    }
    return null;
  }, [isDonationSource, request, requestMode, candidateRequests, selectedRequestId]);

  // Determine active selected donation object
  const activeSelectedDonation = useMemo(() => {
    if (isDonationSource) return donation;
    if (donationMode === 'select') {
      return candidateDonations.find((d) => d._id === selectedDonationId) || null;
    }
    return null;
  }, [isDonationSource, donation, donationMode, candidateDonations, selectedDonationId]);

  // Calculate maximum allowed quantity
  const maxAllowedQuantity = useMemo(() => {
    if (isDonationSource) {
      const donationRem = donation?.remainingQuantity || 0;
      if (activeSelectedRequest) {
        return Math.min(donationRem, activeSelectedRequest.remainingQuantity || donationRem);
      }
      return donationRem;
    } else {
      const requestRem = request?.remainingQuantity || 0;
      if (activeSelectedDonation) {
        return Math.min(requestRem, activeSelectedDonation.remainingQuantity || requestRem);
      }
      return requestRem;
    }
  }, [isDonationSource, donation, request, activeSelectedRequest, activeSelectedDonation]);

  // Sync initial quantity when maxAllowedQuantity changes or on open
  useEffect(() => {
    if (isOpen && maxAllowedQuantity > 0) {
      setQuantity((prev) => {
        if (!prev) return String(maxAllowedQuantity);
        const num = Number(prev);
        if (num > maxAllowedQuantity || !Number.isFinite(num)) {
          return String(maxAllowedQuantity);
        }
        return prev;
      });
    }
  }, [isOpen, maxAllowedQuantity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numQuantity = Number(quantity);
    if (!Number.isFinite(numQuantity) || numQuantity <= 0) {
      setError('Allocation quantity must be a positive number.');
      return;
    }

    let finalDonationId;
    let finalRequestId;

    if (isDonationSource) {
      finalDonationId = donation._id;
      if (numQuantity > (donation.remainingQuantity || 0)) {
        setError(`Quantity cannot exceed donation remaining quantity (${donation.remainingQuantity} ${donation.unit}).`);
        return;
      }

      if (requestMode === 'select') {
        if (!selectedRequestId) {
          setError('Please select a compatible food request.');
          return;
        }
        finalRequestId = selectedRequestId;
        if (activeSelectedRequest && numQuantity > activeSelectedRequest.remainingQuantity) {
          setError(`Quantity cannot exceed request remaining quantity (${activeSelectedRequest.remainingQuantity} ${activeSelectedRequest.unit}).`);
          return;
        }
      } else if (requestMode === 'manual') {
        if (!manualRequestId.trim()) {
          setError('Please enter a valid Food Request ID.');
          return;
        }
        finalRequestId = manualRequestId.trim();
      } else {
        // 'auto' mode: requestId is undefined
        finalRequestId = undefined;
      }
    } else {
      // Source is request
      finalRequestId = request._id;
      if (numQuantity > (request.remainingQuantity || 0)) {
        setError(`Quantity cannot exceed food request remaining quantity (${request.remainingQuantity} ${request.unit}).`);
        return;
      }

      if (donationMode === 'select') {
        if (!selectedDonationId) {
          setError('Please select an available food donation.');
          return;
        }
        finalDonationId = selectedDonationId;
        if (activeSelectedDonation && numQuantity > activeSelectedDonation.remainingQuantity) {
          setError(`Quantity cannot exceed donation remaining quantity (${activeSelectedDonation.remainingQuantity} ${activeSelectedDonation.unit}).`);
          return;
        }
      } else {
        if (!manualDonationId.trim()) {
          setError('Please enter a valid Donation ID.');
          return;
        }
        finalDonationId = manualDonationId.trim();
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        donationId: finalDonationId,
        ...(finalRequestId ? { requestId: finalRequestId } : {}),
        quantity: numQuantity,
      };

      const res = await allocate(payload);
      const allocation = res?.allocation || res;

      // Refetch affected donation and food request directly from backend
      let freshDonation = null;
      let freshRequest = null;

      if (allocation?.donationId) {
        try {
          const dData = await getDonation(allocation.donationId);
          freshDonation = dData?.donation || dData;
        } catch {
          // Permitted user might not have access to getDonation if constrained by org filter
        }
      }

      if (allocation?.requestId) {
        try {
          const rData = await getFoodRequest(allocation.requestId);
          freshRequest = rData?.request || rData;
        } catch {
          // Permitted user might not have access to getFoodRequest (e.g. DONOR)
        }
      }

      onSuccess?.({
        allocation,
        donation: freshDonation,
        request: freshRequest,
      });

      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || (!donation && !request)) return null;

  const unitLabel = isDonationSource ? donation.unit : request.unit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDonationSource ? 'Allocate Food Donation' : 'Fulfill Food Request'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Source overview */}
        {isDonationSource ? (
          <div className="p-3 bg-surface rounded-lg border border-surface-border text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Available Surplus Donation:</span>
              <Badge variant={donationStatusBadge(donation.status)}>{donation.status}</Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-100">
                {donation.foodCategory?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-semibold text-brand-400">
                {donation.remainingQuantity} {donation.unit} remaining
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-surface-border/50">
              <span>Expires: {formatDateTime(donation.expiresAt)}</span>
              <span>Total: {donation.totalQuantity} {donation.unit}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-surface rounded-lg border border-surface-border text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Open Food Request Requirement:</span>
              <Badge variant={requestStatusBadge(request.status)}>{request.status}</Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-100">
                {request.foodCategory?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-semibold text-blue-400">
                {request.remainingQuantity} {request.unit} needed
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-surface-border/50">
              <span>Needed by: {formatDateTime(request.neededBy)}</span>
              <span>Total: {request.totalQuantity} {request.unit}</span>
            </div>
          </div>
        )}

        {/* Target Selection: Food Request (when source is donation) */}
        {isDonationSource && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="form-label mb-0">Target Food Request</label>
              <div className="flex gap-2 text-xs">
                {candidateRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRequestMode('select')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      requestMode === 'select' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Eligible List
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRequestMode('auto')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                    requestMode === 'auto' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles size={11} /> Auto-Match
                </button>
                <button
                  type="button"
                  onClick={() => setRequestMode('manual')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    requestMode === 'manual' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Enter ID
                </button>
              </div>
            </div>

            {loadingCandidates ? (
              <div className="py-4 flex justify-center">
                <Spinner size={18} />
              </div>
            ) : requestMode === 'select' && candidateRequests.length > 0 ? (
              <div className="space-y-2">
                <select
                  id="allocRequestSelect"
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  className="form-input text-xs"
                  required
                >
                  {candidateRequests.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.foodCategory?.replace(/_/g, ' ')} — {r.remainingQuantity} {r.unit} needed (by {formatDate(r.neededBy)})
                      {r.description ? ` — ${r.description}` : ''}
                    </option>
                  ))}
                </select>

                {activeSelectedRequest && (
                  <div className="p-2.5 bg-surface/50 border border-surface-border rounded-lg text-xs flex justify-between items-center text-slate-300">
                    <div>
                      <p className="font-semibold text-slate-200">
                        {activeSelectedRequest.remainingQuantity} {activeSelectedRequest.unit} still required
                      </p>
                      <p className="text-[11px] text-slate-400">Needed by {formatDateTime(activeSelectedRequest.neededBy)}</p>
                    </div>
                    <Badge variant={requestStatusBadge(activeSelectedRequest.status)}>
                      {activeSelectedRequest.status}
                    </Badge>
                  </div>
                )}
              </div>
            ) : requestMode === 'auto' ? (
              <div className="p-3 bg-brand-950/30 border border-brand-800/60 rounded-lg text-xs text-brand-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-brand-300">
                  <Sparkles size={14} /> Backend Smart Matching
                </div>
                <p className="text-[11px] text-slate-300">
                  The backend matching engine will automatically pair this donation with the closest compatible open food request
                  within a 50 km radius ({donation.foodCategory?.replace(/_/g, ' ')} in {donation.unit}).
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  id="manualRequestIdInput"
                  type="text"
                  placeholder="Paste 24-character Food Request ObjectId (e.g. 64b8f...)"
                  value={manualRequestId}
                  onChange={(e) => setManualRequestId(e.target.value)}
                  className="form-input text-xs font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Enter the specific Food Request ID you want to allocate to.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Target Selection: Food Donation (when source is request) */}
        {!isDonationSource && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="form-label mb-0">Select Surplus Food Donation</label>
              <div className="flex gap-2 text-xs">
                {candidateDonations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDonationMode('select')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      donationMode === 'select' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Available ({candidateDonations.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDonationMode('manual')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    donationMode === 'manual' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Enter ID
                </button>
              </div>
            </div>

            {loadingCandidates ? (
              <div className="py-4 flex justify-center">
                <Spinner size={18} />
              </div>
            ) : donationMode === 'select' && candidateDonations.length > 0 ? (
              <div className="space-y-2">
                <select
                  id="allocDonationSelect"
                  value={selectedDonationId}
                  onChange={(e) => setSelectedDonationId(e.target.value)}
                  className="form-input text-xs"
                  required
                >
                  {candidateDonations.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.foodCategory?.replace(/_/g, ' ')} — {d.remainingQuantity} {d.unit} available (expires {formatDate(d.expiresAt)})
                      {d.description ? ` — ${d.description}` : ''}
                    </option>
                  ))}
                </select>

                {activeSelectedDonation && (
                  <div className="p-2.5 bg-surface/50 border border-surface-border rounded-lg text-xs flex justify-between items-center text-slate-300">
                    <div>
                      <p className="font-semibold text-slate-200">
                        {activeSelectedDonation.remainingQuantity} {activeSelectedDonation.unit} surplus remaining
                      </p>
                      <p className="text-[11px] text-slate-400">Expires {formatDateTime(activeSelectedDonation.expiresAt)}</p>
                    </div>
                    <Badge variant={donationStatusBadge(activeSelectedDonation.status)}>
                      {activeSelectedDonation.status}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  id="manualDonationIdInput"
                  type="text"
                  placeholder="Paste 24-character Donation ObjectId (e.g. 64b8f...)"
                  value={manualDonationId}
                  onChange={(e) => setManualDonationId(e.target.value)}
                  className="form-input text-xs font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Enter the specific Donation ID you want to allocate from.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quantity selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0" htmlFor="allocQty">
              Quantity to Allocate ({unitLabel})
            </label>
            <button
              type="button"
              onClick={() => setQuantity(String(maxAllowedQuantity))}
              className="text-xs text-brand-400 hover:text-brand-300 underline font-medium"
            >
              Fill Max ({maxAllowedQuantity} {unitLabel})
            </button>
          </div>

          <div className="relative">
            <input
              id="allocQty"
              type="number"
              min="0.000001"
              max={maxAllowedQuantity || undefined}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="form-input pr-16"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 uppercase">
              {unitLabel}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>
              Max allowable: <strong className="text-slate-200">{maxAllowedQuantity} {unitLabel}</strong>
            </span>
            {isDonationSource && activeSelectedRequest && (
              <span className="text-slate-500">
                (limited by request need: {activeSelectedRequest.remainingQuantity} {unitLabel})
              </span>
            )}
            {!isDonationSource && activeSelectedDonation && (
              <span className="text-slate-500">
                (limited by donation surplus: {activeSelectedDonation.remainingQuantity} {unitLabel})
              </span>
            )}
          </div>
        </div>

        {/* Submit action */}
        <div className="pt-3 flex justify-end gap-3 border-t border-surface-border">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || maxAllowedQuantity <= 0}>
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <Spinner size={16} /> Allocating...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Confirm Allocation
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

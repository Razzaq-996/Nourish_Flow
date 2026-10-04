import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, Eye, ArrowUpRight, Copy } from 'lucide-react';
import { listDonations } from '../../services/donationService';
import { DONATION_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { donationStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import DonationDetailsModal from '../../components/donations/DonationDetailsModal';
import AllocateModal from '../../components/matching/AllocateModal';
import AssignmentFormModal from '../../components/assignments/AssignmentFormModal';

export default function OrgDonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [inspectDonation, setInspectDonation] = useState(null);
  const [allocatingDonation, setAllocatingDonation] = useState(null);
  const [assigningAllocation, setAssigningAllocation] = useState(null);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (categoryFilter) params.foodCategory = categoryFilter;

      const data = await listDonations(params);
      const list = Array.isArray(data) ? data : (data?.donations || []);
      // For org admin, show available or active donations
      setDonations(list);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const filtered = donations.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.foodCategory?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.unit?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div>
        <h2 className="page-title">Available Food Surplus</h2>
        <p className="text-sm text-slate-400 mt-1">
          Browse food listed by donors in your community and claim allocations for your food requests.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by category, food type, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500 hidden sm:block" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-input text-xs py-2 w-auto"
          >
            <option value="">All Categories</option>
            {Object.values(FOOD_CATEGORIES).map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchDonations}
            title="Refresh"
            className="btn-secondary px-3 py-2"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading && donations.length === 0 ? (
        <div className="card flex items-center justify-center h-48">
          <Spinner size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No food donations found"
          description="There are currently no listings matching your criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((donation) => {
            const isEligible = (donation.status === DONATION_STATUSES.AVAILABLE || donation.status === DONATION_STATUSES.PARTIALLY_ALLOCATED) && donation.remainingQuantity > 0;

            return (
              <div
                key={donation._id}
                className="card flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                      {donation.foodCategory?.replace(/_/g, ' ')}
                    </span>
                    <Badge variant={donationStatusBadge(donation.status)}>{donation.status}</Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 line-clamp-1">
                    {donation.description || `${donation.foodCategory?.replace(/_/g, ' ')}`}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-mono">
                    <span className="bg-surface/80 px-1.5 py-0.5 rounded border border-surface-border select-all text-slate-400">
                      ID: {donation._id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(donation._id);
                        setSuccessMsg(`Copied Donation ID ${donation._id} to clipboard!`);
                      }}
                      title="Copy Donation ID"
                      className="hover:text-brand-300 p-0.5 transition-colors text-slate-400"
                    >
                      <Copy size={12} />
                    </button>
                  </div>

                  <div className="mt-3 p-3 bg-surface rounded-lg border border-surface-border space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Remaining Surplus:</span>
                      <span className="font-bold text-brand-300 text-sm">{donation.remainingQuantity} {donation.unit}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Expires:</span>
                      <span className="text-red-400 font-medium">{formatDate(donation.expiresAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setInspectDonation(donation)}
                    className="btn-secondary text-xs py-1.5 px-2.5"
                  >
                    <Eye size={14} /> Details
                  </button>

                  {isEligible && (
                    <button
                      type="button"
                      onClick={() => setAllocatingDonation(donation)}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      <ArrowUpRight size={14} /> Allocate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DonationDetailsModal
        donation={inspectDonation}
        isOpen={Boolean(inspectDonation)}
        onClose={() => setInspectDonation(null)}
        onAllocate={(d) => setAllocatingDonation(d)}
        onAssignVolunteer={(alloc) => setAssigningAllocation(alloc)}
      />

      <AllocateModal
        donation={allocatingDonation}
        isOpen={Boolean(allocatingDonation)}
        onClose={() => setAllocatingDonation(null)}
        onSuccess={({ allocation, donation: freshDonation }) => {
          const qty = allocation?.quantity ?? '';
          const unit = allocation?.unit ?? '';
          const rem = freshDonation?.remainingQuantity ?? allocation?.donation?.remainingQuantity ?? '0';
          const newStatus = freshDonation?.status ?? allocation?.donation?.status ?? '';
          setSuccessMsg(`Donation allocated successfully! Claimed ${qty} ${unit}. Remaining surplus: ${rem} ${unit} (${newStatus}).`);
          fetchDonations();
          if (inspectDonation && freshDonation && inspectDonation._id === freshDonation._id) {
            setInspectDonation(freshDonation);
          }
        }}
      />

      <AssignmentFormModal
        isOpen={Boolean(assigningAllocation)}
        initialAllocation={assigningAllocation}
        onClose={() => setAssigningAllocation(null)}
        onSuccess={() => {
          setSuccessMsg('Volunteer assignment successfully created and dispatched!');
          fetchDonations();
        }}
      />
    </div>
  );
}

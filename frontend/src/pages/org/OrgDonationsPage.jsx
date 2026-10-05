import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, Eye, ArrowUpRight, MapPin } from 'lucide-react';
import { listDonations } from '../../services/donationService';
import { DONATION_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { donationStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import IdChip from '../../components/common/IdChip';
import { FoodCategoryIndicator, ExpiryUrgencyPill } from '../../components/common/FoodTags';
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
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Browse verified surplus food offered by community donors and claim allocations for your food requests.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Category Pills Bar (Swiggy / Zomato style quick categories) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 border select-none ${
            categoryFilter === ''
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          All Surplus
        </button>
        {Object.values(FOOD_CATEGORIES).map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(isSelected ? '' : cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 border select-none ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <FoodCategoryIndicator category={cat} />
              <span>{cat.replace(/_/g, ' ')}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="card p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by category, food type, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDonations}
            title="Refresh Surplus Listings"
            className="btn-secondary px-3 py-2 shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
          description="There are currently no listings matching your criteria or category filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((donation) => {
            const isEligible = (donation.status === DONATION_STATUSES.AVAILABLE || donation.status === DONATION_STATUSES.PARTIALLY_ALLOCATED) && donation.remainingQuantity > 0;

            return (
              <div
                key={donation._id}
                className="card flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <FoodCategoryIndicator category={donation.foodCategory} />
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        {donation.foodCategory?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <Badge variant={donationStatusBadge(donation.status)}>{donation.status}</Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug">
                    {donation.description || `${donation.foodCategory?.replace(/_/g, ' ')} batch`}
                  </h3>

                  <div className="flex items-center gap-2 mt-1.5">
                    <IdChip id={donation._id} prefix="ID" />
                    {donation.pickupLocation?.addressText && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[150px]">
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        {donation.pickupLocation.addressText}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/90 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Available Surplus</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black font-display text-emerald-700 dark:text-emerald-400">
                          {donation.remainingQuantity}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                          {donation.unit}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>Total: {donation.totalQuantity} {donation.unit}</span>
                      <ExpiryUrgencyPill expiresAt={donation.expiresAt} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setInspectDonation(donation)}
                    className="btn-secondary text-xs py-1.5 px-2.5"
                  >
                    <Eye size={13} /> View Details
                  </button>

                  {isEligible && (
                    <button
                      type="button"
                      onClick={() => setAllocatingDonation(donation)}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      <ArrowUpRight size={13} /> Allocate
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

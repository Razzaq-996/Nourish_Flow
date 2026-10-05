import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, RefreshCw, Send, Eye, ArrowUpRight, MapPin, Sparkles } from 'lucide-react';
import { listDonations, publishDonation, withdrawDonation } from '../../services/donationService';
import { DONATION_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { donationStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import IdChip from '../../components/common/IdChip';
import { FoodCategoryIndicator, ExpiryUrgencyPill } from '../../components/common/FoodTags';
import DonationFormModal from '../../components/donations/DonationFormModal';
import DonationDetailsModal from '../../components/donations/DonationDetailsModal';
import AllocateModal from '../../components/matching/AllocateModal';

export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [allocatingDonation, setAllocatingDonation] = useState(null);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.foodCategory = categoryFilter;

      const data = await listDonations(params);
      setDonations(Array.isArray(data) ? data : (data?.donations || []));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handlePublish = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await publishDonation(id);
      setSuccessMsg('Donation published successfully! It is now available for rescue organizations.');
      fetchDonations();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdraw = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw this donation from circulation?')) return;
    setActionLoading(id);
    setError(null);
    try {
      await withdrawDonation(id);
      setSuccessMsg('Donation withdrawn.');
      fetchDonations();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

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
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="page-title">My Food Donations</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage surplus inventory listings, publish drafts to the network, and track partner allocations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary"
        >
          <Plus size={16} /> New Food Listing
        </button>
      </div>

      {/* Messages */}
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
          All Items
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

      {/* Search & Filter Toolbar */}
      <div className="card p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by description, dietary notes, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 text-xs sm:text-sm"
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
            {Object.values(DONATION_STATUSES).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchDonations}
            title="Refresh List"
            className="btn-secondary px-3 py-2 shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Donations List / Cards */}
      {loading && donations.length === 0 ? (
        <div className="card flex items-center justify-center h-48">
          <Spinner size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No food donations found"
          description={searchTerm || statusFilter || categoryFilter ? 'Try clearing your search or filter tags.' : 'You have not listed any surplus food yet.'}
          actionLabel="List First Donation"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((donation) => {
            const allocatedPct = donation.totalQuantity > 0 
              ? Math.round(((donation.allocatedQuantity || 0) / donation.totalQuantity) * 100)
              : 0;

            return (
              <div
                key={donation._id}
                className="card flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 group"
              >
                <div>
                  {/* Category & Status Bar */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <FoodCategoryIndicator category={donation.foodCategory} />
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        {donation.foodCategory?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ExpiryUrgencyPill expiresAt={donation.expiresAt} />
                      <Badge variant={donationStatusBadge(donation.status)}>{donation.status}</Badge>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug">
                    {donation.description || `${donation.foodCategory?.replace(/_/g, ' ')} batch`}
                  </h3>

                  {/* ID chip */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <IdChip id={donation._id} prefix="ID" />
                    {donation.pickupLocation?.addressText && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[200px]">
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        {donation.pickupLocation.addressText}
                      </span>
                    )}
                  </div>

                  {/* Quantity & Allocation Progress (Udemy/Swiggy style meter) */}
                  <div className="my-3 p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/90 dark:border-slate-700/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black font-display text-slate-900 dark:text-slate-100">
                          {donation.remainingQuantity}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                          {donation.unit} available
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {donation.allocatedQuantity || 0} / {donation.totalQuantity} {donation.unit} allocated ({allocatedPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(allocatedPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      <span>Total listed: <strong className="text-slate-700 dark:text-slate-300">{donation.totalQuantity} {donation.unit}</strong></span>
                      <span>Expires: <strong className="text-slate-700 dark:text-slate-300">{formatDate(donation.expiresAt)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer details & actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Listed {formatDate(donation.createdAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDonation(donation)}
                      className="btn-secondary text-xs py-1.5 px-2.5"
                    >
                      <Eye size={13} /> View
                    </button>

                    {(donation.status === DONATION_STATUSES.AVAILABLE ||
                      donation.status === DONATION_STATUSES.PARTIALLY_ALLOCATED) &&
                      (donation.remainingQuantity || 0) > 0.000001 &&
                      new Date(donation.expiresAt) > new Date() && (
                        <button
                          type="button"
                          onClick={() => setAllocatingDonation(donation)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <ArrowUpRight size={13} /> Allocate
                        </button>
                      )}

                    {donation.status === DONATION_STATUSES.DRAFT && (
                      <button
                        type="button"
                        onClick={() => handlePublish(donation._id)}
                        disabled={actionLoading === donation._id}
                        className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500"
                      >
                        {actionLoading === donation._id ? <Spinner size={13} /> : <><Send size={13} /> Publish</>}
                      </button>
                    )}

                    {(donation.status === DONATION_STATUSES.AVAILABLE || donation.status === DONATION_STATUSES.DRAFT) && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(donation._id)}
                        disabled={actionLoading === donation._id}
                        className="btn-secondary text-xs py-1.5 px-2.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        {actionLoading === donation._id ? <Spinner size={13} /> : 'Withdraw'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <DonationFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Donation created! Publish it whenever you are ready to make it available.');
          fetchDonations();
        }}
      />

      {/* Details Modal */}
      <DonationDetailsModal
        donation={selectedDonation}
        isOpen={Boolean(selectedDonation)}
        onClose={() => setSelectedDonation(null)}
        onAllocate={(d) => setAllocatingDonation(d)}
      />

      {/* Allocation Modal */}
      <AllocateModal
        donation={allocatingDonation}
        isOpen={Boolean(allocatingDonation)}
        onClose={() => setAllocatingDonation(null)}
        onSuccess={({ allocation, donation: freshDonation }) => {
          const qty = allocation?.quantity ?? '';
          const unit = allocation?.unit ?? '';
          const rem = freshDonation?.remainingQuantity ?? allocation?.donation?.remainingQuantity ?? '0';
          const newStatus = freshDonation?.status ?? allocation?.donation?.status ?? '';
          setSuccessMsg(`Donation allocated successfully! Allocated ${qty} ${unit}. Remaining surplus: ${rem} ${unit} (${newStatus}).`);
          fetchDonations();
          if (selectedDonation && freshDonation && selectedDonation._id === freshDonation._id) {
            setSelectedDonation(freshDonation);
          }
        }}
      />
    </div>
  );
}

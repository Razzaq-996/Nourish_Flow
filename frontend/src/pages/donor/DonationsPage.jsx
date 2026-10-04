import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, RefreshCw, Send, Eye, ArrowUpRight, Copy } from 'lucide-react';
import { listDonations, publishDonation, withdrawDonation } from '../../services/donationService';
import { DONATION_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { donationStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
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
          <h2 className="page-title">My Donations</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your surplus food listings, publish drafts, and track allocations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary"
        >
          <Plus size={16} /> New Donation
        </button>
      </div>

      {/* Messages */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Search & Filter Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by description or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9"
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
            {Object.values(DONATION_STATUSES).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

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

      {/* Donations List / Table */}
      {loading && donations.length === 0 ? (
        <div className="card flex items-center justify-center h-48">
          <Spinner size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No food donations found"
          description={searchTerm || statusFilter ? 'Try clearing your filters.' : 'You haven’t listed any food donations yet.'}
          actionLabel="Create First Donation"
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
                className="card flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                        {donation.foodCategory?.replace(/_/g, ' ')}
                      </span>
                      <h3 className="text-base font-bold text-slate-100 mt-0.5 line-clamp-1">
                        {donation.description || `${donation.foodCategory?.replace(/_/g, ' ')} (${donation.totalQuantity} ${donation.unit})`}
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
                    </div>
                    <Badge variant={donationStatusBadge(donation.status)}>{donation.status}</Badge>
                  </div>

                  {/* Quantity & Progress */}
                  <div className="my-3 p-3 bg-surface rounded-lg border border-surface-border">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Allocation Progress</span>
                      <span className="font-semibold text-slate-200">
                        {donation.allocatedQuantity || 0} / {donation.totalQuantity} {donation.unit} ({allocatedPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(allocatedPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
                      <span>Remaining: <strong className="text-brand-300">{donation.remainingQuantity} {donation.unit}</strong></span>
                      <span>Expires: <strong className="text-red-400">{formatDate(donation.expiresAt)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer details & actions */}
                <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    Listed {formatDate(donation.createdAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDonation(donation)}
                      className="btn-secondary text-xs py-1.5 px-2.5"
                    >
                      <Eye size={14} /> Details
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
                          <ArrowUpRight size={14} /> Allocate
                        </button>
                      )}

                    {donation.status === DONATION_STATUSES.DRAFT && (
                      <button
                        type="button"
                        onClick={() => handlePublish(donation._id)}
                        disabled={actionLoading === donation._id}
                        className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500"
                      >
                        {actionLoading === donation._id ? <Spinner size={14} /> : <><Send size={14} /> Publish</>}
                      </button>
                    )}

                    {(donation.status === DONATION_STATUSES.AVAILABLE || donation.status === DONATION_STATUSES.DRAFT) && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(donation._id)}
                        disabled={actionLoading === donation._id}
                        className="btn-secondary text-xs py-1.5 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      >
                        {actionLoading === donation._id ? <Spinner size={14} /> : 'Withdraw'}
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

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';
import { listDonations } from '../../services/donationService';
import { DONATION_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { donationStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import IdChip from '../../components/common/IdChip';
import { FoodCategoryIndicator } from '../../components/common/FoodTags';
import DonationDetailsModal from '../../components/donations/DonationDetailsModal';

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDonation, setSelectedDonation] = useState(null);

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

  const filtered = donations.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.foodCategory?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      String(item.createdByUserId)?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Platform Donations Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            System-wide overview of all food donations listed across network donors.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="card p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search all platform donations..."
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
            className="btn-secondary px-3 py-2 shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && donations.length === 0 ? (
        <div className="card flex items-center justify-center h-48"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No donations found" description="No platform donations match your criteria." />
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total Qty</th>
                <th>Allocated</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Donation ID</th>
                <th>Expires</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td>
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                      <FoodCategoryIndicator category={d.foodCategory} />
                      <span>{d.foodCategory?.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="font-semibold text-slate-700 dark:text-slate-300">{d.totalQuantity} {d.unit}</td>
                  <td className="text-blue-600 dark:text-blue-400 font-semibold">{d.allocatedQuantity || 0}</td>
                  <td className="text-emerald-700 dark:text-emerald-400 font-bold">{d.remainingQuantity} {d.unit}</td>
                  <td>
                    <Badge variant={donationStatusBadge(d.status)}>{d.status}</Badge>
                  </td>
                  <td>
                    <IdChip id={d._id} prefix="DON" />
                  </td>
                  <td className="text-xs text-red-600 dark:text-red-400 font-medium">{formatDate(d.expiresAt)}</td>
                  <td className="text-xs text-slate-500">{formatDate(d.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedDonation(d)}
                      className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DonationDetailsModal
        donation={selectedDonation}
        isOpen={Boolean(selectedDonation)}
        onClose={() => setSelectedDonation(null)}
      />
    </div>
  );
}

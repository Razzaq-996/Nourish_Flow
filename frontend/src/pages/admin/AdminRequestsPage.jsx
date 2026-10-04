import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';
import { listFoodRequests } from '../../services/foodRequestService';
import { FOOD_REQUEST_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { requestStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import FoodRequestDetailsModal from '../../components/requests/FoodRequestDetailsModal';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.foodCategory = categoryFilter;

      const data = await listFoodRequests(params);
      setRequests(Array.isArray(data) ? data : (data?.requests || []));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = requests.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.foodCategory?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      String(item.organizationId)?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Platform Food Requests</h2>
          <p className="text-sm text-slate-400 mt-1">
            System-wide overview of all food requests submitted by rescue organizations.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search all platform requests..."
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
            {Object.values(FOOD_REQUEST_STATUSES).map((st) => (
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
            onClick={fetchRequests}
            title="Refresh"
            className="btn-secondary px-3 py-2"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && requests.length === 0 ? (
        <div className="card flex items-center justify-center h-48"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No food requests found" description="No platform food requests match your criteria." />
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total Needed</th>
                <th>Fulfilled</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Needed By</th>
                <th>Organization</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td className="font-semibold text-slate-100">
                    {r.foodCategory?.replace(/_/g, ' ')}
                  </td>
                  <td>{r.totalQuantity} {r.unit}</td>
                  <td className="text-blue-400">{r.fulfilledQuantity || 0}</td>
                  <td className="text-brand-400 font-semibold">{r.remainingQuantity} {r.unit}</td>
                  <td>
                    <Badge variant={requestStatusBadge(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="text-xs text-red-400">{formatDate(r.neededBy)}</td>
                  <td className="font-mono text-xs text-slate-400">...{String(r.organizationId).slice(-6)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(r)}
                      className="btn-secondary text-xs py-1 px-2.5"
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FoodRequestDetailsModal
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}

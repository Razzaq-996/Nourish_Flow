import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, RefreshCw, Send, Eye, Clock } from 'lucide-react';
import { listFoodRequests, openFoodRequest, cancelFoodRequest } from '../../services/foodRequestService';
import { FOOD_REQUEST_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { requestStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import IdChip from '../../components/common/IdChip';
import { FoodCategoryIndicator } from '../../components/common/FoodTags';
import FoodRequestFormModal from '../../components/requests/FoodRequestFormModal';
import FoodRequestDetailsModal from '../../components/requests/FoodRequestDetailsModal';

export default function OrgRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const handleOpen = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await openFoodRequest(id);
      setSuccessMsg('Food request opened! It is now broadcast for donor matching.');
      fetchRequests();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this food request?')) return;
    setActionLoading(id);
    setError(null);
    try {
      await cancelFoodRequest(id);
      setSuccessMsg('Food request cancelled.');
      fetchRequests();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = requests.filter((item) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="page-title">Community Food Requests</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Broadcast meal and grocery requirements for your organization and track donor fulfillment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary"
        >
          <Plus size={16} /> New Food Request
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
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          All Requests
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
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <FoodCategoryIndicator category={cat} />
              <span>{cat.replace(/_/g, ' ')}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div className="card p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search requests by category or note..."
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
            {Object.values(FOOD_REQUEST_STATUSES).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchRequests}
            title="Refresh Requests"
            className="btn-secondary px-3 py-2 shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* List */}
      {loading && requests.length === 0 ? (
        <div className="card flex items-center justify-center h-48">
          <Spinner size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No food requests found"
          description={searchTerm || statusFilter || categoryFilter ? 'Try adjusting your search or category filters.' : 'You haven’t posted any food requests yet.'}
          actionLabel="Create Food Request"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((req) => {
            const fulfilledPct = req.totalQuantity > 0 
              ? Math.round(((req.fulfilledQuantity || 0) / req.totalQuantity) * 100)
              : 0;

            return (
              <div
                key={req._id}
                className="card flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <FoodCategoryIndicator category={req.foodCategory} />
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {req.foodCategory?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <Badge variant={requestStatusBadge(req.status)}>{req.status}</Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug">
                    {req.description || `${req.foodCategory?.replace(/_/g, ' ')} required`}
                  </h3>

                  <div className="flex items-center gap-2 mt-1.5">
                    <IdChip id={req._id} prefix="ID" />
                    {req.neededBy && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock size={11} className="shrink-0 text-slate-400" />
                        Target: {formatDate(req.neededBy)}
                      </span>
                    )}
                  </div>

                  {/* Fulfillment Progress */}
                  <div className="my-3 p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/90 dark:border-slate-700/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black font-display text-slate-900 dark:text-slate-100">
                          {req.remainingQuantity}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                          {req.unit} remaining
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {req.fulfilledQuantity || 0} / {req.totalQuantity} {req.unit} ({fulfilledPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(fulfilledPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      <span>Total goal: <strong className="text-slate-700 dark:text-slate-300">{req.totalQuantity} {req.unit}</strong></span>
                      <span>Needed by: <strong className="text-red-600 dark:text-red-400">{formatDate(req.neededBy)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Created {formatDate(req.createdAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="btn-secondary text-xs py-1.5 px-2.5"
                    >
                      <Eye size={13} /> View
                    </button>

                    {req.status === FOOD_REQUEST_STATUSES.DRAFT && (
                      <button
                        type="button"
                        onClick={() => handleOpen(req._id)}
                        disabled={actionLoading === req._id}
                        className="btn-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-500"
                      >
                        {actionLoading === req._id ? <Spinner size={13} /> : <><Send size={13} /> Open Request</>}
                      </button>
                    )}

                    {(req.status === FOOD_REQUEST_STATUSES.OPEN || req.status === FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED || req.status === FOOD_REQUEST_STATUSES.DRAFT) && (
                      <button
                        type="button"
                        onClick={() => handleCancel(req._id)}
                        disabled={actionLoading === req._id}
                        className="btn-secondary text-xs py-1.5 px-2.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        {actionLoading === req._id ? <Spinner size={13} /> : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <FoodRequestFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Request created as DRAFT. When ready, click "Open Request" to broadcast it.');
          fetchRequests();
        }}
      />

      <FoodRequestDetailsModal
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}

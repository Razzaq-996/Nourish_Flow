import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, RefreshCw, Send, Eye, Copy } from 'lucide-react';
import { listFoodRequests, openFoodRequest, cancelFoodRequest } from '../../services/foodRequestService';
import { FOOD_REQUEST_STATUSES, FOOD_CATEGORIES } from '../../utils/constants';
import { requestStatusBadge, formatDate, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
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
          <h2 className="page-title">Food Requests</h2>
          <p className="text-sm text-slate-400 mt-1">
            Post and track meals and grocery requirements for your organization or community center.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary"
        >
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Messages */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Filters Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search requests by category or note..."
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

      {/* List */}
      {loading && requests.length === 0 ? (
        <div className="card flex items-center justify-center h-48">
          <Spinner size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No food requests found"
          description={searchTerm || statusFilter ? 'Try adjusting your filters.' : 'You haven’t posted any food requests yet.'}
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
                className="card flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                        {req.foodCategory?.replace(/_/g, ' ')}
                      </span>
                      <h3 className="text-base font-bold text-slate-100 mt-0.5 line-clamp-1">
                        {req.description || `${req.foodCategory?.replace(/_/g, ' ')} (${req.totalQuantity} ${req.unit})`}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-mono">
                        <span className="bg-surface/80 px-1.5 py-0.5 rounded border border-surface-border select-all text-slate-400">
                          ID: {req._id}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(req._id);
                            setSuccessMsg(`Copied Food Request ID ${req._id} to clipboard!`);
                          }}
                          title="Copy Food Request ID"
                          className="hover:text-blue-300 p-0.5 transition-colors text-slate-400"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                    <Badge variant={requestStatusBadge(req.status)}>{req.status}</Badge>
                  </div>

                  <div className="my-3 p-3 bg-surface rounded-lg border border-surface-border">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Fulfillment Progress</span>
                      <span className="font-semibold text-slate-200">
                        {req.fulfilledQuantity || 0} / {req.totalQuantity} {req.unit} ({fulfilledPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(fulfilledPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
                      <span>Remaining: <strong className="text-brand-300">{req.remainingQuantity} {req.unit}</strong></span>
                      <span>Needed by: <strong className="text-red-400">{formatDate(req.neededBy)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    Created {formatDate(req.createdAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="btn-secondary text-xs py-1.5 px-2.5"
                    >
                      <Eye size={14} /> Details
                    </button>

                    {req.status === FOOD_REQUEST_STATUSES.DRAFT && (
                      <button
                        type="button"
                        onClick={() => handleOpen(req._id)}
                        disabled={actionLoading === req._id}
                        className="btn-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-500"
                      >
                        {actionLoading === req._id ? <Spinner size={14} /> : <><Send size={14} /> Open Request</>}
                      </button>
                    )}

                    {(req.status === FOOD_REQUEST_STATUSES.OPEN || req.status === FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED || req.status === FOOD_REQUEST_STATUSES.DRAFT) && (
                      <button
                        type="button"
                        onClick={() => handleCancel(req._id)}
                        disabled={actionLoading === req._id}
                        className="btn-secondary text-xs py-1.5 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      >
                        {actionLoading === req._id ? <Spinner size={14} /> : 'Cancel'}
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

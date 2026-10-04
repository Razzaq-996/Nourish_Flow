import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { requestStatusBadge, formatDateTime } from '../../utils/formatters';

export default function FoodRequestDetailsModal({ request, isOpen, onClose }) {
  if (!request) return null;

  const fulfilledPct = request.totalQuantity > 0 
    ? Math.round(((request.fulfilledQuantity || 0) / request.totalQuantity) * 100)
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Food Request Details" maxWidth="max-w-xl">
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-border">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Category</span>
            <p className="text-base font-semibold text-slate-100">{request.foodCategory?.replace(/_/g, ' ')}</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5 select-all">
              ID: {request._id}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Status</span>
            <Badge variant={requestStatusBadge(request.status)}>{request.status}</Badge>
          </div>
        </div>

        {/* Fulfillment stats */}
        <div className="p-3 bg-surface/50 border border-surface-border rounded-lg space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Fulfilled Progress</span>
            <span className="font-semibold text-slate-200">
              {request.fulfilledQuantity || 0} / {request.totalQuantity} {request.unit} ({fulfilledPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(fulfilledPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Remaining needed: <strong className="text-brand-400">{request.remainingQuantity} {request.unit}</strong></span>
            <span>Needed by: <strong className="text-red-400">{formatDateTime(request.neededBy)}</strong></span>
          </div>
        </div>

        {request.description && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-slate-300 p-3 bg-surface/40 rounded-lg border border-surface-border text-sm">
              {request.description}
            </p>
          </div>
        )}

        {/* Location coordinates */}
        {request.deliveryLocation && (
          <div className="p-3 bg-surface/40 rounded-lg border border-surface-border text-xs">
            <p className="text-slate-500 mb-0.5">Delivery Coordinates (GeoJSON)</p>
            <p className="font-mono text-slate-300">
              Lng: {request.deliveryLocation.coordinates?.[0]}, Lat: {request.deliveryLocation.coordinates?.[1]}
            </p>
          </div>
        )}

        {/* Status Timeline */}
        {request.statusHistory && request.statusHistory.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status Timeline</p>
            <div className="border-l-2 border-surface-border pl-3 space-y-2 text-xs">
              {request.statusHistory.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-surface-card" />
                  <p className="font-semibold text-slate-200">{item.status}</p>
                  <p className="text-slate-500">{formatDateTime(item.at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

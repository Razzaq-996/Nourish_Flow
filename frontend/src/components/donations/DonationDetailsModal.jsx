import { ArrowUpRight, Truck } from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { donationStatusBadge, formatDate, formatDateTime } from '../../utils/formatters';
import { DONATION_STATUSES } from '../../utils/constants';

export default function DonationDetailsModal({ donation, isOpen, onClose, onAllocate, onAssignVolunteer }) {
  if (!donation) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Donation Details" maxWidth="max-w-2xl">
      <div className="space-y-5 text-sm">
        {/* Header stats */}
        <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-border">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Category</span>
            <p className="text-base font-semibold text-slate-100">{donation.foodCategory?.replace(/_/g, ' ')}</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5 select-all">
              ID: {donation._id}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Status</span>
            <Badge variant={donationStatusBadge(donation.status)}>{donation.status}</Badge>
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-surface/50 border border-surface-border rounded-lg">
            <p className="text-xs text-slate-400">Total Quantity</p>
            <p className="text-lg font-bold text-slate-100 mt-0.5">{donation.totalQuantity} {donation.unit}</p>
          </div>
          <div className="p-3 bg-surface/50 border border-surface-border rounded-lg">
            <p className="text-xs text-slate-400">Allocated</p>
            <p className="text-lg font-bold text-blue-400 mt-0.5">{donation.allocatedQuantity ?? 0} {donation.unit}</p>
          </div>
          <div className="p-3 bg-surface/50 border border-surface-border rounded-lg">
            <p className="text-xs text-slate-400">Remaining</p>
            <p className="text-lg font-bold text-brand-400 mt-0.5">{donation.remainingQuantity} {donation.unit}</p>
          </div>
        </div>

        {/* Description */}
        {donation.description && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-slate-300 p-3 bg-surface/50 rounded-lg border border-surface-border text-sm">
              {donation.description}
            </p>
          </div>
        )}

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-surface/40 rounded-lg border border-surface-border text-xs">
          <div>
            <p className="text-slate-500">Available From</p>
            <p className="font-medium text-slate-200 mt-0.5">{formatDateTime(donation.availableFrom)}</p>
          </div>
          <div>
            <p className="text-slate-500">Available Until</p>
            <p className="font-medium text-slate-200 mt-0.5">{formatDateTime(donation.availableUntil)}</p>
          </div>
          <div>
            <p className="text-slate-500">Prepared At</p>
            <p className="font-medium text-slate-200 mt-0.5">{formatDateTime(donation.preparedAt)}</p>
          </div>
          <div>
            <p className="text-slate-500">Expires At</p>
            <p className="font-medium text-red-400 mt-0.5">{formatDateTime(donation.expiresAt)}</p>
          </div>
        </div>

        {/* Allocations list */}
        {donation.allocations && donation.allocations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Allocations ({donation.allocations.length})</p>
            <div className="space-y-2">
              {donation.allocations.map((alloc, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-surface/60 border border-surface-border rounded-lg text-xs gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-mono">Req ...{String(alloc.requestId).slice(-8)}</span>
                    <span className="font-semibold text-brand-400">{alloc.quantity} {donation.unit}</span>
                    <span className="text-slate-500 text-[11px]">{formatDate(alloc.createdAt)}</span>
                  </div>
                  {onAssignVolunteer && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAssignVolunteer({
                          donationId: String(donation._id),
                          requestId: String(alloc.requestId),
                          quantity: alloc.quantity,
                          unit: donation.unit,
                          foodCategory: donation.foodCategory
                        });
                      }}
                      className="btn-secondary text-[11px] py-1 px-2.5 text-brand-300 hover:text-brand-200 flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Truck size={12} /> Assign Volunteer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status History */}
        {donation.statusHistory && donation.statusHistory.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status Timeline</p>
            <div className="border-l-2 border-surface-border pl-3 space-y-2 text-xs">
              {donation.statusHistory.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-surface-card" />
                  <p className="font-semibold text-slate-200">{item.status}</p>
                  <p className="text-slate-500">{formatDateTime(item.at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
          {onAllocate &&
            (donation.status === DONATION_STATUSES.AVAILABLE ||
              donation.status === DONATION_STATUSES.PARTIALLY_ALLOCATED) &&
            (donation.remainingQuantity || 0) > 0.000001 &&
            new Date(donation.expiresAt) > new Date() && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAllocate(donation);
                }}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <ArrowUpRight size={14} /> Allocate Donation
              </button>
            )}
        </div>
      </div>
    </Modal>
  );
}

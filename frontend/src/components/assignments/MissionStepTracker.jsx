import { Check, Clock, Truck, PackageCheck, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { ASSIGNMENT_STATUSES } from '../../utils/constants';

/**
 * MissionStepTracker — authentic delivery tracker (Swiggy/DoorDash style).
 * Maps assignment state machine into an intuitive visual progress track.
 */
export default function MissionStepTracker({ status, className = '' }) {
  if (status === ASSIGNMENT_STATUSES.FAILED || status === ASSIGNMENT_STATUSES.CANCELLED || status === ASSIGNMENT_STATUSES.REJECTED) {
    return (
      <div className={`flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 font-medium ${className}`}>
        <AlertCircle size={15} className="shrink-0" />
        <span>Mission {status.toLowerCase()} — logistics halted.</span>
      </div>
    );
  }

  // 4 Core Milestones:
  // 1. Dispatch & Acceptance (PENDING, ACCEPTED)
  // 2. Pickup (PICKUP_STARTED, PICKED_UP)
  // 3. Transit & Delivery (DELIVERY_STARTED, DELIVERED)
  // 4. Completed & Verified (COMPLETED)

  const steps = [
    {
      id: 'dispatch',
      label: 'Dispatched',
      icon: Clock,
      isDone: [
        ASSIGNMENT_STATUSES.ACCEPTED,
        ASSIGNMENT_STATUSES.PICKUP_STARTED,
        ASSIGNMENT_STATUSES.PICKED_UP,
        ASSIGNMENT_STATUSES.DELIVERY_STARTED,
        ASSIGNMENT_STATUSES.DELIVERED,
        ASSIGNMENT_STATUSES.COMPLETED
      ].includes(status),
      isActive: status === ASSIGNMENT_STATUSES.PENDING
    },
    {
      id: 'pickup',
      label: 'Pickup',
      icon: Truck,
      isDone: [
        ASSIGNMENT_STATUSES.PICKED_UP,
        ASSIGNMENT_STATUSES.DELIVERY_STARTED,
        ASSIGNMENT_STATUSES.DELIVERED,
        ASSIGNMENT_STATUSES.COMPLETED
      ].includes(status),
      isActive: [ASSIGNMENT_STATUSES.ACCEPTED, ASSIGNMENT_STATUSES.PICKUP_STARTED].includes(status)
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: Send,
      isDone: [
        ASSIGNMENT_STATUSES.DELIVERED,
        ASSIGNMENT_STATUSES.COMPLETED
      ].includes(status),
      isActive: [ASSIGNMENT_STATUSES.DELIVERY_STARTED].includes(status)
    },
    {
      id: 'completed',
      label: 'Verified',
      icon: CheckCircle2,
      isDone: status === ASSIGNMENT_STATUSES.COMPLETED,
      isActive: status === ASSIGNMENT_STATUSES.DELIVERED
    }
  ];

  return (
    <div className={`w-full py-2 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connector line */}
        <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 h-[2px] bg-slate-200 dark:bg-slate-700 -z-0" />

        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                  step.isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : step.isActive
                    ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 shadow-xs animate-pulse'
                    : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-600'
                }`}
              >
                {step.isDone ? <Check size={13} strokeWidth={3} /> : <Icon size={13} />}
              </div>
              <span
                className={`text-[10px] font-semibold mt-1 tracking-tight ${
                  step.isDone
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : step.isActive
                    ? 'text-amber-700 dark:text-amber-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

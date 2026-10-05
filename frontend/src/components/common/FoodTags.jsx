import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FOOD_CATEGORIES } from '../../utils/constants';

/**
 * Dietary/Handling Icon — Swiggy/Zomato style food badge.
 */
export function FoodCategoryIndicator({ category, className = '' }) {
  const isPrepared = category === FOOD_CATEGORIES.PREPARED_MEAL;
  const isBakery = category === FOOD_CATEGORIES.BAKERY;
  const isProduce = category === FOOD_CATEGORIES.FRESH_PRODUCE;
  const isDairy = category === FOOD_CATEGORIES.DAIRY;

  let borderColor = 'border-emerald-600 dark:border-emerald-500';
  let dotColor = 'bg-emerald-600 dark:bg-emerald-500';

  if (isPrepared) {
    borderColor = 'border-amber-600 dark:border-amber-500';
    dotColor = 'bg-amber-600 dark:bg-amber-500';
  } else if (isBakery) {
    borderColor = 'border-orange-500 dark:border-orange-400';
    dotColor = 'bg-orange-500 dark:bg-orange-400';
  } else if (isDairy) {
    borderColor = 'border-blue-600 dark:border-blue-400';
    dotColor = 'bg-blue-600 dark:bg-blue-400';
  }

  return (
    <span
      title={category?.replace(/_/g, ' ') || 'Food Item'}
      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[4px] border ${borderColor} p-[2px] shrink-0 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
    </span>
  );
}

/**
 * ExpiryUrgencyPill — Swiggy/DoorDash style shelf-life counter.
 */
export function ExpiryUrgencyPill({ expiresAt }) {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  const diffHours = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
        <AlertTriangle size={10} /> Expired
      </span>
    );
  }

  if (diffHours < 6) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 animate-pulse">
        <Clock size={10} /> {Math.ceil(diffHours)}h left
      </span>
    );
  }

  if (diffHours < 24) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
        <Clock size={10} /> {Math.round(diffHours)}h shelf life
      </span>
    );
  }

  const days = Math.round(diffHours / 24);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
      <ShieldCheck size={10} className="text-emerald-600 dark:text-emerald-400" /> {days}d fresh
    </span>
  );
}

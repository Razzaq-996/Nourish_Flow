import { FolderOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'There are no records to display matching your criteria.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-surface-border bg-surface-card/40 my-4">
      <div className="w-12 h-12 rounded-xl bg-surface-muted/60 flex items-center justify-center text-slate-400 mb-3 border border-surface-border">
        <Icon size={24} />
      </div>
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 btn-primary text-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

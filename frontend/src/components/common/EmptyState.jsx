import { FolderOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'There are no records to display matching your criteria.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-surface-border bg-surface-card/50 my-4 transition-colors">
      <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-content-muted mb-3 border border-surface-border shadow-xs">
        <Icon size={22} />
      </div>
      <h4 className="text-sm font-semibold text-content-primary">{title}</h4>
      <p className="text-xs text-content-muted max-w-sm mt-1 leading-relaxed">{description}</p>
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

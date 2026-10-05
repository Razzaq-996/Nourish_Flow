/** Full-screen loading spinner shown while auth state is resolving */
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-surface-border border-t-brand-600 animate-spin" />
        <p className="text-content-muted text-sm font-medium">Loading platform…</p>
      </div>
    </div>
  );
}

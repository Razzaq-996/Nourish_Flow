export default function StatCard({ title, value, subtitle, icon: Icon, color = 'brand', trend }) {
  const colorMap = {
    brand: {
      icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    },
    blue: {
      icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      badge: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
    },
    amber: {
      icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    },
    purple: {
      icon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
    },
    red: {
      icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    },
  };

  const activeColor = colorMap[color] || colorMap.brand;

  return (
    <div className="card group hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 relative overflow-hidden">
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-700/60 to-transparent group-hover:via-emerald-500/50 transition-all duration-300" />

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${activeColor.icon} transition-transform group-hover:scale-110 shadow-xs`}>
            <Icon size={18} strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="text-3xl font-extrabold font-display text-slate-900 dark:text-slate-50 tracking-tight">
          {value}
        </span>
        {trend && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${activeColor.badge}`}>
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="truncate">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'brand', trend }) {
  const colorMap = {
    brand:  'bg-brand-900/40 text-brand-400 border-brand-800/60',
    blue:   'bg-blue-900/40 text-blue-400 border-blue-800/60',
    amber:  'bg-amber-900/40 text-amber-400 border-amber-800/60',
    purple: 'bg-purple-900/40 text-purple-400 border-purple-800/60',
  };

  const iconBg = colorMap[color] || colorMap.brand;

  return (
    <div className="card hover:border-slate-700/80 transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${iconBg} transition-transform group-hover:scale-105`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-100 tracking-tight">{value}</span>
        {trend && <span className="text-xs font-medium text-brand-400">{trend}</span>}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

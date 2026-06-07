export function SeverityBadge({ severity }) {
  const classes = {
    Critical: 'badge-critical',
    High: 'badge-high',
    Medium: 'badge-medium',
    Low: 'badge-low',
  }
  return (
    <span className={classes[severity] || 'bg-slate-500/20 text-slate-400 border border-slate-500/40 rounded-full px-3 py-0.5 text-xs font-semibold'}>
      {severity || 'Unknown'}
    </span>
  )
}

export function StatusBadge({ status }) {
  const classes = {
    'Open': 'badge-open',
    'In Progress': 'badge-progress',
    'Resolved': 'badge-resolved',
  }
  return (
    <span className={classes[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-full px-3 py-0.5 text-xs font-semibold'}>
      {status || 'Unknown'}
    </span>
  )
}

export function StatCard({ title, value, subtitle, icon, color = 'brand' }) {
  const colorMap = {
    brand: 'from-brand-600/20 to-brand-500/10 border-brand-500/20 text-brand-400',
    red:   'from-red-600/20 to-red-500/10 border-red-500/20 text-red-400',
    green: 'from-green-600/20 to-green-500/10 border-green-500/20 text-green-400',
    yellow:'from-yellow-600/20 to-yellow-500/10 border-yellow-500/20 text-yellow-400',
  }
  return (
    <div className={`glass rounded-2xl p-5 bg-gradient-to-br ${colorMap[color] || colorMap.brand} border animate-fade-in`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className={`text-xl ${colorMap[color]?.split(' ').pop()}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  )
}

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  )
}

export function ErrorMessage({ message }) {
  return (
    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
      <span className="text-xl">⚠️</span>
      <div>
        <p className="font-semibold">Error</p>
        <p className="text-sm text-red-300">{message}</p>
      </div>
    </div>
  )
}

import { FiSearch, FiLink, FiTool } from 'react-icons/fi'
import { Link } from 'react-router-dom'

function SimilarityBar({ value }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'from-red-500 to-orange-400' :
    pct >= 60 ? 'from-yellow-500 to-amber-400' :
    'from-brand-500 to-brand-400'

  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="confidence-bar-bg flex-1">
        <div
          className={`confidence-bar bg-gradient-to-r ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function SimilarIncidents({ incidents = [] }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <SectionHeader />
        <div className="text-center py-8 text-slate-500">
          <FiSearch size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No similar incidents found in memory.</p>
          <p className="text-xs mt-1 text-slate-600">This is the first incident of this type — it will be remembered for future analysis.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <SectionHeader count={incidents.length} />
      <div className="space-y-3 mt-4">
        {incidents.map((inc, i) => (
          <SimilarCard key={inc.incident_id || i} incident={inc} index={i} />
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ count }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
        <FiSearch className="text-brand-400" size={16} />
      </div>
      <div>
        <h3 className="font-semibold text-white">Similar Past Incidents</h3>
        {count !== undefined && (
          <p className="text-xs text-slate-400">Found {count} incident{count !== 1 ? 's' : ''} in vector memory</p>
        )}
      </div>
    </div>
  )
}

function SimilarCard({ incident, index }) {
  const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

  return (
    <div className="bg-surface-elevated border border-surface-border hover:border-brand-500/30 rounded-xl p-4 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={`text-lg font-bold font-mono ${rankColors[index] || 'text-slate-500'} flex-shrink-0`}>
            #{index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{incident.title}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{incident.incident_id}</p>
          </div>
        </div>
        <Link
          to={`/incidents/${incident.incident_id}`}
          className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-brand-300 transition-all"
          title="View incident"
        >
          <FiLink size={14} />
        </Link>
      </div>

      <SimilarityBar value={incident.similarity} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {incident.cause && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            <p className="text-xs text-red-400 font-medium mb-0.5">Root Cause</p>
            <p className="text-xs text-slate-300 truncate">{incident.cause}</p>
          </div>
        )}
        {incident.actual_fix && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
            <p className="text-xs text-green-400 font-medium mb-0.5 flex items-center gap-1"><FiTool size={10} /> Fix Applied</p>
            <p className="text-xs text-slate-300 truncate">{incident.actual_fix}</p>
          </div>
        )}
      </div>
    </div>
  )
}

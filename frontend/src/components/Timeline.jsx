import { FiClock, FiAlertCircle, FiCheckCircle, FiZap, FiDatabase, FiActivity } from 'react-icons/fi'
import { format } from 'date-fns'

const EVENT_ICONS = {
  incident_created:       { icon: FiAlertCircle, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  embedding_stored:       { icon: FiDatabase,    color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
  similarity_search_complete: { icon: FiActivity, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  severity_predicted:     { icon: FiZap,          color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  ai_analysis_completed:  { icon: FiZap,          color: 'text-brand-400', bg: 'bg-brand-500/20 border-brand-500/30' },
  incident_resolved:      { icon: FiCheckCircle,  color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  memory_updated:         { icon: FiDatabase,    color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  engineer_review_started:{ icon: FiActivity,    color: 'text-slate-300', bg: 'bg-slate-500/20 border-slate-500/30' },
}

const DEFAULT_EVENT = { icon: FiActivity, color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30' }

function formatTime(ts) {
  try {
    return format(new Date(ts), 'HH:mm:ss')
  } catch {
    return ts
  }
}

function formatDate(ts) {
  try {
    return format(new Date(ts), 'MMM d, yyyy')
  } catch {
    return ''
  }
}

export default function Timeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <Header />
        <div className="text-center py-8 text-slate-500">
          <FiClock size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No timeline events yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <Header count={events.length} />
      <div className="mt-5 relative">
        {/* Vertical line */}
        <div className="absolute left-[23px] top-6 bottom-0 w-px bg-gradient-to-b from-brand-500/60 to-transparent" />

        <div className="space-y-4">
          {events.map((event, i) => {
            const config = EVENT_ICONS[event.event_type] || DEFAULT_EVENT
            const Icon = config.icon
            return (
              <div key={event.id || i} className="flex items-start gap-4 relative group animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                {/* Icon dot */}
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 z-10 transition-all group-hover:scale-110 ${config.bg}`}>
                  <Icon className={config.color} size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 bg-surface-elevated border border-surface-border rounded-xl p-4 hover:border-brand-500/20 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-200">{event.description}</p>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-mono text-brand-400">{formatTime(event.occurred_at)}</p>
                      <p className="text-xs text-slate-600">{formatDate(event.occurred_at)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{event.event_type.replace(/_/g, ' ')}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Header({ count }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
        <FiClock className="text-brand-400" size={16} />
      </div>
      <div>
        <h3 className="font-semibold text-white">Incident Timeline</h3>
        {count !== undefined && <p className="text-xs text-slate-400">{count} event{count !== 1 ? 's' : ''} recorded</p>}
      </div>
    </div>
  )
}

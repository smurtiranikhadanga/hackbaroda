import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiAlertTriangle, FiCheckCircle, FiClock, FiActivity,
  FiArrowRight, FiRefreshCw, FiPlus, FiX, FiFolder, FiChevronDown, FiChevronUp
} from 'react-icons/fi'
import { format } from 'date-fns'
import { listIncidents, getStats } from '../api'
import KnowledgeGraph from '../components/KnowledgeGraph'
import { SeverityBadge, StatusBadge, StatCard, LoadingSpinner, ErrorMessage } from '../components/ui'

export default function Dashboard() {
  const [incidents, setIncidents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('incidents')
  
  // Track which incident clusters are expanded in UI
  const [expandedClusters, setExpandedClusters] = useState({})

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [incRes, statRes] = await Promise.all([listIncidents({ limit: 50 }), getStats()])
      setIncidents(incRes.data.incidents || [])
      setStats(statRes.data)
    } catch (e) {
      setError('Failed to load dashboard data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Group incidents by cluster_id
  const clusteredIncidents = incidents.reduce((acc, curr) => {
    const cid = curr.cluster_id || 'unclustered'
    const cname = curr.cluster_name || 'System Issue'
    if (!acc[cid]) {
      acc[cid] = { name: cname, list: [] }
    }
    acc[cid].list.push(curr)
    return acc
  }, {})

  const toggleCluster = (cid) => {
    setExpandedClusters(prev => ({
      ...prev,
      [cid]: !prev[cid]
    }))
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 font-sans text-slate-300 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Incident Mind AI <span className="gradient-text">Console</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">An intelligent SRE agent that remembers past incidents, root causes, mitigation strategies, and resolution processes to recommend solutions when similar incidents occur.</p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary flex items-center gap-2 py-2 px-4 text-xs font-semibold"
          title="Refresh"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Incidents"  value={stats.total_incidents}   icon="📋" color="brand" />
          <StatCard title="Resolved"         value={stats.resolved_incidents} icon="✅" color="green" subtitle={`${stats.open_incidents} still open`} />
          <StatCard title="Avg AI Confidence" value={`${Math.round(stats.avg_ai_confidence * 100)}%`} icon="🎯" color="yellow" />
          <StatCard title="Avg Resolution"   value={stats.avg_resolution_time_minutes > 0 ? `${Math.round(stats.avg_resolution_time_minutes)}m` : '—'} icon="⏱️" color="red" />
        </div>
      )}

      {error && <div className="mb-6"><ErrorMessage message={error} /></div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-surface-border/50 pb-3">
        {['incidents', 'knowledge'].map(tab => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab
                ? 'border-brand-500 text-brand-300 bg-brand-500/5'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            {tab === 'incidents' ? '📋 Clustered Incidents' : '🧠 Knowledge Graph'}
          </button>
        ))}
      </div>

      {activeTab === 'incidents' && (
        loading ? <LoadingSpinner text="Querying incidents..." /> : (
          incidents.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
                <FiAlertTriangle className="text-brand-400" size={28} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No incidents yet</h3>
              <p className="text-slate-400 text-xs">Report your first SRE alert to launch the diagnostics console.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {Object.keys(clusteredIncidents).map(cid => {
                const cluster = clusteredIncidents[cid]
                const isExpanded = expandedClusters[cid] !== false // Default to expanded
                
                return (
                  <div key={cid} className="glass border border-surface-border/80 rounded-2xl overflow-hidden">
                    {/* Folding Cluster Header */}
                    <button
                      onClick={() => toggleCluster(cid)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-surface-elevated/40 hover:bg-surface-elevated/60 border-b border-surface-border/40 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <FiFolder className="text-brand-400" size={18} />
                        <div>
                          <h3 className="text-white font-bold text-sm">{cluster.name}</h3>
                          <span className="text-[10px] text-slate-500 font-mono">Cluster ID: {cid.slice(0, 8)}... ({cluster.list.length} related issues)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </div>
                    </button>

                    {/* Incidents inside cluster */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-surface/10">
                        {cluster.list.map(inc => (
                          <IncidentRow key={inc.id} incident={inc} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )
      )}

      {activeTab === 'knowledge' && <KnowledgeGraph />}
    </div>
  )
}

function IncidentRow({ incident }) {
  const timeStr = incident.created_at
    ? format(new Date(incident.created_at), 'MMM d, HH:mm')
    : ''

  return (
    <Link
      to={`/incidents/${incident.id}`}
      id={`incident-row-${incident.id}`}
      className="block bg-surface/30 border border-surface-border/50 hover:border-brand-500/30 rounded-xl p-4 transition-all duration-200 group hover:bg-surface/50 animate-fade-in"
    >
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          incident.status === 'Resolved' ? 'bg-green-500/10 border border-green-500/20' :
          incident.status === 'In Progress' ? 'bg-yellow-500/10 border border-yellow-500/20' :
          'bg-red-500/10 border border-red-500/20'
        }`}>
          {incident.status === 'Resolved'
            ? <FiCheckCircle className="text-green-400" size={14} />
            : incident.status === 'In Progress'
            ? <FiClock className="text-yellow-400" size={14} />
            : <FiAlertTriangle className="text-red-400" size={14} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500">{incident.incident_id}</span>
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono">
                  Impact: {incident.impact_percent}%
                </span>
              </div>
              <h4 className="text-white font-semibold mt-1 text-sm truncate group-hover:text-brand-300 transition-colors">
                {incident.title}
              </h4>
              <p className="text-slate-400 text-xs mt-1 truncate">{incident.symptoms}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <FiArrowRight className="text-slate-600 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" size={16} />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><FiClock size={10} /> {timeStr}</span>
            {incident.engineer && <span>{incident.engineer}</span>}
            {incident.actual_cause && (
              <span className="text-orange-400/60 truncate hidden sm:inline">→ {incident.actual_cause}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  FiInfo, FiChevronDown, FiActivity, FiClock, FiDownload,
  FiTrendingUp, FiSettings, FiCheckCircle, FiBookOpen, FiFileText
} from 'react-icons/fi'
import { listIncidents, getIncident, resolveIncident, getPostmortemPdfUrl } from '../api'
import { SeverityBadge, StatusBadge, LoadingSpinner, ErrorMessage } from '../components/ui'
import Timeline from '../components/Timeline'
import SimilarIncidents from '../components/SimilarIncidents'
import Recommendations from '../components/Recommendations'
import { toast } from 'react-hot-toast'

export default function DetailedIncident() {
  const location = useLocation()
  
  const [incidents, setIncidents] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [incidentDetail, setIncidentDetail] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [activeTab, setActiveTab] = useState('analysis')

  // Resolve form fields
  const [showResolve, setShowResolve] = useState(false)
  const [actualCause, setActualCause] = useState('')
  const [actualFix, setActualFix] = useState('')
  const [resolveTime, setResolveTime] = useState(30)

  // Load incident list on mount
  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await listIncidents({ limit: 100 })
        const incList = res.data.incidents || []
        setIncidents(incList)
        
        // Check if query param ?select=uuid is passed
        const params = new URLSearchParams(location.search)
        const selectParam = params.get('select')
        if (selectParam) {
          // If selectParam is human readable (e.g. INC-0001), match by incident_id
          const matched = incList.find(i => i.id === selectParam || i.incident_id === selectParam)
          if (matched) {
            setSelectedId(matched.id)
          }
        } else if (incList.length > 0) {
          setSelectedId(incList[0].id)
        }
      } catch (err) {
        setError('Failed to fetch incidents list')
      }
    }
    fetchList()
  }, [location.search])

  // Fetch detail when selected incident ID changes
  useEffect(() => {
    if (!selectedId) return
    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getIncident(selectedId)
        setIncidentDetail(res.data)
      } catch (err) {
        setError('Failed to load incident detailed info')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [selectedId])

  const handleResolve = async (e) => {
    e.preventDefault()
    if (!actualCause || !actualFix) {
      toast.error('Actual cause and actual fix are required')
      return
    }

    try {
      const res = await resolveIncident(selectedId, {
        actual_cause: actualCause,
        actual_fix: actualFix,
        resolution_time_minutes: resolveTime
      })
      toast.success('Incident resolved successfully!')
      setIncidentDetail(res.data)
      setShowResolve(false)
      // Refresh list to update status in dropdown
      const listRes = await listIncidents({ limit: 100 })
      setIncidents(listRes.data.incidents || [])
    } catch (err) {
      toast.error('Failed to resolve incident')
    }
  }

  // Formatting timestamp helper
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString()
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 font-sans text-slate-300">
      {/* Tab Header */}
      <div className="mb-6 animate-fade-in flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📊 Get <span className="gradient-text">Detailed Analysis</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Deep-dive SRE telemetry, timelines, and postmortems</p>
        </div>
        
        {/* Incident Selector Dropdown */}
        <div className="relative w-full md:w-80">
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Select Incident</label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-surface border border-surface-border text-white text-sm rounded-xl pl-4 pr-10 py-2.5 appearance-none focus:outline-none focus:border-brand-500/50 cursor-pointer font-medium"
            >
              {incidents.length === 0 && <option value="">No incidents reported</option>}
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.incident_id} — {inc.title.slice(0, 25)}{inc.title.length > 25 ? '...' : ''} ({inc.status})
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner text="Querying detailed telemetry..." />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && incidentDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Header summary */}
            <div className="glass border border-surface-border rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono text-slate-500">{incidentDetail.incident_id}</span>
                <SeverityBadge severity={incidentDetail.severity} />
                <StatusBadge status={incidentDetail.status} />
                <span className="text-xs font-mono text-slate-400 bg-surface px-2.5 py-0.5 rounded-lg">
                  Cluster: {incidentDetail.cluster_name || 'System Issue'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{incidentDetail.title}</h2>
              <div className="bg-surface/30 p-4 rounded-xl border border-surface-border/50">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Symptoms Reported</span>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{incidentDetail.symptoms}</p>
              </div>

              {/* Predict resolution duration */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-surface-border/50 text-xs text-slate-400">
                <span>Created: {formatDate(incidentDetail.created_at)}</span>
                <span className="flex items-center gap-1.5 text-brand-300 font-mono">
                  <FiClock size={14} /> Estimated Resolution: {incidentDetail.estimated_resolution_time_minutes} mins
                </span>
              </div>
            </div>

            {/* Sub-tabs selection */}
            <div className="flex border-b border-surface-border/50 gap-2">
              {[
                { id: 'analysis', label: '🧠 SRE Diagnosis' },
                { id: 'timeline', label: '⏱️ Incident Timeline' },
                { id: 'postmortem', label: '📝 Postmortem Report' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-300 bg-brand-500/5'
                      : 'border-transparent text-slate-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: SRE DIAGNOSIS */}
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                {/* User Impact Analyzer telemetry */}
                <div className="glass border border-surface-border rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
                    <FiTrendingUp size={14} /> User Impact Analyzer
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-surface/30 p-3.5 rounded-xl border border-surface-border/40 text-center">
                      <span className="text-[10px] text-slate-500 block">Active Users</span>
                      <span className="text-lg font-bold text-white font-mono">{incidentDetail.active_users}</span>
                    </div>
                    <div className="bg-surface/30 p-3.5 rounded-xl border border-surface-border/40 text-center">
                      <span className="text-[10px] text-slate-500 block">Affected Users</span>
                      <span className="text-lg font-bold text-orange-400 font-mono">{incidentDetail.affected_users}</span>
                    </div>
                    <div className="bg-surface/30 p-3.5 rounded-xl border border-surface-border/40 text-center">
                      <span className="text-[10px] text-slate-500 block">Impact Percent</span>
                      <span className="text-lg font-bold text-red-400 font-mono">{incidentDetail.impact_percent}%</span>
                    </div>
                    <div className="bg-surface/30 p-3.5 rounded-xl border border-surface-border/40 text-center">
                      <span className="text-[10px] text-slate-500 block">Revenue Risk</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-wide bg-red-500/20 text-red-400 border border-red-500/30">
                        {incidentDetail.revenue_risk}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SRE playbooks / ranked fixes recommendations */}
                <div className="glass border border-surface-border rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
                    <FiSettings size={14} /> Success-Rate Ranked Fix recommendations
                  </h3>
                  <div className="space-y-4">
                    {incidentDetail.ai_causes && incidentDetail.ai_causes.map((fix, idx) => (
                      <div key={idx} className="bg-surface/20 border border-surface-border/60 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <h4 className="font-bold text-white text-sm">{fix.fix_action}</h4>
                          <span className="text-emerald-400 font-mono font-bold">
                            Success: {Math.round(fix.success_rate * 100)}%
                          </span>
                        </div>
                        {/* progress success bar */}
                        <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${fix.success_rate * 100}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 italic leading-relaxed">{fix.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SRE Prevention alert suggestions */}
                <div className="glass border border-surface-border rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    🛡️ SRE Prevention recommendations
                  </h3>
                  <div className="space-y-3">
                    {incidentDetail.ai_steps && incidentDetail.ai_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs bg-surface-elevated/40 border border-surface-border/40 p-3.5 rounded-xl">
                        <input type="checkbox" defaultChecked className="rounded border-slate-500 bg-surface mt-0.5 text-brand-600 focus:ring-0" />
                        <div>
                          <p className="text-white font-bold">{step}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Recommended action to bypass duplication alert logs.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="glass border border-surface-border rounded-2xl p-6">
                <Timeline events={incidentDetail.timeline} />
              </div>
            )}

            {/* TAB CONTENT: POSTMORTEM */}
            {activeTab === 'postmortem' && (
              <div className="glass border border-surface-border rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-surface-border/50 pb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FiBookOpen size={16} /> Incident Postmortem Analysis
                  </h3>
                  {incidentDetail.status === 'Resolved' && (
                    <a
                      href={getPostmortemPdfUrl(incidentDetail.id)}
                      download
                      className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3"
                    >
                      <FiDownload size={14} /> Download PDF
                    </a>
                  )}
                </div>

                {incidentDetail.status !== 'Resolved' ? (
                  <div className="text-center py-10 bg-surface/30 rounded-xl border border-surface-border/40">
                    <FiFileText className="mx-auto text-slate-500 mb-3" size={32} />
                    <p className="text-slate-400 text-sm">Postmortem will generate automatically after resolution.</p>
                    <button 
                      onClick={() => setShowResolve(true)} 
                      className="btn-primary mt-4 mx-auto text-xs py-2"
                    >
                      Resolve Incident Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Actual Root Cause</h4>
                      <p className="text-slate-300 text-sm leading-relaxed">{incidentDetail.actual_cause}</p>
                    </div>
                    <div>
                      <h4 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Actual Fix Applied</h4>
                      <p className="text-slate-300 text-sm leading-relaxed">{incidentDetail.actual_fix}</p>
                    </div>
                    <div>
                      <h4 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Resolution time</h4>
                      <p className="text-slate-300 text-sm font-mono">{incidentDetail.resolution_time_minutes} minutes</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar SRE sidebar panel details */}
          <div className="space-y-6">
            {/* Resolve Incident card button */}
            {incidentDetail.status !== 'Resolved' && !showResolve && (
              <button
                onClick={() => setShowResolve(true)}
                className="w-full btn-primary bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 py-3.5 flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-xs"
              >
                <FiCheckCircle size={16} />
                Resolve Incident
              </button>
            )}

            {/* Resolve Form Block */}
            {showResolve && (
              <form onSubmit={handleResolve} className="glass border border-emerald-500/30 rounded-2xl p-5 space-y-4 bg-emerald-500/5 animate-slide-up">
                <div className="flex items-center justify-between border-b border-surface-border pb-2">
                  <h3 className="font-bold text-white text-sm">Resolve Incident</h3>
                  <button type="button" onClick={() => setShowResolve(false)} className="text-xs text-slate-500 hover:text-white underline">Cancel</button>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Actual Root Cause</label>
                  <input
                    type="text"
                    required
                    value={actualCause}
                    onChange={(e) => setActualCause(e.target.value)}
                    placeholder="e.g. Missing index on user_id"
                    className="w-full bg-surface border border-surface-border text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Actual Fix Applied</label>
                  <input
                    type="text"
                    required
                    value={actualFix}
                    onChange={(e) => setActualFix(e.target.value)}
                    placeholder="e.g. Ran CREATE INDEX idx_user_id"
                    className="w-full bg-surface border border-surface-border text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Resolution Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={resolveTime}
                    onChange={(e) => setResolveTime(e.target.value)}
                    className="w-full bg-surface border border-surface-border text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500/50"
                  />
                </div>

                <button type="submit" className="w-full btn-primary bg-emerald-600 border border-emerald-500 py-2.5 font-bold text-xs uppercase">
                  Submit Resolution
                </button>
              </form>
            )}

            {/* Similar historical incidents memory */}
            <div className="glass border border-surface-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                🧠 Similar incident memory
              </h3>
              <SimilarIncidents incidents={incidentDetail.similar_incidents} />
            </div>

            {/* Industry best SRE recovery case studies */}
            <div className="glass border border-surface-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                🏢 Industry outage learning
              </h3>
              <div className="space-y-3">
                {/* If fallback or simulated references, display Netflix etc */}
                {[
                  {
                    company: "Netflix",
                    outage_pattern: "Connection pool lock out",
                    recovery_strategy: "Leveraged client-side hystrix circuit breakers"
                  },
                  {
                    company: "Cloudflare",
                    outage_pattern: "WAF CPU regex loop deadlock",
                    recovery_strategy: "Implemented automatic regex length limiting rules"
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-surface/20 border border-surface-border/50 p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{item.company}</span>
                      <span className="text-[9px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Case Reference</span>
                    </div>
                    <p className="text-slate-400"><strong className="text-slate-300">Outage:</strong> {item.outage_pattern}</p>
                    <p className="text-[10px] text-slate-400 italic"><strong className="text-slate-300 font-semibold">Solution:</strong> {item.recovery_strategy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

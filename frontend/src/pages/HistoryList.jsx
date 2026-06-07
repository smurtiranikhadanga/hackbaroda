import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiClock, FiDownload, FiFolder, FiCheckCircle, FiFileText, FiBookOpen } from 'react-icons/fi'
import { listIncidents, getPostmortemPdfUrl } from '../api'
import { SeverityBadge, StatusBadge, LoadingSpinner } from '../components/ui'

export default function HistoryList() {
  const location = useLocation()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')

  // Set sub-tab based on query param ?tab=timeline/postmortem/grouped
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab === 'postmortem') {
      setActiveTab('postmortem')
    } else if (tab === 'grouped') {
      setActiveTab('grouped')
    } else {
      setActiveTab('timeline')
    }
  }, [location.search])

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true)
      try {
        const res = await listIncidents({ limit: 100 })
        setIncidents(res.data.incidents || [])
      } catch (err) {
        console.error('Failed to load history list')
      } finally {
        setLoading(false)
      }
    }
    fetchIncidents()
  }, [])

  // Filter lists
  const resolvedIncidents = incidents.filter(i => i.status === 'Resolved')

  // Group incidents by cluster_id
  const clusters = incidents.reduce((acc, curr) => {
    const cid = curr.cluster_id || 'unclustered'
    const cname = curr.cluster_name || 'General Issues'
    if (!acc[cid]) {
      acc[cid] = { name: cname, list: [] }
    }
    acc[cid].list.push(curr)
    return acc;
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 font-sans text-slate-300">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          📜 History & <span className="gradient-text">Archives</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">Audit past resolutions, download postmortems, or review duplicate groups</p>
      </div>

      {/* Sub-tabs toggles */}
      <div className="flex border-b border-surface-border/50 gap-2 mb-6">
        {[
          { id: 'timeline', label: '⏱️ Incident Timelines' },
          { id: 'postmortem', label: '📄 Postmortem Files' },
          { id: 'grouped', label: '📁 Grouped Problems' }
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

      {loading && <LoadingSpinner text="Reading history logs..." />}

      {!loading && (
        <div className="animate-slide-up">
          {/* TAB 1: INCIDENT TIMELINES */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Simplified Resolution times bar graph */}
              {resolvedIncidents.length > 0 && (
                <div className="glass border border-surface-border rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    ⏱️ SRE Resolution Time Comparison (in minutes)
                  </h3>
                  <div className="space-y-3">
                    {resolvedIncidents.map(inc => {
                      const time = inc.resolution_time_minutes || 15
                      // Map time to width percentage (max 120 mins)
                      const pct = Math.min(100, Math.max(10, (time / 120) * 100))
                      return (
                        <div key={inc.id} className="space-y-1 text-xs">
                          <div className="flex justify-between font-mono text-slate-400 text-[11px]">
                            <span>{inc.incident_id} — {inc.title}</span>
                            <span className="font-bold text-white">{time} mins</span>
                          </div>
                          <div className="w-full bg-surface-elevated h-3 rounded-full overflow-hidden">
                            <div 
                              className="bg-brand-500 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* List of timelines */}
              <div className="space-y-3">
                {incidents.length === 0 && <p className="text-center text-xs py-10 text-slate-500">No incident logs found.</p>}
                {incidents.map(inc => (
                  <div key={inc.id} className="glass border border-surface-border rounded-xl p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{inc.incident_id}</span>
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} />
                      </div>
                      <h4 className="text-white font-bold mt-1 text-sm">{inc.title}</h4>
                      <p className="text-slate-400 text-xs mt-1 truncate">{inc.symptoms}</p>
                      {inc.actual_cause && (
                        <div className="mt-3 text-xs bg-surface/40 p-2.5 rounded-lg border border-surface-border/40 space-y-1">
                          <p className="text-slate-400"><strong className="text-slate-300">Cause:</strong> {inc.actual_cause}</p>
                          <p className="text-slate-400"><strong className="text-slate-300">Fix Applied:</strong> {inc.actual_fix}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(inc.created_at).toLocaleDateString()}
                      </span>
                      <Link to={`/detailed?select=${inc.id}`} className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline mt-2">
                        Inspect Timeline
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: POSTMORTEMS */}
          {activeTab === 'postmortem' && (
            <div className="space-y-3">
              {resolvedIncidents.length === 0 ? (
                <div className="text-center py-12 bg-surface/20 rounded-2xl border border-surface-border">
                  <FiBookOpen className="mx-auto text-slate-500 mb-3" size={28} />
                  <p className="text-slate-400 text-xs">No resolved incidents have generated postmortems yet.</p>
                </div>
              ) : (
                resolvedIncidents.map(inc => (
                  <div key={inc.id} className="glass border border-surface-border rounded-xl p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-300">
                        <FiFileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 font-mono block">POSTMORTEM FILE</span>
                        <h4 className="text-white font-bold text-sm truncate">{inc.incident_id} — {inc.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Cause: {inc.actual_cause}</p>
                      </div>
                    </div>
                    <a
                      href={getPostmortemPdfUrl(inc.id)}
                      download
                      className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3 flex-shrink-0 bg-brand-600 border border-brand-500 hover:bg-brand-500"
                    >
                      <FiDownload size={14} /> PDF File
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: GROUPED PROBLEMS */}
          {activeTab === 'grouped' && (
            <div className="space-y-6">
              {Object.keys(clusters).map(cid => {
                const cluster = clusters[cid]
                return (
                  <div key={cid} className="glass border border-surface-border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-border/50 pb-3">
                      <FiFolder className="text-brand-400" size={18} />
                      <div>
                        <h3 className="text-white font-bold text-sm">{cluster.name}</h3>
                        <span className="text-[10px] text-slate-500 font-mono">Cluster ID: {cid.slice(0, 8)}... ({cluster.list.length} reported issues)</span>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {cluster.list.map(inc => (
                        <div key={inc.id} className="flex items-center justify-between bg-surface/30 p-3 rounded-xl border border-surface-border/40 text-xs">
                          <div className="min-w-0">
                            <span className="font-mono text-slate-500 pr-2">{inc.incident_id}</span>
                            <span className="text-white font-semibold">{inc.title}</span>
                            <p className="text-slate-400 text-[10px] mt-0.5 truncate">{inc.symptoms}</p>
                          </div>
                          <Link to={`/detailed?select=${inc.id}`} className="text-brand-400 hover:text-brand-300 font-medium underline flex-shrink-0">
                            Inspect
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

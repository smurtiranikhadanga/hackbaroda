import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FiArrowLeft, FiCheckCircle, FiLoader, FiFileText,
  FiDownload, FiUser, FiClock, FiActivity, FiX
} from 'react-icons/fi'
import { format } from 'date-fns'
import { getIncident, resolveIncident, getPostmortem, getPostmortemPdfUrl, getTimeline } from '../api'
import SimilarIncidents from '../components/SimilarIncidents'
import Recommendations from '../components/Recommendations'
import Timeline from '../components/Timeline'
import { SeverityBadge, StatusBadge, LoadingSpinner, ErrorMessage } from '../components/ui'
import toast from 'react-hot-toast'

export default function IncidentDetail() {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('analysis')
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [postmortem, setPostmortem] = useState(null)
  const [loadingPostmortem, setLoadingPostmortem] = useState(false)

  const loadIncident = async () => {
    setLoading(true)
    setError(null)
    try {
      const [incRes, tlRes] = await Promise.all([getIncident(id), getTimeline(id)])
      setIncident(incRes.data)
      setTimeline(tlRes.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load incident.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadIncident() }, [id])

  const handleLoadPostmortem = async () => {
    setLoadingPostmortem(true)
    try {
      const { data } = await getPostmortem(id)
      setPostmortem(data)
      setActiveTab('postmortem')
    } catch (e) {
      toast.error('Failed to generate postmortem.')
    } finally {
      setLoadingPostmortem(false)
    }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-8"><LoadingSpinner text="Loading incident analysis..." /></div>
  if (error) return <div className="max-w-6xl mx-auto px-6 py-8"><ErrorMessage message={error} /></div>
  if (!incident) return null

  const isResolved = incident.status === 'Resolved'

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 mb-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <Link to="/" className="mt-1 text-slate-400 hover:text-white transition-colors">
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono text-slate-500">{incident.incident_id}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">{incident.title}</h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
              {incident.engineer && <span className="flex items-center gap-1"><FiUser size={11} />{incident.engineer}</span>}
              <span className="flex items-center gap-1">
                <FiClock size={11} />
                {incident.created_at ? format(new Date(incident.created_at), 'MMM d, yyyy HH:mm') : ''}
              </span>
              {incident.confidence !== null && incident.confidence !== undefined && (
                <span className="flex items-center gap-1">
                  <FiActivity size={11} />
                  AI Confidence: <span className="text-brand-400 font-semibold">{Math.round(incident.confidence * 100)}%</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {!isResolved && (
            <button
              id="resolve-btn"
              onClick={() => setShowResolveModal(true)}
              className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm"
            >
              <FiCheckCircle size={15} /> Resolve
            </button>
          )}
          <button
            id="postmortem-btn"
            onClick={handleLoadPostmortem}
            disabled={loadingPostmortem}
            className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm"
          >
            {loadingPostmortem ? <FiLoader className="animate-spin" size={15} /> : <FiFileText size={15} />}
            Postmortem
          </button>
          {isResolved && (
            <a
              id="pdf-download-btn"
              href={getPostmortemPdfUrl(id)}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm"
            >
              <FiDownload size={15} /> PDF
            </a>
          )}
        </div>
      </div>

      {/* Symptoms */}
      <div className="glass rounded-2xl p-5 mb-6 animate-slide-up">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Symptoms</p>
        <p className="text-slate-300">{incident.symptoms}</p>
      </div>

      {/* Resolution info (if resolved) */}
      {isResolved && incident.actual_cause && (
        <div className="glass rounded-2xl p-5 mb-6 border border-green-500/20 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <FiCheckCircle className="text-green-400" size={16} />
            <p className="text-green-400 font-semibold text-sm">Resolved</p>
            {incident.resolution_time_minutes && (
              <span className="text-xs text-slate-500 ml-auto">in {incident.resolution_time_minutes} min</span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Actual Root Cause</p>
              <p className="text-slate-200 text-sm">{incident.actual_cause}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Applied Fix</p>
              <p className="text-slate-200 text-sm">{incident.actual_fix}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['analysis', 'timeline', ...(postmortem ? ['postmortem'] : [])].map(tab => (
          <button
            key={tab}
            id={`detail-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                : 'text-slate-400 hover:text-white hover:bg-surface-elevated border border-transparent'
            }`}
          >
            {tab === 'analysis' ? '🔍 Analysis' : tab === 'timeline' ? '⏱️ Timeline' : '📋 Postmortem'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'analysis' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Recommendations
              possibleCauses={incident.ai_causes || []}
              recommendedSteps={incident.ai_steps || []}
              overallConfidence={incident.confidence}
            />
          </div>
          <SimilarIncidents incidents={incident.similar_incidents || []} />
        </div>
      )}

      {activeTab === 'timeline' && (
        <Timeline events={timeline} />
      )}

      {activeTab === 'postmortem' && postmortem && (
        <PostmortemView report={postmortem} pdfUrl={getPostmortemPdfUrl(id)} />
      )}

      {/* Resolve modal */}
      {showResolveModal && (
        <ResolveModal
          incidentId={id}
          onClose={() => setShowResolveModal(false)}
          onResolved={() => { setShowResolveModal(false); loadIncident() }}
        />
      )}
    </div>
  )
}

function ResolveModal({ incidentId, onClose, onResolved }) {
  const [form, setForm] = useState({ actual_cause: '', actual_fix: '', resolution_time_minutes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.actual_cause || !form.actual_fix) {
      toast.error('Please fill in the root cause and fix.')
      return
    }
    setSaving(true)
    try {
      await resolveIncident(incidentId, {
        ...form,
        resolution_time_minutes: form.resolution_time_minutes ? parseInt(form.resolution_time_minutes) : undefined,
      })
      toast.success('✅ Incident resolved! Vector memory has been updated.')
      onResolved()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to resolve incident.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl p-8 w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Resolve Incident</h3>
          <button id="close-resolve-modal" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Actual Root Cause <span className="text-red-400">*</span></label>
            <input
              id="resolve-cause"
              type="text"
              placeholder="e.g. Redis cache failure, Connection pool exhausted"
              value={form.actual_cause}
              onChange={e => setForm(f => ({ ...f, actual_cause: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Fix Applied <span className="text-red-400">*</span></label>
            <textarea
              id="resolve-fix"
              rows={3}
              placeholder="e.g. Restarted Redis cluster, increased connection pool size"
              value={form.actual_fix}
              onChange={e => setForm(f => ({ ...f, actual_fix: e.target.value }))}
              className="input-field resize-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Resolution Time (minutes)</label>
            <input
              id="resolve-time"
              type="number"
              placeholder="e.g. 40"
              value={form.resolution_time_minutes}
              onChange={e => setForm(f => ({ ...f, resolution_time_minutes: e.target.value }))}
              className="input-field"
              min="0"
            />
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-sm text-green-300">
            ✨ The resolution will be embedded into vector memory to improve future incident analysis.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button id="confirm-resolve-btn" type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <FiLoader className="animate-spin" size={16} /> : <FiCheckCircle size={16} />}
              {saving ? 'Resolving...' : 'Mark Resolved'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PostmortemView({ report, pdfUrl }) {
  return (
    <div className="glass rounded-2xl p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">📋 Postmortem Report</h2>
          <p className="text-slate-400 text-sm">{report.incident_id} — {report.title}</p>
        </div>
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
          <FiDownload size={15} /> Download PDF
        </a>
      </div>

      {/* Meta grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        <MetaCard label="Severity" value={report.severity || 'Unknown'} />
        <MetaCard label="Created" value={report.created_at ? format(new Date(report.created_at), 'MMM d, yyyy') : '—'} />
        <MetaCard label="Resolution Time" value={report.resolution_time_minutes ? `${report.resolution_time_minutes} min` : '—'} />
      </div>

      {/* Root cause */}
      {report.root_cause && (
        <Section title="🔴 Root Cause">
          <p className="text-slate-300">{report.root_cause}</p>
        </Section>
      )}

      {/* Impact */}
      <Section title="💥 Impact Summary">
        <p className="text-slate-300">{report.impact_summary}</p>
      </Section>

      {/* Resolution steps */}
      <Section title="🔧 Resolution Steps">
        <ol className="space-y-2">
          {report.resolution_steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </Section>

      {/* Lessons learned */}
      <Section title="💡 Lessons Learned">
        <ul className="space-y-2">
          {report.lessons_learned.map((lesson, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-yellow-400 flex-shrink-0 mt-0.5">→</span>
              {lesson}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

function MetaCard({ label, value }) {
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="bg-surface-elevated border border-surface-border rounded-xl p-4">
        {children}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlusSquare, FiAlertCircle, FiArrowRight } from 'react-icons/fi'
import { submitIncident } from '../api'
import { toast } from 'react-hot-toast'

export default function AddIncident() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [engineer, setEngineer] = useState('')
  const [activeUsers, setActiveUsers] = useState(5000)
  const [affectedUsers, setAffectedUsers] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !symptoms.trim()) {
      toast.error('Title and Symptoms are required fields')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        symptoms: symptoms.trim(),
        engineer: engineer.trim() || null,
        active_users: parseInt(activeUsers) || 5000,
        affected_users: parseInt(affectedUsers) || 0
      }
      const res = await submitIncident(payload)
      toast.success(`Incident ${res.data.incident_id} created and analyzed successfully!`)
      // Navigate to detailed view
      navigate(`/incidents/${res.data.id}`)
    } catch (err) {
      toast.error('Failed to submit incident')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 font-sans text-slate-300">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🚨 Add <span className="gradient-text">Incident</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">Report New Incident to SRE Analyzer</p>
      </div>

      <form onSubmit={handleSubmit} className="glass border border-surface-border rounded-2xl p-6 space-y-6 animate-slide-up">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Incident Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Website Down, Database connection timeout..."
            className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>

        {/* Symptoms */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Symptoms</label>
          <p className="text-[10px] text-slate-500 italic mt-0.5">Please describe the error message, logs timeline, or telemetry metrics observed.</p>
          <textarea
            required
            rows={4}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. API Gateway returning 503 Service Unavailable, connection pool metrics depleted, CPU spiked at 95% starting 10:00 AM"
            className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>

        {/* Assigned Engineer */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Assigned Engineer</label>
          <input
            type="email"
            value={engineer}
            onChange={(e) => setEngineer(e.target.value)}
            placeholder="engineer@company.com (optional)"
            className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>

        {/* User Impact Analyzer telemetry fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-surface-border/50 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Active Users</label>
            <input
              type="number"
              min="1"
              value={activeUsers}
              onChange={(e) => setActiveUsers(e.target.value)}
              placeholder="5000"
              className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Affected Users</label>
            <input
              type="number"
              min="0"
              value={affectedUsers}
              onChange={(e) => setAffectedUsers(e.target.value)}
              placeholder="4200"
              className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-semibold text-sm transition-all"
        >
          {loading ? 'Analyzing Symptoms...' : 'Analyze Incident'}
          <FiArrowRight size={16} />
        </button>
      </form>
    </div>
  )
}

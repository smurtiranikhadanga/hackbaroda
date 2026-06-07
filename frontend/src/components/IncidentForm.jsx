import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiAlertTriangle, FiZap, FiUser, FiLoader, FiChevronRight } from 'react-icons/fi'
import { submitIncident } from '../api'
import toast from 'react-hot-toast'

export default function IncidentForm({ onSuccess }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', symptoms: '', engineer: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.title.trim() || form.title.length < 3)
      errs.title = 'Title must be at least 3 characters'
    if (!form.symptoms.trim() || form.symptoms.length < 5)
      errs.symptoms = 'Please describe the symptoms'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    try {
      const { data } = await submitIncident(form)
      toast.success(`🎯 Incident ${data.incident_id} analyzed — Severity: ${data.severity}`)
      if (onSuccess) onSuccess(data)
      navigate(`/incidents/${data.id}`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit incident. Is the backend running?'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(errs => ({ ...errs, [field]: undefined }))
  }

  return (
    <div className="glass rounded-2xl p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <FiAlertTriangle className="text-red-400" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Report New Incident</h2>
          <p className="text-slate-400 text-sm">AI will analyze symptoms and generate recommendations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="incident-title" className="block text-sm font-medium text-slate-300 mb-2">
            Incident Title <span className="text-red-400">*</span>
          </label>
          <input
            id="incident-title"
            type="text"
            placeholder="e.g. Website Down, API Timeout, Database Outage"
            value={form.title}
            onChange={handleChange('title')}
            className={`input-field ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            disabled={loading}
          />
          {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
        </div>

        {/* Symptoms */}
        <div>
          <label htmlFor="incident-symptoms" className="block text-sm font-medium text-slate-300 mb-2">
            Symptoms <span className="text-red-400">*</span>
          </label>
          <textarea
            id="incident-symptoms"
            rows={4}
            placeholder="Describe what you're observing: error messages, metrics, affected services, timeline..."
            value={form.symptoms}
            onChange={handleChange('symptoms')}
            className={`input-field resize-none ${errors.symptoms ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            disabled={loading}
          />
          {errors.symptoms && <p className="text-red-400 text-xs mt-1">{errors.symptoms}</p>}
          <p className="text-slate-500 text-xs mt-1">{form.symptoms.length} characters — be as detailed as possible for better AI analysis</p>
        </div>

        {/* Engineer */}
        <div>
          <label htmlFor="incident-engineer" className="block text-sm font-medium text-slate-300 mb-2">
            <span className="flex items-center gap-1.5"><FiUser size={13} /> Assigned Engineer</span>
          </label>
          <input
            id="incident-engineer"
            type="email"
            placeholder="engineer@company.com (optional)"
            value={form.engineer}
            onChange={handleChange('engineer')}
            className="input-field"
            disabled={loading}
          />
        </div>

        {/* AI Analysis hint */}
        <div className="flex items-start gap-3 bg-brand-600/10 border border-brand-500/20 rounded-xl p-4">
          <FiZap className="text-brand-400 mt-0.5 flex-shrink-0" size={16} />
          <div className="text-sm">
            <p className="text-brand-300 font-medium">AI Analysis Pipeline</p>
            <p className="text-slate-400 mt-0.5">
              Clicking Analyze will: embed in vector memory → find similar incidents → predict severity → generate root causes & resolution steps
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          id="analyze-incident-btn"
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base"
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" size={20} />
              Analyzing Incident...
            </>
          ) : (
            <>
              <FiZap size={20} />
              Analyze Incident
              <FiChevronRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}

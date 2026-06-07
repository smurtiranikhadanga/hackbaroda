import { useState } from 'react'
import { FiSettings, FiCheck, FiCpu, FiDatabase, FiShuffle } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

export default function Settings() {
  const [provider, setProvider] = useState('gemini')
  const [activeUsers, setActiveUsers] = useState(5000)
  
  const handleSave = (e) => {
    e.preventDefault()
    toast.success('System configurations updated successfully!')
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8 font-sans text-slate-300">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiSettings size={22} className="text-brand-400" /> Settings
        </h1>
        <p className="text-slate-400 text-xs mt-1">Configure AI SRE support playbooks and environment telemetry</p>
      </div>

      <form onSubmit={handleSave} className="glass border border-surface-border rounded-2xl p-6 space-y-6 animate-slide-up">
        {/* AI Provider configuration */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">AI Provider Engine</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider('gemini')}
              className={`py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                provider === 'gemini'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-surface-border bg-surface text-slate-400 hover:text-white'
              }`}
            >
              <FiCpu size={16} /> Gemini AI (Primary)
            </button>
            <button
              type="button"
              onClick={() => setProvider('openai')}
              className={`py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                provider === 'openai'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-surface-border bg-surface text-slate-400 hover:text-white'
              }`}
            >
              <FiShuffle size={16} /> OpenAI (Fallback)
            </button>
          </div>
        </div>

        {/* Telemetry Default Active Users */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Default Active Users Metric</label>
          <input
            type="number"
            value={activeUsers}
            onChange={(e) => setActiveUsers(e.target.value)}
            className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
          <p className="text-[10px] text-slate-500 italic mt-0.5">Used as denominator in computing User Impact percentages when unreported.</p>
        </div>

        {/* Integrations checklist */}
        <div className="space-y-3 border-t border-surface-border/50 pt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Integration Services</label>
          
          <div className="flex items-center justify-between p-3.5 bg-surface/20 border border-surface-border/40 rounded-xl">
            <div className="flex items-center gap-3">
              <FiDatabase className="text-emerald-400" size={18} />
              <div>
                <p className="text-xs font-bold text-white">Local SQLite Database Fallback</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Persistent database incidents cache enabled.</p>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">Online</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-surface/20 border border-surface-border/40 rounded-xl">
            <div className="flex items-center gap-3">
              <FiCpu className="text-yellow-400" size={18} />
              <div>
                <p className="text-xs font-bold text-white">In-Memory Vector Similarity Fallback</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Cosine-similarity search enabled.</p>
              </div>
            </div>
            <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold uppercase">Fallback</span>
          </div>
        </div>

        <button type="submit" className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-semibold">
          <FiCheck size={16} /> Save Settings
        </button>
      </form>
    </div>
  )
}

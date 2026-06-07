import { useState } from 'react'
import { FiBell, FiAlertCircle, FiCheck, FiInfo } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

export default function Notifications() {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'warning',
      title: 'Database CPU utilization spike',
      description: 'CPU load exceeded 92% on primary replica node-01 starting 16:00 UTC.',
      time: '10 mins ago',
      read: false
    },
    {
      id: 2,
      type: 'critical',
      title: 'Auto-Clustered duplicate events detected',
      description: 'Multiple occurrences of login timeouts automatically grouped under Database Performance Issue.',
      time: '25 mins ago',
      read: false
    },
    {
      id: 3,
      type: 'info',
      title: 'Weekly health audit complete',
      description: 'All system checks reported optimal latency and SSO authorization synchronization.',
      time: '2 hours ago',
      read: true
    }
  ])

  const markAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
    toast.success('All notifications marked as read')
  }

  const toggleRead = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: !a.read } : a))
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 font-sans text-slate-300">
      <div className="flex justify-between items-center mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiBell size={22} className="text-brand-400" /> Notifications & Alerts
          </h1>
          <p className="text-slate-400 text-xs mt-1">Live service health checks and alert telemetry</p>
        </div>
        
        {alerts.some(a => !a.read) && (
          <button 
            onClick={markAllRead}
            className="text-xs text-brand-400 hover:text-brand-300 underline font-semibold flex items-center gap-1.5"
          >
            <FiCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3 animate-slide-up">
        {alerts.map(a => (
          <div 
            key={a.id}
            onClick={() => toggleRead(a.id)}
            className={`glass border rounded-2xl p-5 cursor-pointer transition-all flex items-start gap-4 ${
              a.read 
                ? 'border-surface-border bg-surface/20 opacity-70' 
                : 'border-brand-500/40 bg-brand-500/5 hover:border-brand-500/60'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
              a.type === 'critical' 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : a.type === 'warning'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
            }`}>
              <FiAlertCircle size={16} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className={`font-semibold text-sm ${a.read ? 'text-slate-400' : 'text-white'}`}>{a.title}</h3>
                <span className="text-[10px] text-slate-500 font-mono">{a.time}</span>
              </div>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

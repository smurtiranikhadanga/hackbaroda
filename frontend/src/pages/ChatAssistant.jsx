import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FiSend, FiMessageSquare, FiAlertCircle, FiCheck, FiX, FiActivity,
  FiClock, FiShield, FiHelpCircle, FiPlay, FiCpu, FiTerminal,
  FiCheckCircle, FiXCircle, FiChevronDown, FiChevronUp, FiDatabase, FiSettings
} from 'react-icons/fi'
import { sendChatMessage, submitIncident, scanUrl, autofixUrl } from '../api'
import { toast } from 'react-hot-toast'

// Preset URLs and their corresponding problems
const URL_PRESETS = [
  { url: 'http://auth.mycompany.com', label: '🔑 SSO Authentication (Login Timeout)' },
  { url: 'http://shop.mycompany.com', label: '🛒 checkout/shop API (503 Service Unavailable)' },
  { url: 'http://api.mycompany.com/db', label: '💾 Core Database (Pool Exhaustion)' },
  { url: 'http://dns.mycompany.com/check', label: '🌐 Domain Nameserver (DNS Sync Latency)' }
]

// Animated Terminal Component for Autofix log rendering
function AutofixTerminal({ logs, onComplete }) {
  const [visibleLogs, setVisibleLogs] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < logs.length) {
      const timer = setTimeout(() => {
        setVisibleLogs(prev => [...prev, logs[currentIndex]])
        setCurrentIndex(prev => prev + 1)
      }, 700) // print each log every 700ms
      return () => clearTimeout(timer)
    } else if (currentIndex === logs.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, logs, onComplete])

  return (
    <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-green-400 space-y-1.5 shadow-inner border border-slate-900 max-w-full overflow-x-auto my-3">
      <div className="flex items-center gap-1.5 text-slate-500 border-b border-slate-900 pb-1.5 mb-2">
        <FiTerminal size={12} />
        <span>SRE Automated Remediation Runner</span>
      </div>
      {visibleLogs.map((log, idx) => (
        <div key={idx} className="flex gap-2">
          <span className="text-slate-500">[{log.time}]</span>
          <span className="text-blue-400">{log.step}:</span>
          <span className={log.result.includes('Failed') || log.result.includes('Warning') ? 'text-yellow-500' : 'text-emerald-400'}>
            {log.result}
          </span>
        </div>
      ))}
      {currentIndex < logs.length && (
        <div className="flex items-center gap-1.5 text-slate-400 mt-2 animate-pulse">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
          <span>Running repair scripts...</span>
        </div>
      )}
    </div>
  )
}

export default function ChatAssistant() {
  const location = useLocation()
  const navigate = useNavigate()

  // Basic inline parser to render bold text
  const parseInlineMarkdown = (text) => {
    if (!text) return ''
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am **Incident Mind AI**, your SRE Support Agent. I remember past incidents, root causes, mitigation strategies, and resolution processes, and leverage these previous experiences to recommend solutions when similar incidents occur. How can I assist you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedIncident, setSuggestedIncident] = useState(null)
  
  // Custom URL Scanning and Autofixing Inputs
  const [selectedPresetUrl, setSelectedPresetUrl] = useState(URL_PRESETS[0].url)
  const [customUrl, setCustomUrl] = useState('')
  
  // Collapsed states for past incidents inside diagnostic cards
  const [collapsedIncidents, setCollapsedIncidents] = useState({})

  const messagesEndRef = useRef(null)

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const queryProcessedRef = useRef(false)

  // Handle query parameter passed from global chat input bar
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const initialQuery = params.get('q')
    if (initialQuery && !queryProcessedRef.current) {
      queryProcessedRef.current = true
      handleSend(null, initialQuery)
      // Clear query params to keep URL clean and prevent double-triggering
      navigate('/chat', { replace: true })
    }
  }, [location.search])

  // Send standard chat messages
  const handleSend = async (e, textToSend = null) => {
    if (e) e.preventDefault()
    const prompt = (textToSend || input).trim()
    if (!prompt) return

    if (!textToSend) setInput('')
    
    // Add user message
    const userMsg = { role: 'user', content: prompt }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setSuggestedIncident(null)

    try {
      const historyToSend = messages.slice(1).map(m => ({ role: m.role, content: m.content }))
      const res = await sendChatMessage(prompt, historyToSend)
      
      const botReply = {
        role: 'assistant',
        content: res.data.reply,
        diagnostic_card: res.data.diagnostic_card
      }
      setMessages(prev => [...prev, botReply])
      
      if (res.data.suggested_incident_data) {
        setSuggestedIncident(res.data.suggested_incident_data)
      }
    } catch (err) {
      toast.error('Failed to communicate with SRE Chat Agent')
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Make sure the backend server is running.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Trigger site scan via URL
  const handleScanClick = async () => {
    const url = customUrl.trim() || selectedPresetUrl
    if (!url) return

    setLoading(true)
    setSuggestedIncident(null)

    // Add user message indicating action
    setMessages(prev => [...prev, { role: 'user', content: `🔍 Run diagnostic scan on: ${url}` }])

    try {
      const res = await scanUrl(url)
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `### 📋 Scan Results: ${url}\nDiagnostic SRE telemetry compiled successfully. Below are the root cause analyses, autodiagnostics logs, similar cases, and quick fixes.`,
          diagnostic_card: res.data
        }
      ])
    } catch (err) {
      toast.error('Failed to execute diagnostic scan')
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Telemetry scanner failed to query the endpoint: ${url}. Ensure the backend service is operational.`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Trigger site autofix via URL
  const handleAutofixClick = async () => {
    const url = customUrl.trim() || selectedPresetUrl
    if (!url) return

    setLoading(true)
    setSuggestedIncident(null)

    // Add user message indicating action
    setMessages(prev => [...prev, { role: 'user', content: `🔧 Trigger Auto-Remediation on: ${url}` }])

    try {
      const res = await autofixUrl(url)
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `### ⚙️ Auto-Fix Remediator: ${url}\nInitiated pipeline remediation scripts. Terminal logs are running below.`,
          autofix_card: res.data
        }
      ])
    } catch (err) {
      toast.error('Failed to initiate Auto-Fix workflow')
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Automated repair scripts failed to execute for URL: ${url}.`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Handle Escalating incident tickets on click
  const handleCreateIncident = async () => {
    if (!suggestedIncident) return
    
    try {
      setLoading(true)
      const payload = {
        title: suggestedIncident.title,
        symptoms: suggestedIncident.symptoms,
        engineer: suggestedIncident.engineer || 'oncall@company.com',
        active_users: 5000,
        affected_users: 4200
      }
      const res = await submitIncident(payload)
      toast.success(`Incident ${res.data.incident_id} created successfully!`)
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Incident ticket **${res.data.incident_id}** ("${res.data.title}") has been created. The SRE team has been notified. You can review detail logs in the History tab.`
        }
      ])
      setSuggestedIncident(null)
    } catch (err) {
      toast.error('Failed to open incident ticket')
    } finally {
      setLoading(false)
    }
  }

  // Quick Troubleshoot preset buttons
  const quickTroubleshoot = (topic) => {
    let prompt = ''
    if (topic === 'password') {
      prompt = "My password is correct but login is still failing"
    } else if (topic === 'website') {
      prompt = "Website not opening"
    } else if (topic === 'database') {
      prompt = "Troubleshoot database timeout observed"
    }
    handleSend(null, prompt)
  }

  // Toggle Collapse block inside diagnostic cards
  const toggleCollapse = (msgIdx, cardId) => {
    const key = `${msgIdx}_${cardId}`
    setCollapsedIncidents(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Handle Feedback (Yes / No)
  const handleFeedback = (msgIndex, isResolved, cardData) => {
    setMessages(prev => {
      const copy = [...prev]
      const msg = { ...copy[msgIndex] }
      
      if (msg.diagnostic_card) {
        msg.diagnostic_card = { 
          ...msg.diagnostic_card, 
          status: isResolved ? 'Resolved' : 'Open',
          feedback_applied: true,
          feedback_resolved: isResolved
        }
      } else if (msg.autofix_card) {
        msg.autofix_card = { 
          ...msg.autofix_card, 
          status: isResolved ? 'Resolved' : 'Open',
          feedback_applied: true,
          feedback_resolved: isResolved
        }
      }
      
      copy[msgIndex] = msg
      return copy
    })

    if (isResolved) {
      toast.success("Feedback saved! Logged fix in learning engine.", { icon: '🎉' })
    } else {
      toast.error("Remediation failed. Preparing escalation ticket...", { icon: '⚠️' })
      // Auto draft ticket details based on card data
      setSuggestedIncident({
        title: `Outage Escalation: ${cardData.troubleshooter_type || cardData.fixed_issue || 'SRE Diagnostic'}`,
        symptoms: `Automated diagnostic scan on URL: ${cardData.url} identified critical failures. Resolved by bot: false. Complexity: ${cardData.complexity}.`,
        engineer: 'oncall_sre@company.com'
      })
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 h-[calc(100vh-4rem)] flex flex-col font-sans text-slate-300">
      
      {/* 1. Header Area */}
      <div className="mb-4 animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-surface-border/30 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🛡️ Conversational SRE <span className="gradient-text">Copilot</span>
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Diagnose service lockups, run automated scans, or execute auto-fix scripts.</p>
        </div>
        
        {/* Quick Troubleshoot Preset Tags */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => quickTroubleshoot('password')}
            className="bg-surface border border-surface-border hover:border-brand-500/40 hover:bg-surface-elevated text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
          >
            🔑 Auth Lockout
          </button>
          <button 
            onClick={() => quickTroubleshoot('website')}
            className="bg-surface border border-surface-border hover:border-brand-500/40 hover:bg-surface-elevated text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
          >
            🌐 DNS/Site Down
          </button>
          <button 
            onClick={() => quickTroubleshoot('database')}
            className="bg-surface border border-surface-border hover:border-brand-500/40 hover:bg-surface-elevated text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
          >
            💾 DB Timeout
          </button>
        </div>
      </div>

      {/* 2. Auto-Scan & Auto-Fix Control Center Panel */}
      <div className="bg-surface-elevated/70 border border-surface-border rounded-2xl p-4 mb-4 shadow-lg animate-fade-in backdrop-blur-sm grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-4 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service URL Presets</label>
          <select 
            value={selectedPresetUrl}
            onChange={(e) => {
              setSelectedPresetUrl(e.target.value)
              setCustomUrl('')
            }}
            className="w-full bg-surface border border-surface-border text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500/50"
          >
            {URL_PRESETS.map((p, idx) => (
              <option key={idx} value={p.url}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-5 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Or Custom Server Endpoint</label>
          <input 
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="e.g. https://my-service.com/api"
            className="w-full bg-surface border border-surface-border text-xs text-white placeholder-slate-500 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500/50"
          />
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
          <button
            onClick={handleScanClick}
            disabled={loading}
            className="bg-surface hover:bg-surface-border border border-brand-500/30 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <FiActivity className="text-brand-400" size={13} />
            Scan Site
          </button>
          <button
            onClick={handleAutofixClick}
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 border border-brand-500/20"
          >
            <FiPlay size={13} />
            Auto-Fix
          </button>
        </div>
      </div>

      {/* 3. Main Chat Viewport */}
      <div className="flex-grow overflow-y-auto bg-surface-elevated/20 border border-surface-border rounded-2xl p-5 space-y-5 mb-4 backdrop-blur-md relative">
        {messages.map((m, index) => {
          const isUser = m.role === 'user'
          return (
            <div 
              key={index} 
              className={`flex gap-3 max-w-[95%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Profile Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                isUser 
                  ? 'bg-brand-600/10 border-brand-500/30 text-brand-300' 
                  : 'bg-surface border-surface-border text-slate-400'
              }`}>
                {isUser ? 'U' : <FiShield size={14} className="text-brand-400" />}
              </div>

              {/* Chat Message Box */}
              <div className="space-y-3 max-w-full">
                {/* Standard Message Content */}
                {m.content && (
                  <div className={`rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-brand-600/15 border border-brand-500/30 text-white rounded-tr-none'
                      : 'bg-surface border border-surface-border/50 text-slate-300 rounded-tl-none prose prose-invert'
                  }`}>
                    {m.content.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h3 key={idx} className="font-bold text-white text-sm mt-3 mb-1.5">{parseInlineMarkdown(line.slice(4))}</h3>
                      }
                      
                      // Match bullet points starting with - or * (with or without bold tags)
                      const bulletMatch = line.match(/^[-*]\s+(.*)$/)
                      if (bulletMatch) {
                        return (
                          <div key={idx} className="flex items-start gap-2 my-1 ml-2 font-medium">
                            <span className="text-brand-400 font-bold select-none">•</span>
                            <span className="text-slate-300">{parseInlineMarkdown(bulletMatch[1])}</span>
                          </div>
                        )
                      }
                      
                      // Match numbered lists like 1. , 2. 
                      const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
                      if (numMatch) {
                        return (
                          <div key={idx} className="flex items-start gap-2 my-1 ml-2 font-medium">
                            <span className="text-brand-400 font-mono font-bold select-none">{numMatch[1]}.</span>
                            <span className="text-slate-300">{parseInlineMarkdown(numMatch[2])}</span>
                          </div>
                        )
                      }
                      
                      return <p key={idx} className="mb-1">{parseInlineMarkdown(line)}</p>
                    })}
                  </div>
                )}

                {/* ── INTERACTIVE DIAGNOSTIC CARD (Scan response) ── */}
                {m.diagnostic_card && (
                  <div className="glass border border-surface-border rounded-2xl p-5 w-[600px] max-w-full space-y-4 animate-slide-up shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500"></div>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-surface-border/40 pb-3">
                      <div>
                        <span className="text-[10px] text-brand-400 font-mono font-bold tracking-wider uppercase">
                          🩺 {m.diagnostic_card.troubleshooter_type}
                        </span>
                        <h4 className="text-white font-bold text-xs truncate mt-0.5">{m.diagnostic_card.url}</h4>
                      </div>
                      
                      {/* Badges */}
                      <div className="flex gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                          m.diagnostic_card.status === 'Resolved'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                          {m.diagnostic_card.status}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          m.diagnostic_card.severity === 'Critical'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400 glow-red'
                            : m.diagnostic_card.severity === 'High'
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                          {m.diagnostic_card.severity}
                        </span>
                        <span className="text-[10px] bg-slate-500/10 border border-slate-500/30 text-slate-400 px-2 py-0.5 rounded-md font-semibold">
                          CMPLX: {m.diagnostic_card.complexity}
                        </span>
                      </div>
                    </div>

                    {/* Issues Found */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">⚠️ Identified Failures</span>
                      <div className="space-y-1">
                        {m.diagnostic_card.issues_found.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-surface/50 p-2 rounded-xl border border-surface-border/40">
                            <span className="text-red-400 font-bold">●</span>
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Root Cause Probability Analysis */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📊 Root Cause Probability Analysis</span>
                      <div className="space-y-2 bg-surface/40 p-3 rounded-xl border border-surface-border/30">
                        {m.diagnostic_card.root_cause_analysis.map((cause, idx) => {
                          const pct = Math.round(cause.probability * 100)
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-300">{cause.cause}</span>
                                <span className="font-bold font-mono text-brand-300">{pct}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-brand-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Auto-Diagnostic logs */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🖥️ Auto-Diagnostic Logs</span>
                      <div className="bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-400 space-y-1 border border-slate-900 max-h-40 overflow-y-auto shadow-inner">
                        {m.diagnostic_card.autodiagnostic_log.map((log, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-slate-600">[{log.time}]</span>
                            <span className="text-brand-400 font-bold">{log.step}:</span>
                            <span className={log.result.includes('Failed') ? 'text-red-400' : log.result.includes('Warning') ? 'text-yellow-500' : 'text-slate-300'}>
                              {log.result}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Steps & Quick Fixes */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📋 SRE Troubleshooter Playbook</span>
                      <div className="bg-surface/50 p-3 rounded-xl border border-surface-border/40 space-y-2.5">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Verify Steps</span>
                          {m.diagnostic_card.steps.map((step, idx) => (
                            <label key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                              <input type="checkbox" className="mt-0.5 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500" />
                              <span>{step}</span>
                            </label>
                          ))}
                        </div>
                        <div className="border-t border-surface-border/30 pt-2 space-y-1.5">
                          <span className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Recommended Quick Fixes</span>
                          {m.diagnostic_card.quick_fixes.map((fix, idx) => (
                            <label key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                              <input type="checkbox" className="mt-0.5 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500" />
                              <span>{fix}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Similar Past Incidents Dropdown */}
                    <div className="border-t border-surface-border/40 pt-2">
                      <button 
                        onClick={() => toggleCollapse(index, 'similar')}
                        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1"
                      >
                        <span className="font-semibold">🔍 Reference Similar Past Incidents ({m.diagnostic_card.similar_incidents.length})</span>
                        {collapsedIncidents[`${index}_similar`] ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
                      </button>
                      {!collapsedIncidents[`${index}_similar`] && (
                        <div className="mt-2 space-y-2 bg-surface/30 p-2.5 rounded-xl border border-surface-border/20">
                          {m.diagnostic_card.similar_incidents.map((sim, idx) => (
                            <div key={idx} className="text-xs space-y-0.5 bg-surface/40 p-2 rounded-lg border border-surface-border/40">
                              <div className="flex justify-between font-mono text-[11px]">
                                <span className="text-brand-300 font-bold">{sim.incident_id}</span>
                                <span className="text-slate-500">Fix applied</span>
                              </div>
                              <h5 className="text-white font-bold">{sim.title}</h5>
                              <p className="text-slate-400 text-[10px]">Remediation: {sim.resolution}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interactive Feedback Buttons */}
                    <div className="border-t border-surface-border/40 pt-4 flex flex-col items-center justify-center gap-3">
                      {m.diagnostic_card.feedback_applied ? (
                        <div className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                          m.diagnostic_card.feedback_resolved
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {m.diagnostic_card.feedback_resolved ? (
                            <>
                              <FiCheckCircle size={16} />
                              <span>Marked Resolved! Logged fix telemetry in self-learning index.</span>
                            </>
                          ) : (
                            <>
                              <FiXCircle size={16} />
                              <span>Unresolved. Ticket escalation initiated.</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-300">Did these diagnostics resolve your issue?</span>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleFeedback(index, true, m.diagnostic_card)}
                              className="bg-green-600/15 hover:bg-green-600/25 border border-green-500/40 text-green-400 text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                            >
                              <FiCheck size={14} /> Yes
                            </button>
                            <button
                              onClick={() => handleFeedback(index, false, m.diagnostic_card)}
                              className="bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-400 text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                            >
                              <FiX size={14} /> No
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── INTERACTIVE AUTOFIX LOG CARD ── */}
                {m.autofix_card && (
                  <div className="glass border border-surface-border rounded-2xl p-5 w-[600px] max-w-full space-y-4 animate-slide-up shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-surface-border/40 pb-3">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider uppercase">
                          🔧 Automated Remediation Pipeline
                        </span>
                        <h4 className="text-white font-bold text-xs truncate mt-0.5">{m.autofix_card.url}</h4>
                      </div>

                      <div className="flex gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                          m.autofix_card.status === 'Resolved'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                          {m.autofix_card.status}
                        </span>
                        <span className="text-[10px] bg-slate-500/10 border border-slate-500/30 text-slate-400 px-2 py-0.5 rounded-md font-semibold">
                          CMPLX: {m.autofix_card.complexity}
                        </span>
                      </div>
                    </div>

                    {/* Step-by-Step Simulated Console */}
                    <AutofixTerminal 
                      logs={m.autofix_card.autodiagnostic_log} 
                      onComplete={() => {
                        toast.success("Remediation execution complete!", { duration: 3000 })
                      }}
                    />

                    {/* Remediation Result Description */}
                    <div className="bg-surface/50 p-3.5 rounded-xl border border-surface-border/40 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remediation Resolution</span>
                      <p className="text-slate-200 text-xs leading-relaxed">{m.autofix_card.fixed_issue}</p>
                    </div>

                    {/* Feedback Buttons */}
                    <div className="border-t border-surface-border/40 pt-4 flex flex-col items-center justify-center gap-3">
                      {m.autofix_card.feedback_applied ? (
                        <div className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                          m.autofix_card.feedback_resolved
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {m.autofix_card.feedback_resolved ? (
                            <>
                              <FiCheckCircle size={16} />
                              <span>Marked Resolved! Logged fix telemetry in self-learning index.</span>
                            </>
                          ) : (
                            <>
                              <FiXCircle size={16} />
                              <span>Unresolved. Ticket escalation initiated.</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-300">Did the auto-fix scripts resolve the outage?</span>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleFeedback(index, true, m.autofix_card)}
                              className="bg-green-600/15 hover:bg-green-600/25 border border-green-500/40 text-green-400 text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                            >
                              <FiCheck size={14} /> Yes
                            </button>
                            <button
                              onClick={() => handleFeedback(index, false, m.autofix_card)}
                              className="bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-400 text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                            >
                              <FiX size={14} /> No
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-slate-400">
              <FiMessageSquare size={14} />
            </div>
            <div className="bg-surface border border-surface-border/50 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              SRE copilot is compiling telemetry...
            </div>
          </div>
        )}

        {/* Suggestion incident confirmation draft panel */}
        {suggestedIncident && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 mt-4 animate-slide-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold">
                <FiAlertCircle size={15} />
                Draft Incident Ticket Prepared
              </div>
              <h4 className="text-white font-bold text-xs mt-1">{suggestedIncident.title}</h4>
              <p className="text-[11px] text-slate-400 italic truncate max-w-md">{suggestedIncident.symptoms}</p>
            </div>
            <button 
              onClick={handleCreateIncident}
              disabled={loading}
              className="btn-primary bg-orange-600 border border-orange-500 hover:bg-orange-500 flex items-center gap-2 flex-shrink-0 text-xs px-4 py-2"
            >
              <FiCheck size={14} />
              Open Ticket
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Bottom Message input bar */}
      <form onSubmit={(e) => handleSend(e)} className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask SRE copilot about errors, or describe system crash..."
          className="flex-1 bg-surface border border-surface-border text-white text-xs rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-500/60 transition-colors shadow-inner"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="w-12 h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 rounded-xl flex items-center justify-center text-white transition-all shadow-md"
        >
          <FiSend size={16} />
        </button>
      </form>
    </div>
  )
}

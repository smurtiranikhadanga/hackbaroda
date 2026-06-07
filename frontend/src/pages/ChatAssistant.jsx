import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { FiSend, FiMessageSquare, FiAlertCircle, FiCheck, FiArrowRight, FiActivity } from 'react-icons/fi'
import { sendChatMessage, submitIncident } from '../api'
import { toast } from 'react-hot-toast'

export default function ChatAssistant() {
  const location = useLocation()
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI SRE Support Agent. I can help troubleshoot common issues (like login lockouts or site connectivity problems) or query historical incident solutions. How can I assist you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedIncident, setSuggestedIncident] = useState(null)
  
  const messagesEndRef = useRef(null)

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Handle query parameter passed from global chat input bar
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const initialQuery = params.get('q')
    if (initialQuery) {
      handleSend(null, initialQuery)
    }
  }, [location.search])

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
        content: res.data.reply
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

  const handleCreateIncident = async () => {
    if (!suggestedIncident) return
    
    try {
      setLoading(true)
      const payload = {
        title: suggestedIncident.title,
        symptoms: suggestedIncident.symptoms,
        engineer: suggestedIncident.engineer || 'unassigned@company.com',
        active_users: 5000,
        affected_users: 4200 // Mock values matching sketches/prompt details
      }
      const res = await submitIncident(payload)
      toast.success(`Incident ${res.data.incident_id} created successfully!`)
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Incident ticket **${res.data.incident_id}** ("${res.data.title}") has been created. The AI is now analyzing root causes and telemetry. You can view it in the history list or search for it.`
        }
      ])
      setSuggestedIncident(null)
    } catch (err) {
      toast.error('Failed to automatically open incident ticket')
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 h-[calc(100vh-4rem)] flex flex-col font-sans text-slate-300">
      {/* Tab Header */}
      <div className="mb-4 animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Conversational SRE <span className="gradient-text">Chat Assistant</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Guided SRE diagnostics and incident escalation chatbot</p>
        </div>
      </div>

      {/* Suggested Quick Troubleshooting Controls */}
      <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
        <button 
          onClick={() => quickTroubleshoot('password')}
          className="bg-surface border border-surface-border hover:border-brand-500/40 text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
        >
          🔑 Password Login Issue
        </button>
        <button 
          onClick={() => quickTroubleshoot('website')}
          className="bg-surface border border-surface-border hover:border-brand-500/40 text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
        >
          🌐 Website Not Opening
        </button>
        <button 
          onClick={() => quickTroubleshoot('database')}
          className="bg-surface border border-surface-border hover:border-brand-500/40 text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
        >
          💾 Database Timeout Outage
        </button>
      </div>

      {/* Chat messages viewport */}
      <div className="flex-1 overflow-y-auto bg-surface-elevated/40 border border-surface-border/80 rounded-2xl p-6 space-y-4 mb-4 backdrop-blur-md">
        {messages.map((m, index) => (
          <div 
            key={index} 
            className={`flex gap-3 max-w-[85%] ${
              m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            } animate-fade-in`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
              m.role === 'user' 
                ? 'bg-brand-500/10 border-brand-500/30 text-brand-300' 
                : 'bg-surface border-surface-border text-slate-400'
            }`}>
              {m.role === 'user' ? 'U' : <FiMessageSquare size={14} />}
            </div>

            {/* Bubble */}
            <div className={`rounded-2xl p-4 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-brand-600/15 border border-brand-500/30 text-white rounded-tr-none'
                : 'bg-surface border border-surface-border/50 text-slate-300 rounded-tl-none prose prose-invert max-w-none'
            }`}>
              {m.content.split('\n').map((line, idx) => {
                if (line.startsWith('### ')) {
                  return <h3 key={idx} className="font-bold text-white text-base mt-2 mb-1">{line.slice(4)}</h3>
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={idx} className="font-semibold text-brand-300 mt-1">{line}</p>
                }
                return <p key={idx} className="mb-1">{line}</p>
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-slate-400">
              <FiMessageSquare size={14} />
            </div>
            <div className="bg-surface border border-surface-border/50 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              SRE bot is analyzing parameters...
            </div>
          </div>
        )}

        {/* Suggestion incident confirmation draft panel */}
        {suggestedIncident && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 mt-4 animate-slide-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold">
                <FiAlertCircle size={16} />
                Draft Incident Ticket Prepared
              </div>
              <h4 className="text-white font-bold text-sm mt-1">{suggestedIncident.title}</h4>
              <p className="text-xs text-slate-400 italic truncate max-w-md">{suggestedIncident.symptoms}</p>
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

      {/* Message input bar */}
      <form onSubmit={(e) => handleSend(e)} className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask SRE bot about errors, or describe system crash..."
          className="flex-1 bg-surface border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/60 transition-colors"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="w-12 h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 rounded-xl flex items-center justify-center text-white transition-all"
        >
          <FiSend size={16} />
        </button>
      </form>
    </div>
  )
}

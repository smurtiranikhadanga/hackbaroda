import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { FiSearch, FiLayers, FiShield, FiUser, FiInfo, FiActivity } from 'react-icons/fi'
import { searchIncidents } from '../api'
import { SeverityBadge, StatusBadge } from '../components/ui'
import { toast } from 'react-hot-toast'

export default function SearchIncidents() {
  const location = useLocation()
  
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Toggle between "agent" (vector query) and "user" (self-help diagnostics)
  const [searchMode, setSearchMode] = useState('agent')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const mode = params.get('mode')
    if (mode === 'user') {
      setSearchMode('user')
    } else {
      setSearchMode('agent')
    }
  }, [location.search])

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setResults([])
    try {
      if (searchMode === 'agent') {
        const res = await searchIncidents(query)
        setResults(res.data.results || [])
        if ((res.data.results || []).length === 0) {
          toast.info('No matching past incidents found in memory store.')
        }
      }
    } catch (err) {
      toast.error('Search query failed. Check connection to backend.')
    } finally {
      setLoading(false)
    }
  }

  // Common User Troubleshooting items
  const userGuides = [
    {
      title: "Password correct but login is failing",
      category: "Authentication Sync Lock",
      steps: [
        "Check account lock status: Ask an administrator to check if your account is locked in Active Directory/LDAP due to successive failed attempts.",
        "Check replication sync lag: SSO systems can experience replication delay (5-10 minutes) across domains after a password reset.",
        "Clear browser sessions: Open an incognito browser window, clear local cache and credentials cookies, and attempt logging in again."
      ]
    },
    {
      title: "Website not opening or loading",
      category: "Network Reachability",
      steps: [
        "VPN Connectivity: Confirm that your corporate VPN client is active and logged in if the website is hosted securely on the internal intranet.",
        "Local DNS Flush: Open command prompt/terminal and run 'ipconfig /flushdns' to clear stale DNS lookup tables.",
        "Domain Resolution lookup: Run 'nslookup website-domain.com' to ensure DNS returns the correct SRE gateway IP address.",
        "Server Status: Ping the server and check the '/health' endpoint to see if the host itself is online."
      ]
    },
    {
      title: "Permission denied or 403 Forbidden errors",
      category: "SSO Authorization",
      steps: [
        "Scope check: Verify that your username is part of the required LDAP role groups for accessing this service scope.",
        "Re-authenticate: SSO auth tokens expire periodically. Log out completely and re-login to renew your claims token."
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 font-sans text-slate-300">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🔍 Search <span className="gradient-text">Incidents & Issues</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">Cross-check system memory or run guided self-help troubleshooting</p>
      </div>

      {/* Selector Mode Tabs */}
      <div className="flex border-b border-surface-border/50 mb-6">
        <button
          onClick={() => { setSearchMode('agent'); setResults([]); setQuery('') }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            searchMode === 'agent'
              ? 'border-brand-500 text-brand-300 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FiShield size={16} />
          Agent Search (Vector Memory)
        </button>
        <button
          onClick={() => { setSearchMode('user'); setResults([]); setQuery('') }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            searchMode === 'user'
              ? 'border-brand-500 text-brand-300 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FiUser size={16} />
          User Search (Predefined Diagnostics)
        </button>
      </div>

      {/* MODE: AGENT SEARCH */}
      {searchMode === 'agent' && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2 animate-fade-in">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search semantic memory by title or symptoms (e.g. database timeout)..."
                className="w-full bg-surface border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary py-3 px-6 font-semibold">
              Search Memory
            </button>
          </form>

          {loading && (
            <div className="text-center py-12 animate-pulse text-xs text-slate-400">
              Querying vector embeddings repository...
            </div>
          )}

          {/* Results list */}
          {!loading && results.length > 0 && (
            <div className="space-y-3 animate-slide-up">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Similarity Matching Results:</h3>
              {results.map((item, idx) => (
                <div key={idx} className="glass border border-surface-border rounded-xl p-5 hover:border-brand-500/40 transition-all flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 block">ID: {item.incident_id}</span>
                    <h4 className="text-white font-semibold mt-0.5 text-sm">{item.title}</h4>
                    
                    <div className="mt-2 text-xs space-y-1">
                      {item.cause && (
                        <p className="text-slate-400">
                          <strong className="text-slate-300">Root Cause:</strong> {item.cause}
                        </p>
                      )}
                      {item.actual_fix && (
                        <p className="text-slate-400">
                          <strong className="text-slate-300">Fix Applied:</strong> {item.actual_fix}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded-lg font-mono flex items-center gap-1">
                      <FiActivity size={10} />
                      {Math.round(item.similarity * 100)}% Match
                    </span>
                    <Link to={`/detailed?select=${item.incident_id}`} className="text-xs text-brand-400 hover:text-brand-300 underline font-medium">
                      Get Detailed
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE: USER SEARCH (Predefined Self-Help guides) */}
      {searchMode === 'user' && (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4 mb-4 text-xs text-slate-400 flex items-start gap-2.5">
            <FiInfo size={16} className="text-brand-400 flex-shrink-0 mt-0.5" />
            <span>Select a predefined playbook guide below to resolve common user-facing errors automatically without SRE admin intervention.</span>
          </div>

          <div className="space-y-4">
            {userGuides.map((guide, idx) => (
              <div key={idx} className="glass border border-surface-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-surface-border/50 pb-2">
                  <h3 className="text-white font-bold text-sm">{guide.title}</h3>
                  <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    {guide.category}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {guide.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-brand-400 font-bold font-mono select-none flex-shrink-0 mt-0.5">{stepIdx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

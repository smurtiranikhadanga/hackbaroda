import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FiMenu, FiSearch, FiPlusSquare, FiMessageSquare,
  FiClock, FiBell, FiInfo, FiSettings, FiUser,
  FiChevronDown, FiChevronUp, FiShield, FiGrid
} from 'react-icons/fi'

export default function Sidebar({ notificationsCount = 2 }) {
  const location = useLocation()
  const currentPath = location.pathname

  const [searchOpen, setSearchOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)

  const isActive = (path) => currentPath === path

  return (
    <aside className="w-64 bg-surface-elevated/90 backdrop-blur-lg border-r border-surface-border flex flex-col h-screen sticky top-0 z-50 text-slate-300 font-sans">
      {/* Top Sidebar Header / Logo */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-surface-border">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center border border-brand-400/30">
          <FiShield className="text-white" size={16} />
        </div>
        <div>
          <span className="font-bold text-white tracking-wide block">Incident Mind AI</span>
          <span className="text-xs text-slate-500 font-mono">v1.1.0-MVP</span>
        </div>
      </div>

      {/* Sidebar Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* 0. Dashboard */}
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/')
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
              : 'hover:bg-surface/50 hover:text-white text-slate-400'
          }`}
        >
          <FiGrid size={18} />
          <span>Dashboard</span>
        </Link>

        {/* 1. Search Incident */}
        <div>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface/50 text-slate-400 hover:text-white transition-all text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <FiSearch size={18} />
              <span>Search Incident</span>
            </div>
            {searchOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {searchOpen && (
            <div className="mt-1 ml-6 space-y-1 pl-3 border-l border-surface-border">
              <Link
                to="/search?mode=agent"
                className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive('/search') && location.search.includes('mode=agent')
                    ? 'text-brand-300 font-semibold bg-brand-500/10'
                    : 'hover:text-white text-slate-400'
                }`}
              >
                ➔ Agent Search
              </Link>
              <Link
                to="/search?mode=user"
                className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive('/search') && location.search.includes('mode=user')
                    ? 'text-brand-300 font-semibold bg-brand-500/10'
                    : 'hover:text-white text-slate-400'
                }`}
              >
                ➔ User Search
              </Link>
            </div>
          )}
        </div>

        {/* 2. Add Incident */}
        <Link
          to="/add-incident"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/add-incident')
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
              : 'hover:bg-surface/50 hover:text-white text-slate-400'
          }`}
        >
          <FiPlusSquare size={18} />
          <span>Add Incident</span>
        </Link>

        {/* 3. CHAT [NEW] */}
        <Link
          to="/chat"
          className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/chat')
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
              : 'hover:bg-surface/50 hover:text-white text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <FiMessageSquare size={18} />
            <span>CHAT</span>
          </div>
          <span className="text-[10px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
            New
          </span>
        </Link>

        {/* 4. History */}
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface/50 text-slate-400 hover:text-white transition-all text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <FiClock size={18} />
              <span>History</span>
            </div>
            {historyOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {historyOpen && (
            <div className="mt-1 ml-6 space-y-1 pl-3 border-l border-surface-border">
              <Link
                to="/history?tab=timeline"
                className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive('/history') && location.search.includes('tab=timeline')
                    ? 'text-brand-300 font-semibold bg-brand-500/10'
                    : 'hover:text-white text-slate-400'
                }`}
              >
                ➔ Incident Timeline
              </Link>
              <Link
                to="/history?tab=postmortem"
                className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive('/history') && location.search.includes('tab=postmortem')
                    ? 'text-brand-300 font-semibold bg-brand-500/10'
                    : 'hover:text-white text-slate-400'
                }`}
              >
                ➔ Postmortem Files (PDF)
              </Link>
              <Link
                to="/history?tab=grouped"
                className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive('/history') && location.search.includes('tab=grouped')
                    ? 'text-brand-300 font-semibold bg-brand-500/10'
                    : 'hover:text-white text-slate-400'
                }`}
              >
                ➔ Grouped Problems
              </Link>
            </div>
          )}
        </div>

        {/* 5. Notification */}
        <Link
          to="/notifications"
          className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/notifications')
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
              : 'hover:bg-surface/50 hover:text-white text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <FiBell size={18} />
            <span>Notification</span>
          </div>
          {notificationsCount > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
              {notificationsCount}
            </span>
          )}
        </Link>

        {/* 6. Get Detailed */}
        <Link
          to="/detailed"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/detailed')
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
              : 'hover:bg-surface/50 hover:text-white text-slate-400'
          }`}
          title="Gives detailed info about the problems"
        >
          <FiInfo size={18} />
          <span>Get Detailed</span>
        </Link>
      </nav>

      {/* Sidebar Bottom Footer Profile/Settings */}
      <div className="p-4 border-t border-surface-border space-y-2">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/settings') ? 'text-white bg-surface' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FiSettings size={18} />
          <span>Settings</span>
        </Link>

        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface/30 border border-surface-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
              <FiUser size={16} />
            </div>
            <span className="text-xs text-white font-medium truncate w-24">Guest Engineer</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span>
        </div>
      </div>
    </aside>
  )
}

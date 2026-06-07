import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { FiUser, FiSend } from 'react-icons/fi'

import Dashboard from './pages/Dashboard'
import DetailedIncident from './pages/DetailedIncident'
import AddIncident from './pages/AddIncident'
import SearchIncidents from './pages/SearchIncidents'
import ChatAssistant from './pages/ChatAssistant'
import HistoryList from './pages/HistoryList'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'

import Sidebar from './components/Sidebar'
import LoginModal from './components/LoginModal'

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  
  // Docked global chat input field
  const [chatPrompt, setChatPrompt] = useState('')

  const handleGlobalChatSubmit = (e) => {
    e.preventDefault()
    if (!chatPrompt.trim()) return
    const query = encodeURIComponent(chatPrompt.trim())
    setChatPrompt('')
    // Navigate to Chat tab passing the prompt
    navigate(`/chat?q=${query}`)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  return (
    <div className="min-h-screen bg-surface grid-bg flex text-slate-300 font-sans">
      {/* 1. Left Persistent Sidebar */}
      <Sidebar />

      {/* 2. Main Right Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen relative bg-surface/40 ${location.pathname.startsWith('/chat') ? '' : 'pb-24'}`}>
        
        {/* Main Header (sketched dashboard title & login buttons) */}
        <header className="h-16 border-b border-surface-border flex items-center justify-between px-8 bg-surface/50 backdrop-blur-md sticky top-0 z-40">
          <div className="w-20"></div> {/* spacer */}
          <h2 className="text-lg font-bold text-white tracking-wide uppercase">Dashboard</h2>
          
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-300 border border-brand-500/20 font-mono">
                  {currentUser.role === 'admin' ? 'Admin' : 'User'}: {currentUser.email.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 hover:text-red-300 underline font-semibold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs py-2 px-4 rounded-xl border border-brand-400/20 shadow-md shadow-brand-600/10 transition-all"
              >
                <FiUser size={13} />
                Login
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Route Content tab views */}
        <main className="flex-grow overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchIncidents />} />
            <Route path="/add-incident" element={<AddIncident />} />
            <Route path="/chat" element={<ChatAssistant />} />
            <Route path="/history" element={<HistoryList />} />
            <Route path="/detailed" element={<DetailedIncident />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/incidents/:id" element={<DetailedIncident />} />
          </Routes>
        </main>

        {/* 3. Global Docked Chat Input Bar (from hand-drawn sketch dashboard) */}
        {!location.pathname.startsWith('/chat') && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface/40 backdrop-blur-md border-t border-surface-border/50">
            <form onSubmit={handleGlobalChatSubmit} className="max-w-4xl mx-auto flex gap-2">
              <input
                type="text"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                placeholder="Chat SRE bot directly... (e.g. Website is down, auth errors)"
                className="flex-1 bg-surface-elevated/70 border border-surface-border text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-500/60 transition-colors shadow-inner"
              />
              <button
                type="submit"
                disabled={!chatPrompt.trim()}
                className="w-12 h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 rounded-xl flex items-center justify-center text-white transition-all shadow-md shadow-brand-600/10"
              >
                <FiSend size={16} />
              </button>
            </form>
          </div>
        )}

        {/* Optional Login overlay Modal */}
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={(user) => setCurrentUser(user)}
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#e2e8f0',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1a1a2e' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
        }}
      />
    </BrowserRouter>
  )
}

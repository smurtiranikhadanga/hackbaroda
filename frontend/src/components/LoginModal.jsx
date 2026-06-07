import { useState } from 'react'
import { FiX, FiUser, FiShield, FiLock, FiMail } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [mode, setMode] = useState('user') // user vs admin
  const [view, setView] = useState('login') // login, signup, forgot
  
  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Sign Up fields
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('')

  if (!isOpen) return null

  const handleLogin = (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    
    // Simulate successful login
    toast.success(`Logged in successfully as ${mode === 'admin' ? 'Admin' : 'User'}!`)
    if (onLoginSuccess) {
      onLoginSuccess({ email, name: name || 'Guest User', role: mode })
    }
    onClose()
  }

  const handleSignup = (e) => {
    e.preventDefault()
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    toast.success('Account created successfully! Logging you in...')
    if (onLoginSuccess) {
      onLoginSuccess({ email, name, role: 'user' })
    }
    onClose()
  }

  const handleForgot = (e) => {
    e.preventDefault()
    if (!forgotEmail) {
      toast.error('Please enter your email')
      return
    }
    toast.success(`Reset link sent to ${forgotEmail}!`)
    setView('login')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="glass border border-surface-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-surface-elevated/40 p-2 rounded-xl transition-all"
        >
          <FiX size={18} />
        </button>

        {/* User / Admin Toggle */}
        <div className="flex border-b border-surface-border/50">
          <button
            onClick={() => setMode('user')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              mode === 'user' 
                ? 'border-brand-500 text-brand-300 bg-brand-500/5' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FiUser size={16} />
            User Login
          </button>
          <button
            onClick={() => setMode('admin')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              mode === 'admin' 
                ? 'border-brand-500 text-brand-300 bg-brand-500/5' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FiShield size={16} />
            Admin Login
          </button>
        </div>

        <div className="p-8">
          {/* VIEW: LOG IN */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">Log in</h2>
                <p className="text-xs text-slate-400 mt-1">Enter your email and password to access dashboard</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <FiMail className="absolute left-4 top-3.5 text-slate-500" size={16} />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-3.5 text-slate-500" size={16} />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-surface-border text-brand-600 focus:ring-0 bg-surface-elevated"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-brand-400 hover:text-brand-300 font-semibold"
                >
                  Forget Password?
                </button>
              </div>

              <button type="submit" className="w-full btn-primary py-3 mt-2 font-semibold">
                Log In
              </button>

              <p className="text-center text-xs text-slate-400 mt-6">
                Don't have account?{' '}
                <button
                  type="button"
                  onClick={() => setView('signup')}
                  className="text-brand-400 hover:text-brand-300 font-semibold underline"
                >
                  Sign up here
                </button>
              </p>
            </form>
          )}

          {/* VIEW: SIGN UP */}
          {view === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">Create Account</h2>
                <p className="text-xs text-slate-400 mt-1">Register to start managing alerts and services</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <FiUser className="absolute left-4 top-3.5 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <FiMail className="absolute left-4 top-3.5 text-slate-500" size={16} />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-3.5 text-slate-500" size={16} />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-3.5 text-slate-500" size={16} />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-3 mt-2 font-semibold">
                Create Account
              </button>

              <p className="text-center text-xs text-slate-400 mt-6">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-brand-400 hover:text-brand-300 font-semibold underline"
                >
                  Log in here
                </button>
              </p>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">Forget Password</h2>
                <p className="text-xs text-slate-400 mt-1">We will send you instructions to reset your password</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <FiMail className="absolute left-4 top-3.5 text-slate-500" size={16} />
                  <input
                    type="email"
                    placeholder="Email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-surface-elevated/40 border border-surface-border text-white text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-3 mt-2 font-semibold">
                Continue
              </button>

              <p className="text-center text-xs text-slate-400 mt-6">
                Back to{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-brand-400 hover:text-brand-300 font-semibold underline"
                >
                  login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

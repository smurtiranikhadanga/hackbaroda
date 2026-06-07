import { Link, useLocation } from 'react-router-dom'
import { FiShield, FiGrid, FiSearch, FiActivity } from 'react-icons/fi'

export default function Navbar() {
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-lg group-hover:shadow-brand-500/30 transition-shadow">
            <FiShield className="text-white" size={18} />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">AI Incident</div>
            <div className="text-brand-400 text-xs font-medium leading-tight">Management System</div>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink to="/" icon={<FiGrid size={15} />} label="Dashboard" active={location.pathname === '/'} />
          <NavLink to="/search" icon={<FiSearch size={15} />} label="Search" active={location.pathname === '/search'} />
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            System Online
          </span>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
          : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

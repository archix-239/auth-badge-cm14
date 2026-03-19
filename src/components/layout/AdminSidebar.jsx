import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const navItems = [
  { to: '/admin/dashboard',    icon: 'dashboard',     label: 'Tableau de bord' },
  { to: '/admin/inscription',  icon: 'how_to_reg',    label: 'Inscription & Badge' },
  { to: '/admin/passages',     icon: 'history',       label: 'Historique' },
  { to: '/admin/utilisateurs', icon: 'manage_accounts', label: 'Utilisateurs' },
  { to: '/admin/supervision',  icon: 'monitor_heart', label: 'Console Supervision' },
]

export default function AdminSidebar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
          <span className="material-symbols-outlined text-xl filled">shield_person</span>
        </div>
        <div>
          <h1 className="text-slate-900 dark:text-white text-sm font-bold leading-none">AUTH-BADGE CM14</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Administration OMC</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/10 dark:border-primary/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-xl ${isActive ? 'filled' : ''}`}>{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {/* Danger zone */}
        <div className="pt-4 pb-1 px-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Zone critique</p>
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-200 dark:border-red-900/50 group">
          <span className="material-symbols-outlined text-xl animate-pulse group-hover:animate-none">cancel</span>
          <span className="font-bold text-[11px] uppercase tracking-tight">Révocation d'urgence</span>
        </button>
      </nav>

      {/* Theme toggle */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <button onClick={toggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-lg">{dark ? 'light_mode' : 'dark_mode'}</span>
            {dark ? 'Mode clair' : 'Mode sombre'}
          </div>
          <div className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-slate-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-1'}`}/>
          </div>
        </button>
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="size-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
            {user?.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.title || user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Déconnexion">
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

export default function AgentLayout() {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-slate-100 dark:bg-bg-dark pb-24">
      {/* Top header */}
      <header className="sticky top-0 z-20 bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-xl filled">shield_person</span>
          <div>
            <p className="text-sm font-bold leading-none">{t('agent_layout.header_title')}</p>
            <p className="text-xs text-blue-200 mt-0.5">{user?.zone || t('agent_layout.header_sub')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs text-blue-100">{t('common.status.online')}</span>
          </div>
          <div className="w-8 h-8 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-blue-200">wifi_lock</span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20 shadow-lg">
        <div className="flex items-center justify-around px-1 py-2">
          {[
            { to: '/agent/dashboard', icon: 'dashboard',       label: t('admin_sidebar.nav.dashboard') },
            { to: '/agent/scanner',   icon: 'qr_code_scanner', label: 'Scanner', fab: true },
            { to: '/agent/history',   icon: 'history',         label: t('admin_sidebar.nav.history') },
            { to: '/agent/profile',   icon: 'person',          label: t('agent_profile.role.agent').split(' ')[0] },
          ].map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                item.fab
                  ? `flex flex-col items-center gap-1 px-2 py-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`
                  : `flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors min-w-0 ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`
              }
            >
              {({ isActive }) => item.fab ? (
                <>
                  <div className={`rounded-2xl p-3 -mt-5 shadow-lg border-4 border-white dark:border-slate-900 transition-colors ${isActive ? 'bg-primary' : 'bg-slate-700'}`}>
                    <span className="material-symbols-outlined text-xl text-white">{item.icon}</span>
                  </div>
                  <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-primary' : 'text-slate-400'}`}>{item.label}</span>
                </>
              ) : (
                <>
                  <div className={`rounded-xl p-1.5 transition-colors ${isActive ? 'bg-primary' : 'transparent'}`}>
                    <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white filled' : ''}`}>{item.icon}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-normal truncate max-w-[4rem]">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

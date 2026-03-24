import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../hooks/useSocket'

export default function AgentLayout() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [broadcastAlert, setBroadcastAlert] = useState(null) // { message, timestamp }
  const [isDecommissioned, setIsDecommissioned] = useState(false)

  useSocket({
    'alert:broadcast': (data) => {
      setBroadcastAlert({ message: data.message, timestamp: new Date() })
    },
    'terminal:decommissioned': ({ agentId } = {}) => {
      if (!agentId || agentId === user?.id) setIsDecommissioned(true)
    },
  })

  const locale = i18n.language === 'en' ? 'en-GB' : i18n.language === 'es' ? 'es-ES' : 'fr-FR'

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

      {/* ── Overlay alerte broadcast ── */}
      {broadcastAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-white text-2xl animate-pulse">warning</span>
              <p className="text-white font-bold text-base">{t('agent_layout.alert.title')}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-slate-800 dark:text-white font-semibold">{broadcastAlert.message}</p>
              <p className="text-xs text-slate-400">
                {t('agent_layout.alert.sent_by')} · {broadcastAlert.timestamp.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setBroadcastAlert(null)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
                {t('agent_layout.alert.confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Écran verrouillage terminal décommissionné ── */}
      {isDecommissioned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900">
          <div className="text-center space-y-6 max-w-sm">
            <div className="flex justify-center">
              <div className="bg-red-600/20 p-5 rounded-full">
                <span className="material-symbols-outlined text-red-500 text-5xl">lock</span>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">{t('agent_layout.decommission.title')}</h2>
              <p className="text-slate-400 text-sm">{t('agent_layout.decommission.desc')}</p>
            </div>
            <div className="bg-slate-800 rounded-xl px-4 py-3">
              <p className="text-slate-300 text-sm">{t('agent_layout.decommission.contact')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20 shadow-lg">
        <div className="flex items-center justify-around px-1 py-2">
          {[
            { to: '/agent/dashboard', icon: 'dashboard',       label: t('admin_sidebar.nav.dashboard') },
            { to: '/agent/scanner',   icon: 'qr_code_scanner', label: 'Scanner', fab: true },
            { to: '/agent/history',   icon: 'history',         label: t('admin_sidebar.nav.history') },
            { to: '/agent/stats',     icon: 'bar_chart',       label: t('agent_stats.nav') },
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

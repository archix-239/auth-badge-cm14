import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const LANGUAGES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
]

export default function AdminSidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('cm14_lang', code)
  }

  const navItems = [
    { to: '/admin/dashboard',    icon: 'dashboard',       label: t('admin_sidebar.nav.dashboard') },
    { to: '/admin/inscription',  icon: 'how_to_reg',      label: t('admin_sidebar.nav.inscription') },
    { to: '/admin/passages',     icon: 'history',         label: t('admin_sidebar.nav.history') },
    { to: '/admin/utilisateurs', icon: 'manage_accounts', label: t('admin_sidebar.nav.users') },
    { to: '/admin/supervision',  icon: 'monitor_heart',   label: t('admin_sidebar.nav.supervision') },
  ]

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-64
      transform transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full'}
      lg:static lg:translate-x-0 lg:z-auto
      bg-white dark:bg-slate-900
      border-r border-slate-200 dark:border-slate-800
      flex flex-col h-screen shrink-0
    `}>

      {/* Brand + bouton fermeture mobile */}
      <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
            <span className="material-symbols-outlined text-xl filled">shield_person</span>
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white text-sm font-bold leading-none">{t('app.name')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('app.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={t('admin_sidebar.btn_close')}
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            onClick={onClose}
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

        {/* Zone critique */}
        <div className="pt-4 pb-1 px-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{t('admin_sidebar.critical_zone')}</p>
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-200 dark:border-red-900/50 group">
          <span className="material-symbols-outlined text-xl animate-pulse group-hover:animate-none">cancel</span>
          <span className="font-bold text-[11px] uppercase tracking-tight">{t('admin_sidebar.btn_emergency')}</span>
        </button>
      </nav>

      {/* Sélecteur de langue */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-lg">translate</span>
            <span>{t('agent_profile.settings.language')}</span>
          </div>
          <div className="flex gap-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle dark mode */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <button onClick={toggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-lg">{dark ? 'light_mode' : 'dark_mode'}</span>
            {dark ? t('admin_sidebar.theme.light') : t('admin_sidebar.theme.dark')}
          </div>
          <div className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-slate-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      {/* Utilisateur connecté */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="size-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.title || user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title={t('common.btn.logout')}>
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

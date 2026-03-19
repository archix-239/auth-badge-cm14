import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { POINTS_CONTROLE } from '../../data/mockData'

export default function AgentProfile() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const myPC = POINTS_CONTROLE.find(pc => pc.agentId === user?.id)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AG'

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-bg-dark">

      {/* Avatar + Identity hero */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        {/* Avatar */}
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-4xl font-bold text-primary border-4 border-white dark:border-slate-700 shadow-lg">
            {initials}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-1.5 border-2 border-white dark:border-slate-900 shadow">
            <span className="material-symbols-outlined text-white text-sm filled">verified_user</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
        <span className="mt-2 px-4 py-1 bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest rounded-full">
          {user?.role === 'agent' ? 'Agent Niveau 4' : user?.role === 'admin' ? 'Administrateur' : 'Superviseur'}
        </span>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4">

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Matricule</p>
            <p className="text-base font-bold text-primary leading-tight">#{user?.id}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Poste assigné</p>
            <p className="text-base font-bold text-primary leading-tight">{myPC?.nom || user?.zone || 'Non assigné'}</p>
          </div>
        </div>

        {/* App settings */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-5 pt-4 pb-2">Paramètres Application</p>

          {/* Language */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">translate</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Langue</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span className="text-sm font-semibold">FR</span>
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </div>
          </div>

          {/* Dark mode */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">dark_mode</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Mode Sombre</span>
            </div>
            <button
              onClick={toggle}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${dark ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`}/>
            </button>
          </div>

          {/* Biometrics */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">fingerprint</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Biométrie</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-base">chevron_right</span>
          </div>
        </div>

        {/* System info */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Informations Système</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Intégrité de la session sécurisée</p>
            </div>
            <span className="bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold px-2.5 py-1 rounded-full">V 2.4.12</span>
          </div>

          <div className="mx-4 mb-4 mt-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cache Synchronisé</span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">il y a 2min</span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
            {[
              { label: 'Protocole', value: 'TLS 1.3' },
              { label: 'Chiffrement', value: 'AES-256' },
              { label: 'Session', value: '15 min' },
            ].map(item => (
              <div key={item.label} className="px-3 py-3 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">{item.label}</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* OTP recovery */}
        <button
          onClick={() => navigate('/otp-recovery')}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl">lock_reset</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Récupérer mon OTP</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Réinitialiser l'accès 2FA</p>
          </div>
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base">chevron_right</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl px-5 py-4 flex items-center justify-center gap-3 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          DÉCONNEXION
        </button>

        {/* Version footer */}
        <p className="text-center text-xs text-slate-300 dark:text-slate-600 pb-2">
          AUTH-BADGE CM14 · OMC Yaoundé 2025 · v2.4.12
        </p>
      </div>
    </div>
  )
}

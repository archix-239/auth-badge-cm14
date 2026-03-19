import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { LOGS, POINTS_CONTROLE, getResultConfig, timeAgo } from '../../data/mockData'

export default function AgentDashboard() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const myLogs     = LOGS.filter(l => l.agentId === user?.id).slice(0, 5)
  const myPC       = POINTS_CONTROLE.find(pc => pc.agentId === user?.id)
  const locale     = i18n.language === 'en' ? 'en-GB' : i18n.language === 'es' ? 'es-ES' : 'fr-FR'
  const today      = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const autorises  = myLogs.filter(l => l.resultat === 'autorisé').length
  const alertes    = myLogs.filter(l => ['révoqué','inconnu'].includes(l.resultat)).length

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-bg-dark p-4 space-y-4">

      {/* Greeting hero */}
      <div className="bg-primary rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">{today}</p>
        <h2 className="text-xl font-bold">{t('agent_dashboard.greeting', { name: user?.name?.split(' ')[0] })}</h2>
        <p className="text-blue-200 text-sm mt-0.5">{myPC?.nom || t('agent_dashboard.unassigned')}</p>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs text-emerald-300 font-medium">{t('agent_dashboard.terminal_status')}</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('agent_dashboard.stats.scans'),      value: myPC?.scans ?? myLogs.length, color: "text-slate-900 dark:text-white" },
          { label: t('agent_dashboard.stats.authorized'), value: autorises, color: "text-emerald-600 dark:text-emerald-400" },
          { label: t('agent_dashboard.stats.alerts'),     value: alertes,   color: alertes > 0 ? "text-red-500" : "text-slate-400 dark:text-slate-500" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center shadow-sm border border-slate-100 dark:border-slate-800">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main scan CTA */}
      <button onClick={() => navigate('/agent/scanner')}
        className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] text-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl shadow-primary/25 transition-all">
        <div className="bg-white/20 rounded-full p-4">
          <span className="material-symbols-outlined text-5xl">qr_code_scanner</span>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{t('agent_dashboard.btn_scan')}</p>
          <p className="text-blue-200 text-sm">{t('agent_dashboard.btn_scan_sub')}</p>
        </div>
      </button>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: 'wifi',         bg: 'bg-emerald-100 dark:bg-emerald-900/30', ic: 'text-emerald-600 dark:text-emerald-400', title: t('agent_dashboard.status.network_title'), val: t('agent_dashboard.status.network_val'), valc: 'text-emerald-600 dark:text-emerald-400' },
          { icon: 'sync',         bg: 'bg-blue-100 dark:bg-blue-900/30',      ic: 'text-blue-600 dark:text-blue-400',      title: t('agent_dashboard.status.cache_title'),   val: t('agent_dashboard.status.cache_val'),    valc: 'text-blue-600 dark:text-blue-400' },
          { icon: 'map',          bg: 'bg-purple-100 dark:bg-purple-900/30',  ic: 'text-purple-600 dark:text-purple-400',  title: t('agent_dashboard.status.zones_title'),  val: 'Z1 · Z2 · Z3',                           valc: 'text-purple-600 dark:text-purple-400' },
          { icon: 'offline_bolt', bg: 'bg-amber-100 dark:bg-amber-900/30',    ic: 'text-amber-600 dark:text-amber-400',    title: t('agent_dashboard.status.offline_title'), val: t('agent_dashboard.status.offline_val'),  valc: 'text-amber-600 dark:text-amber-400' },
        ].map(s => (
          <div key={s.title} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className={`${s.bg} p-2.5 rounded-xl`}>
              <span className={`material-symbols-outlined ${s.ic} text-xl`}>{s.icon}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.title}</p>
              <p className={`text-xs font-medium ${s.valc}`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent scans */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('agent_dashboard.recent_title')}</h3>
          <button onClick={() => navigate('/agent/history')} className="text-xs text-primary font-semibold hover:underline">{t('common.btn.view_all')}</button>
        </div>
        <ul className="divide-y divide-slate-50 dark:divide-slate-800">
          {myLogs.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">{t('agent_dashboard.recent_empty')}</li>
          )}
          {myLogs.map(log => {
            const cfg = getResultConfig(log.resultat)
            return (
              <li key={log.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <span className="material-symbols-outlined text-white text-sm">{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{log.nom}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{log.delegation} · {log.zone}</p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{timeAgo(log.timestamp)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

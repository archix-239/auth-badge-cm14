import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getResultConfig, timeAgo, getCategoryColor } from '../../data/mockData'
import { api } from '../../utils/api'
import { mapParticipant, mapScanLog } from '../../utils/dataMappers'
import { useSocket } from '../../hooks/useSocket'

const KPI = ({ label, value, sub, color, icon }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <span className="material-symbols-outlined text-xl text-white">{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [logs,         setLogs]         = useState([])
  const [participants, setParticipants] = useState([])
  const [terminals,    setTerminals]    = useState([])

  useEffect(() => {
    api.get('/api/scans?limit=100')
      .then(rows => setLogs(rows.map(mapScanLog)))
      .catch(() => {})

    api.get('/api/participants')
      .then(rows => setParticipants(rows.map(mapParticipant)))
      .catch(() => {})

    api.get('/api/terminals')
      .then(rows => setTerminals(rows))
      .catch(() => {})
  }, [])

  // Nouveaux scans en temps réel
  useSocket({
    'scan:new': (data) => {
      setLogs(prev => [mapScanLog(data), ...prev].slice(0, 100))
    },
    'badge:revoked': (data) => {
      setParticipants(prev => prev.map(p => p.id === data.id ? { ...p, statut: 'révoqué' } : p))
    },
  })

  const total      = logs.length
  const autorises  = logs.filter(l => l.resultat === 'autorisé').length
  const alertes    = logs.filter(l => ['révoqué','inconnu'].includes(l.resultat)).length
  const actifs     = participants.filter(p => p.statut === 'actif').length
  const recentLogs = logs.slice(0, 8)

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-bg-dark min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('admin_dashboard.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('admin_dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-medium text-emerald-700">{t('admin_dashboard.system_ok')}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI label={t('admin_dashboard.kpi.scans')}      value={total}     icon="qr_code_scanner" color="bg-primary"      sub={t('admin_dashboard.kpi.scans_sub')} />
        <KPI label={t('admin_dashboard.kpi.authorized')} value={autorises} icon="check_circle"    color="bg-emerald-500"  sub={t('admin_dashboard.kpi.authorized_sub', { value: Math.round(autorises/total*100) })} />
        <KPI label={t('admin_dashboard.kpi.alerts')}     value={alertes}   icon="warning"         color="bg-red-500"      sub={t('admin_dashboard.kpi.alerts_sub')} />
        <KPI label={t('admin_dashboard.kpi.badges')}     value={actifs}    icon="badge"           color="bg-blue-500"     sub={t('admin_dashboard.kpi.badges_sub', { total: participants.length })} />
      </div>

      {/* Points de contrôle */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 dark:text-white">{t('admin_dashboard.checkpoints.title')}</h3>
          <button onClick={() => navigate('/admin/supervision')} className="text-sm text-primary font-medium hover:underline">
            {t('admin_dashboard.checkpoints.link')}
          </button>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {terminals.map(pc => (
            <div key={pc.id} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  pc.statut === 'actif'  ? 'bg-emerald-500' :
                  pc.statut === 'alerte' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'
                }`}></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{pc.nom}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{pc.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-bold text-slate-800 dark:text-white">{pc.scans}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{t('admin_dashboard.checkpoints.scans')}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  pc.statut === 'actif'  ? 'bg-emerald-100 text-emerald-700' :
                  pc.statut === 'alerte' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {t(`common.status.${pc.statut}`, { defaultValue: pc.statut })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live feed + participants */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent events */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h3 className="font-bold text-slate-800 dark:text-white">{t('admin_dashboard.feed.title')}</h3>
            </div>
            <button onClick={() => navigate('/admin/passages')} className="text-sm text-primary font-medium hover:underline">
              {t('admin_dashboard.feed.link')}
            </button>
          </div>
          <ul className="divide-y divide-slate-50 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {recentLogs.map(log => {
              const cfg = getResultConfig(log.resultat)
              return (
                <li key={log.id} className="flex items-center gap-3 px-6 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <span className="material-symbols-outlined text-white text-sm">{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{log.nom}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{log.zone} · {log.pointControle}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(log.timestamp)}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Badge status breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 dark:text-white">{t('admin_dashboard.accreditations.title')}</h3>
            <button onClick={() => navigate('/admin/inscription')} className="text-sm text-primary font-medium hover:underline">
              {t('admin_dashboard.accreditations.link')}
            </button>
          </div>
          <ul className="divide-y divide-slate-50 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {participants.slice(0, 15).map(p => (
              <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                  {p.prenom.charAt(0)}{p.nom.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{p.prenom} {p.nom}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{p.delegation}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getCategoryColor(p.categorie)}`}>{p.categorie}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.statut === 'actif'   ? 'bg-emerald-100 text-emerald-700' :
                    p.statut === 'révoqué' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{p.statut}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

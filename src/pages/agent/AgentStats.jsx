import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getResultConfig } from '../../data/mockData'
import { api } from '../../utils/api'
import { mapScanLog } from '../../utils/dataMappers'
import { getPendingScans } from '../../utils/scanQueue'

export default function AgentStats() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pending = getPendingScans().map(s => ({ ...mapScanLog(s), _queued: true }))
    api.get('/api/scans?limit=1000')
      .then(rows => {
        const server = rows.map(mapScanLog)
        const serverIds = new Set(server.map(l => l.id))
        setLogs([...pending.filter(l => !serverIds.has(l.id)), ...server])
      })
      .catch(() => setLogs(pending))
      .finally(() => setLoading(false))
  }, [user?.id])

  // ── Agrégations ───────────────────────────────────────────────────────────
  const total      = logs.length
  const authorized = logs.filter(l => l.resultat === 'autorisé').length
  const zoneDenied = logs.filter(l => l.resultat === 'zone-refusée').length
  const revoked    = logs.filter(l => l.resultat === 'révoqué').length
  const unknown    = logs.filter(l => l.resultat === 'inconnu').length
  const authRate   = total === 0 ? 0 : Math.round(authorized / total * 100)

  // Répartition par résultat
  const RESULTS = [
    { key: 'autorisé',     count: authorized, ...getResultConfig('autorisé'),    colorBar: 'bg-emerald-500' },
    { key: 'zone-refusée', count: zoneDenied, ...getResultConfig('zone-refusée'), colorBar: 'bg-orange-500' },
    { key: 'révoqué',      count: revoked,    ...getResultConfig('révoqué'),      colorBar: 'bg-red-500' },
    { key: 'inconnu',      count: unknown,    ...getResultConfig('inconnu'),      colorBar: 'bg-violet-600' },
  ]

  // Volume horaire (aujourd'hui)
  const today = new Date().toDateString()
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: logs.filter(l => {
      const d = new Date(l.timestamp)
      return d.toDateString() === today && d.getHours() === h
    }).length,
  }))
  const maxHourly = Math.max(1, ...hourly.map(h => h.count))

  // Top zones
  const zoneMap = {}
  logs.forEach(l => { zoneMap[l.zone] = (zoneMap[l.zone] ?? 0) + 1 })
  const topZones = Object.entries(zoneMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-bg-dark p-4 space-y-4">

      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">{t('agent_stats.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('agent_stats.subtitle')}</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
        </div>
      )}

      {!loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('agent_stats.kpi.total'),    value: total,      color: 'text-slate-900 dark:text-white',          bg: 'bg-white dark:bg-slate-900',        icon: 'qr_code_scanner' },
              { label: t('agent_stats.kpi.auth_rate'), value: `${authRate}%`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'verified' },
              { label: t('agent_stats.kpi.alerts'),   value: revoked + unknown, color: revoked + unknown > 0 ? 'text-red-500' : 'text-slate-400', bg: 'bg-white dark:bg-slate-900', icon: 'warning' },
              { label: t('agent_stats.kpi.zone_denied'), value: zoneDenied, color: 'text-orange-500', bg: 'bg-white dark:bg-slate-900', icon: 'block' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3`}>
                <span className={`material-symbols-outlined text-2xl ${k.color}`}>{k.icon}</span>
                <div>
                  <p className={`text-2xl font-black leading-none ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Répartition par résultat */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">{t('agent_stats.breakdown_title')}</h3>
            <div className="space-y-3">
              {RESULTS.map(r => (
                <div key={r.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${r.bg}`}>
                        <span className="material-symbols-outlined text-white text-sm">{r.icon}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.key}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {r.count} ({total === 0 ? 0 : Math.round(r.count / total * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${r.colorBar}`}
                      style={{ width: total === 0 ? '0%' : `${r.count / total * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volume horaire */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">{t('agent_stats.hourly_title')}</h3>
            <div className="flex items-end gap-0.5 h-16">
              {hourly.map(h => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-primary/80 rounded-sm transition-all duration-300"
                    style={{ height: h.count === 0 ? 2 : `${Math.max(4, h.count / maxHourly * 60)}px` }}
                    title={`${h.hour}h : ${h.count}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-400">0h</span>
              <span className="text-[10px] text-slate-400">12h</span>
              <span className="text-[10px] text-slate-400">23h</span>
            </div>
          </div>

          {/* Top zones */}
          {topZones.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">{t('agent_stats.top_zones_title')}</h3>
              <div className="space-y-2">
                {topZones.map(([zone, count], idx) => (
                  <div key={zone} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{zone}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${count / (topZones[0][1] || 1) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-3">bar_chart</span>
              <p className="text-sm font-medium">{t('agent_stats.empty')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

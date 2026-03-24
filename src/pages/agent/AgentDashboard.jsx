import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getResultConfig, timeAgo } from '../../data/mockData'
import { getBadgeStoreSize, syncBadgeStore } from '../../utils/badgeStore'
import { getPendingScans, removeSyncedScans } from '../../utils/scanQueue'
import { api } from '../../utils/api'
import { mapScanLog, mapParticipant } from '../../utils/dataMappers'

const MAX_OFFLINE_MS = 4 * 60 * 60 * 1000 // 4h autonomie

export default function AgentDashboard() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [isOnline,   setIsOnline]   = useState(navigator.onLine)
  const [syncing,    setSyncing]    = useState(false)
  const [lastSync, setLastSync] = useState(() => {
    const stored = localStorage.getItem('cm14_last_sync')
    if (stored) return new Date(stored)
    const now = new Date()
    localStorage.setItem('cm14_last_sync', now.toISOString())
    return now
  })
  const [now,        setNow]        = useState(new Date())
  const [storeSize,    setStoreSize]    = useState(0)
  const [recentLogs,   setRecentLogs]   = useState([])
  const [sessionCount, setSessionCount] = useState(null) // null = non chargé
  const [todayScans,   setTodayScans]   = useState([])   // tous les scans du jour pour les stats

  useEffect(() => {
    getBadgeStoreSize().then(setStoreSize)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    Promise.all([
      api.get('/api/scans?limit=5'),
      api.get(`/api/scans?limit=500&from=${todayStart.toISOString()}`),
    ])
      .then(([recent, todayLogs]) => {
        setRecentLogs(recent.map(mapScanLog))
        const mapped = todayLogs.map(mapScanLog)
        setSessionCount(mapped.length)
        setTodayScans(mapped)
      })
      .catch(() => { setRecentLogs([]); setSessionCount(0) })

    const reloadHistory = () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      Promise.all([
        api.get('/api/scans?limit=5'),
        api.get(`/api/scans?limit=500&from=${todayStart.toISOString()}`),
      ]).then(([recent, todayLogs]) => {
        setRecentLogs(recent.map(mapScanLog))
        const mapped = todayLogs.map(mapScanLog)
        setSessionCount(mapped.length)
        setTodayScans(mapped)
      }).catch(() => {})
    }

    const syncPendingAndReload = () => {
      const now = new Date()
      setLastSync(now)
      localStorage.setItem('cm14_last_sync', now.toISOString())

      const pending = getPendingScans()
      const syncPromise = pending.length > 0
        ? Promise.allSettled(
            pending.map(scan =>
              api.post('/api/scans', {
                participant_id:    scan.participant_id    ?? null,
                nom:               scan.nom,
                delegation:        scan.delegation        ?? null,
                categorie:         scan.categorie         ?? null,
                zone:              scan.zone,
                point_controle_id: scan.point_controle_id ?? null,
                resultat:          scan.resultat,
                timestamp:         scan.timestamp         ?? null,
              }).then(() => scan.id)
            )
          ).then(results => {
            const synced = results.filter(r => r.status === 'fulfilled').map(r => r.value)
            if (synced.length > 0) removeSyncedScans(synced)
          })
        : Promise.resolve()

      syncPromise.then(() => {
        reloadHistory()
        api.get('/api/participants')
          .then(rows => syncBadgeStore(rows.map(mapParticipant)))
          .catch(() => {})
      })
    }

    const handleOnline  = () => { setIsOnline(true);  syncPendingAndReload() }
    const handleOffline = () =>   setIsOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Mise à jour de l'horloge toutes les 30 secondes
    const tick = setInterval(() => setNow(new Date()), 30_000)

    // Sync au montage si des scans sont en attente et qu'on est déjà en ligne
    if (navigator.onLine && getPendingScans().length > 0) {
      syncPendingAndReload()
    }

    // Heartbeat toutes les 60s — détecte aussi la perte réseau
    // Note : pas de référence à `isOnline` (state React) pour éviter le bug de closure.
    // On appelle toujours syncPendingAndReload() : gratuit si la file est vide.
    const cpId = user?.checkpoint?.id
    const sendHeartbeat = () => {
      api.post(`/api/terminals/${cpId}/heartbeat`)
        .then(() => { setIsOnline(true); syncPendingAndReload() })
        .catch(() => setIsOnline(false))
    }
    if (cpId) { sendHeartbeat(); }
    const heartbeat = cpId ? setInterval(sendHeartbeat, 60_000) : null

    // Ping léger toutes les 10s pour détecter coupure/retour réseau sans attendre le heartbeat
    let wasOnline = navigator.onLine
    const ping = setInterval(() => {
      api.get('/api/health').then(() => {
        if (!wasOnline) { wasOnline = true; setIsOnline(true); syncPendingAndReload() }
      }).catch(() => {
        if (wasOnline) { wasOnline = false; setIsOnline(false) }
      })
    }, 10_000)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(tick)
      clearInterval(ping)
      if (heartbeat) clearInterval(heartbeat)
    }
  }, [])

  const handleManualSync = async () => {
    if (syncing || !isOnline) return
    setSyncing(true)
    try {
      const [rows] = await Promise.all([
        api.get('/api/participants'),
        api.get('/api/scans?limit=5').then(r => setRecentLogs(r.map(mapScanLog))).catch(() => {}),
      ])
      syncBadgeStore(rows.map(mapParticipant))
      const now = new Date()
      setLastSync(now)
      localStorage.setItem('cm14_last_sync', now.toISOString())
      getBadgeStoreSize().then(setStoreSize)
    } catch {
      // Silencieux
    } finally {
      setSyncing(false)
    }
  }

  // Labels dynamiques cache + offline
  const syncDiffMin = Math.floor((now - lastSync) / 60_000)
  const cacheLabel  = syncDiffMin < 1
    ? t('agent_dashboard.status.cache_just_synced')
    : t('agent_dashboard.status.cache_ago', { count: syncDiffMin })

  const remainingMs = Math.max(0, MAX_OFFLINE_MS - (now - lastSync))
  const offH = Math.floor(remainingMs / 3_600_000)
  const offM = Math.floor((remainingMs % 3_600_000) / 60_000)
  const offlineLabel = t('agent_dashboard.status.offline_remaining', { h: offH, m: String(offM).padStart(2, '0') })

  const myLogs     = recentLogs
  const myPC       = user?.checkpoint ?? null
  const locale     = i18n.language === 'en' ? 'en-GB' : i18n.language === 'es' ? 'es-ES' : 'fr-FR'
  const today      = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  // Statistiques calculées sur tous les scans du jour (pas seulement les 5 derniers)
  const autorises  = todayScans.filter(l => l.resultat === 'autorisé').length
  const alertes    = todayScans.filter(l => ['révoqué','inconnu'].includes(l.resultat)).length
  const pendingCount = getPendingScans().length
  const totalScans = (sessionCount ?? (myPC?.scans ?? myLogs.length)) + pendingCount

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
          { label: t('agent_dashboard.stats.scans'),      value: totalScans, color: "text-slate-900 dark:text-white" },
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
        className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] text-white rounded-2xl p-4 sm:p-6 flex flex-col items-center gap-3 shadow-xl shadow-primary/25 transition-all">
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
          {
            icon: isOnline ? 'wifi' : 'wifi_off',
            bg:   isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30',
            ic:   isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
            title: t('agent_dashboard.status.network_title'),
            val:  isOnline ? t('agent_dashboard.status.network_val') : t('agent_dashboard.status.network_offline'),
            valc: isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
          },
          {
            icon: 'sync', bg: 'bg-blue-100 dark:bg-blue-900/30', ic: 'text-blue-600 dark:text-blue-400',
            title: t('agent_dashboard.status.cache_title'),
            val:  storeSize > 0 ? `${cacheLabel} · ${storeSize} badges` : cacheLabel,
            valc: 'text-blue-600 dark:text-blue-400',
          },
          {
            icon: 'map', bg: 'bg-purple-100 dark:bg-purple-900/30', ic: 'text-purple-600 dark:text-purple-400',
            title: t('agent_dashboard.status.zones_title'),
            val:  myPC?.zone_id ? `${myPC.zone_id}${myPC.zone_nom ? ` — ${myPC.zone_nom}` : ''}` : '—',
            valc: 'text-purple-600 dark:text-purple-400',
          },
          ...(!isOnline ? [{
            icon: 'offline_bolt', bg: 'bg-amber-100 dark:bg-amber-900/30', ic: 'text-amber-600 dark:text-amber-400',
            title: t('agent_dashboard.status.offline_title'),
            val:  offlineLabel,
            valc: remainingMs < 3_600_000 ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
          }] : []),
        ].map(s => (
          <div key={s.title} className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2.5 min-w-0">
            <div className={`${s.bg} p-2 rounded-xl shrink-0`}>
              <span className={`material-symbols-outlined ${s.ic} text-lg`}>{s.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{s.title}</p>
              <p className={`text-xs font-medium truncate ${s.valc}`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent scans */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('agent_dashboard.recent_title')}</h3>
          <div className="flex items-center gap-3">
            {isOnline && (
              <button onClick={handleManualSync} disabled={syncing} title={t('agent_dashboard.btn_sync')}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-50">
                <span className={`material-symbols-outlined text-base ${syncing ? 'animate-spin' : ''}`}>sync</span>
                {syncing ? t('agent_dashboard.syncing') : t('agent_dashboard.btn_sync')}
              </button>
            )}
            <button onClick={() => navigate('/agent/history')} className="text-xs text-primary font-semibold hover:underline">{t('common.btn.view_all')}</button>
          </div>
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

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getResultConfig, timeAgo } from '../../data/mockData'
import { api } from '../../utils/api'
import { mapScanLog } from '../../utils/dataMappers'
import { useSocket } from '../../hooks/useSocket'

export default function SupervisionConsole() {
  const { t, i18n } = useTranslation()
  const [liveEvents,    setLiveEvents]    = useState([])
  const [terminals,     setTerminals]     = useState([])
  const [revokedList,   setRevokedList]   = useState([])
  const [alertActive,       setAlertActive]       = useState(false)
  const [revokeTarget,      setRevokeTarget]      = useState('')
  const [broadcastMessage,  setBroadcastMessage]  = useState('')
  const [now,               setNow]               = useState(new Date())

  // ── Horloge ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/api/scans?limit=50')
      .then(rows => setLiveEvents(rows.map(mapScanLog)))
      .catch(() => {})

    api.get('/api/terminals')
      .then(rows => setTerminals(rows))
      .catch(() => {})

    api.get('/api/participants?statut=révoqué,suspendu')
      .then(rows => setRevokedList(rows))
      .catch(() => {})
  }, [])

  // ── Socket.io — événements temps réel ─────────────────────────────────────
  const refreshTerminals = () =>
    api.get('/api/terminals').then(rows => setTerminals(rows)).catch(() => {})

  const { connected } = useSocket({
    'scan:new': (data) => {
      setLiveEvents(prev => [mapScanLog(data), ...prev].slice(0, 50))
    },
    'badge:revoked': (data) => {
      setRevokedList(prev => {
        const exists = prev.find(p => p.id === data.id)
        return exists ? prev : [{ id: data.id, nom: data.nom, prenom: data.prenom, statut: 'révoqué', delegation: '—' }, ...prev]
      })
    },
    'alert:broadcast': () => {
      setAlertActive(true)
    },
    'terminal:online':         () => refreshTerminals(),
    'terminal:decommissioned': () => refreshTerminals(),
  })

  // ── Export logs CSV ────────────────────────────────────────────────────────
  const handleExportLogs = () => {
    const headers = ['Horodatage','Participant','Délégation','Catégorie','Zone','Point de contrôle','Résultat']
    const rows    = liveEvents.map(e => [
      new Date(e.timestamp ?? e.ts).toISOString(),
      `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(),
      e.delegation ?? '',
      e.categorie  ?? '',
      e.zone       ?? '',
      e.point_controle_id ?? e.pointControle ?? '',
      e.resultat   ?? '',
    ])
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `supervision_logs_${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Alerte d'urgence (broadcast à tous les terminaux) ─────────────────────
  const handleEmergencyAlert = async () => {
    setAlertActive(true) // affichage local immédiat
    const msg = broadcastMessage.trim() || t('supervision.emergency_message', 'ALERTE D\'URGENCE — Sécurité maximale activée')
    await api.post('/api/alerts', { message: msg, level: 'critical' }).catch(() => {})
    setBroadcastMessage('')
  }

  // ── Révocation rapide ──────────────────────────────────────────────────────
  const handleQuickRevoke = async () => {
    if (!revokeTarget.trim()) return
    await api.patch(`/api/participants/${revokeTarget.trim()}`, { statut: 'révoqué' }).catch(() => {})
    setRevokeTarget('')
  }

  const alertCount     = liveEvents.filter(e => ['révoqué','inconnu'].includes(e.resultat)).length
  const authRate       = Math.round(liveEvents.filter(e => e.resultat === 'autorisé').length / Math.max(1, liveEvents.length) * 100)
  const activeTerms    = terminals.filter(p => p.online).length

  const kpis = [
    { key: 'live_scans',       value: liveEvents.length, icon: 'qr_code_scanner', color: 'text-primary dark:text-blue-400',       bg: 'bg-primary/10 dark:bg-primary/20',       border: 'border-primary/20 dark:border-primary/30' },
    { key: 'auth_rate',        value: `${authRate}%`,    icon: 'verified',        color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20',   border: 'border-emerald-200 dark:border-emerald-800' },
    { key: 'security_alerts',  value: alertCount,        icon: 'warning',         color: alertCount > 0 ? 'text-red-500' : 'text-slate-400', bg: alertCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800', border: alertCount > 0 ? 'border-red-200 dark:border-red-800' : 'border-slate-200 dark:border-slate-700' },
    { key: 'active_terminals', value: activeTerms,       icon: 'devices',         color: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-50 dark:bg-purple-900/20',     border: 'border-purple-200 dark:border-purple-800' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-bg-dark">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
            <span className="material-symbols-outlined text-lg filled">security</span>
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white leading-none">{t('supervision.title')}</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">{t('supervision.war_room')}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            connected
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className={`text-xs font-semibold ${connected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {connected ? t('supervision.system_active') : 'Reconnexion...'}
            </span>
          </div>
          <span className="text-sm font-mono text-slate-400 dark:text-slate-500 tabular-nums">
            {now.toLocaleTimeString(i18n.language)}
          </span>
        </div>
      </div>

      {/* Global alert banner */}
      {alertActive && (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-2xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-xl animate-pulse">warning</span>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-300">{t('supervision.alert_banner_title')}</p>
              <p className="text-xs text-red-500 dark:text-red-400">{t('supervision.alert_banner_sub')}</p>
            </div>
          </div>
          <button onClick={() => setAlertActive(false)}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-200 text-xs font-semibold px-3 py-1 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
            {t('supervision.alert_disable')}
          </button>
        </div>
      )}

      <div className="flex-1 p-4 md:p-6 space-y-5">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.key} className={`bg-white dark:bg-slate-900 border ${kpi.border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{t(`supervision.kpi.${kpi.key}`)}</p>
                <div className={`${kpi.bg} p-2 rounded-xl`}>
                  <span className={`material-symbols-outlined text-lg ${kpi.color}`}>{kpi.icon}</span>
                </div>
              </div>
              <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── Live feed ── */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="font-bold text-slate-800 dark:text-white">{t('supervision.feed_title')}</h3>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full font-medium">
                {t('supervision.events_count', { count: liveEvents.length })}
              </span>
            </div>
            <ul className="divide-y divide-slate-50 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {liveEvents.map(log => {
                const cfg = getResultConfig(log.resultat)
                return (
                  <li key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} shadow-sm`}>
                      <span className="material-symbols-outlined text-white text-sm">{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{log.nom}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{log.zone} · {log.pointControle} · <span className="font-mono">{log.agentId}</span></p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.light}`}>{log.resultat}</span>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{timeAgo(log.timestamp)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ── Right panel ── */}
          <div className="space-y-4">

            {/* Points de contrôle */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{t('supervision.checkpoints_title')}</h3>
              </div>
              <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                {terminals.map(pc => (
                  <li key={pc.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        pc.statut === 'alerte' ? 'bg-red-500 animate-pulse' :
                        pc.online              ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{pc.nom}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{pc.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{pc.scans}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        pc.statut === 'alerte' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        pc.online              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                      }`}>{pc.statut === 'alerte' ? t('common.status.alerte', 'alerte') : pc.online ? t('common.status.online') : t('common.status.offline')}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions critiques */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('supervision.critical_actions')}</h3>

              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">{t('supervision.broadcast_label')}</p>
                <textarea
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  rows={2}
                  placeholder={t('supervision.broadcast_placeholder')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                />
              </div>

              <button onClick={handleEmergencyAlert}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors group">
                <span className="material-symbols-outlined text-lg animate-pulse group-hover:animate-none">cancel</span>
                <span className="font-bold text-xs uppercase tracking-tight">{t('supervision.emergency_btn')}</span>
              </button>

              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">{t('supervision.quick_revoke')}</p>
                <div className="flex gap-2">
                  <input value={revokeTarget} onChange={e => setRevokeTarget(e.target.value)}
                    placeholder={t('supervision.revoke_placeholder')}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"/>
                  <button onClick={handleQuickRevoke}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-white text-xs font-bold transition-colors">
                    {t('supervision.revoke_btn')}
                  </button>
                </div>
              </div>

              <button
                onClick={() => alert(t('supervision.decommission_note', 'Rendez-vous dans Gestion des portes pour décommissionner un terminal.'))}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">phonelink_erase</span>
                <span className="text-xs font-semibold">{t('supervision.decommission_btn')}</span>
              </button>
              <button
                onClick={handleExportLogs}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">download</span>
                <span className="text-xs font-semibold">{t('supervision.export_logs_btn')}</span>
              </button>
            </div>

            {/* Badges révoqués */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-red-100 dark:border-red-900/30">
                <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t('supervision.revoked_title')}</h3>
              </div>
              <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                {revokedList.map(p => (
                  <li key={p.id} className="flex items-center gap-2 px-5 py-3">
                    <span className="material-symbols-outlined text-red-400 text-base shrink-0">block</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.prenom} {p.nom}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{p.delegation} · {p.id}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      p.statut === 'révoqué' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>{p.statut}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

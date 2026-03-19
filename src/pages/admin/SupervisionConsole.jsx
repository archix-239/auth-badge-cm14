import { useState, useEffect } from 'react'
import { LOGS, PARTICIPANTS, POINTS_CONTROLE, getResultConfig, timeAgo, getCategoryColor } from '../../data/mockData'

export default function SupervisionConsole() {
  const [liveEvents, setLiveEvents] = useState(LOGS.slice(0, 8))
  const [alertActive, setAlertActive] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    const feed = setInterval(() => {
      const random = LOGS[Math.floor(Math.random() * LOGS.length)]
      setLiveEvents(prev => [{ ...random, id: `L-LIVE-${Date.now()}`, timestamp: new Date() }, ...prev].slice(0, 25))
    }, 7000)
    return () => { clearInterval(tick); clearInterval(feed) }
  }, [])

  const alertCount = liveEvents.filter(e => ['révoqué','inconnu'].includes(e.resultat)).length
  const authRate   = Math.round(liveEvents.filter(e => e.resultat === 'autorisé').length / Math.max(1, liveEvents.length) * 100)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-bg-dark">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
            <span className="material-symbols-outlined text-lg filled">security</span>
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white leading-none">Console de Supervision</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">CM14 — War Room — Niveau 4</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">SYSTÈME ACTIF</span>
          </div>
          <span className="text-sm font-mono text-slate-400 dark:text-slate-500 tabular-nums">
            {now.toLocaleTimeString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Global alert banner */}
      {alertActive && (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-2xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-xl animate-pulse">warning</span>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-300">ALERTE GÉNÉRALE ACTIVE</p>
              <p className="text-xs text-red-500 dark:text-red-400">Tous les terminaux agents ont été notifiés</p>
            </div>
          </div>
          <button onClick={() => setAlertActive(false)}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-200 text-xs font-semibold px-3 py-1 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
            Désactiver
          </button>
        </div>
      )}

      <div className="flex-1 p-4 md:p-6 space-y-5">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Scans en direct',      value: liveEvents.length,  icon: 'qr_code_scanner', color: 'text-primary dark:text-blue-400',      bg: 'bg-primary/10 dark:bg-primary/20',      border: 'border-primary/20 dark:border-primary/30' },
            { label: 'Taux d\'autorisation', value: `${authRate}%`,     icon: 'verified',        color: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-800' },
            { label: 'Alertes sécurité',     value: alertCount,         icon: 'warning',         color: alertCount > 0 ? 'text-red-500 stat-live' : 'text-slate-400', bg: alertCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800', border: alertCount > 0 ? 'border-red-200 dark:border-red-800' : 'border-slate-200 dark:border-slate-700' },
            { label: 'Terminaux actifs',     value: POINTS_CONTROLE.filter(p=>p.statut==='actif').length, icon: 'devices', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
          ].map(kpi => (
            <div key={kpi.label} className={`bg-white dark:bg-slate-900 border ${kpi.border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{kpi.label}</p>
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
                <h3 className="font-bold text-slate-800 dark:text-white">Flux d'événements en direct</h3>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full font-medium">{liveEvents.length} événements</span>
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
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Points de contrôle</h3>
              </div>
              <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                {POINTS_CONTROLE.map(pc => (
                  <li key={pc.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        pc.statut === 'actif'  ? 'bg-emerald-500' :
                        pc.statut === 'alerte' ? 'bg-red-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                      }`}></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{pc.nom}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{pc.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{pc.scans}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        pc.statut === 'actif'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        pc.statut === 'alerte' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                      }`}>{pc.statut}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions critiques */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Actions critiques</h3>

              {/* Emergency alert */}
              <button onClick={() => setAlertActive(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors group">
                <span className="material-symbols-outlined text-lg animate-pulse group-hover:animate-none">cancel</span>
                <span className="font-bold text-xs uppercase tracking-tight">ALERTE GÉNÉRALE D'URGENCE</span>
              </button>

              {/* Revoke badge */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Révocation rapide</p>
                <div className="flex gap-2">
                  <input value={revokeTarget} onChange={e => setRevokeTarget(e.target.value)}
                    placeholder="ID Badge (ex: P-006)"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"/>
                  <button
                    onClick={() => { if (revokeTarget) { setRevokeTarget('') } }}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-white text-xs font-bold transition-colors">
                    RÉVOQUER
                  </button>
                </div>
              </div>

              {/* Other actions */}
              {[
                { icon: 'phonelink_erase', label: 'Décommissionner un terminal' },
                { icon: 'download', label: 'Exporter les journaux de sécurité' },
              ].map(a => (
                <button key={a.label}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-lg">{a.icon}</span>
                  <span className="text-xs font-semibold">{a.label}</span>
                </button>
              ))}
            </div>

            {/* Badges révoqués */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-red-100 dark:border-red-900/30">
                <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Badges révoqués / suspendus</h3>
              </div>
              <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                {PARTICIPANTS.filter(p => p.statut !== 'actif').map(p => (
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

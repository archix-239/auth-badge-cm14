import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { PARTICIPANTS, getResultConfig, getCategoryColor } from '../../data/mockData'

const MOCK_SCAN_POOL = [
  { participantId: 'P-001' },
  { participantId: 'P-002' },
  { participantId: 'P-006' },
  { participantId: 'P-008' },
  { participantId: null      },
  { participantId: 'P-004' },
  { participantId: 'P-007' },
  { participantId: 'P-003' },
]
let mockIdx = 0

export default function Scanner() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [phase, setPhase]         = useState('idle')
  const [result, setResult]       = useState(null)
  const [scanLog, setScanLog]     = useState([])
  const [elapsed, setElapsed]     = useState(0)
  const [manualId, setManualId]   = useState('')
  const [showManual, setShowManual] = useState(false)
  const timerRef   = useRef(null)
  const manualRef  = useRef(null)
  const currentZone = 'Entrée Nord — Salle Plénière'

  // Métadonnées des résultats (labels traduits dynamiquement)
  const RESULT_META = {
    'autorisé':     { bg: 'bg-emerald-500', glow: 'shadow-emerald-500/40', ring: 'ring-emerald-400', label: t('scanner.result.authorized'),   sublabel: t('scanner.result.sub_authorized'),  icon: 'check_circle' },
    'révoqué':      { bg: 'bg-red-500',     glow: 'shadow-red-500/40',     ring: 'ring-red-400',     label: t('scanner.result.revoked'),      sublabel: t('scanner.result.sub_revoked'),     icon: 'cancel' },
    'zone-refusée': { bg: 'bg-orange-500',  glow: 'shadow-orange-500/40',  ring: 'ring-orange-400',  label: t('scanner.result.zone_denied'),  sublabel: t('scanner.result.sub_zone_denied'), icon: 'block' },
    'inconnu':      { bg: 'bg-violet-600',  glow: 'shadow-violet-500/40',  ring: 'ring-violet-400',  label: t('scanner.result.unknown'),      sublabel: t('scanner.result.sub_unknown'),     icon: 'help' },
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])
  useEffect(() => { if (showManual && manualRef.current) manualRef.current.focus() }, [showManual])

  const doScan = (participantId, delay = 1100) => {
    setPhase('scanning')
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 50), 50)

    setTimeout(() => {
      clearInterval(timerRef.current)
      const participant = participantId ? PARTICIPANTS.find(p => p.id === participantId) : null
      let resultat = 'inconnu'
      if (participant) {
        if (participant.statut === 'révoqué' || participant.statut === 'suspendu') resultat = 'révoqué'
        else if (!participant.zones.includes('Z2')) resultat = 'zone-refusée'
        else resultat = 'autorisé'
      }
      const scanResult = { id: `S-${Date.now()}`, participant, resultat, zone: currentZone, timestamp: new Date(), agentId: user?.id }
      setResult(scanResult)
      setScanLog(prev => [scanResult, ...prev].slice(0, 20))
      setPhase('result')
    }, delay)
  }

  const startScan = () => {
    const mock = MOCK_SCAN_POOL[mockIdx % MOCK_SCAN_POOL.length]
    mockIdx++
    doScan(mock.participantId)
  }

  const handleManual = (e) => {
    e.preventDefault()
    if (!manualId.trim()) return
    const p = PARTICIPANTS.find(p => p.id === manualId.trim().toUpperCase())
    doScan(p?.id || null, 600)
    setManualId('')
    setShowManual(false)
  }

  const reset = () => { setPhase('idle'); setResult(null) }

  const meta = result ? (RESULT_META[result.resultat] || RESULT_META['inconnu']) : null

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">

      {/* ── IDLE ─────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col">
          {/* Viewfinder */}
          <div className="relative bg-slate-950 flex-1 flex flex-col items-center justify-center" style={{ minHeight: 300 }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,59,138,0.15),transparent_70%)]"></div>
            <div className="relative w-56 h-56 z-10">
              {['tl','tr','bl','br'].map(c => (
                <div key={c} className={`scanner-corner scanner-corner-${c}`}
                  style={{ borderColor: 'rgba(30,59,138,0.6)' }}></div>
              ))}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-6xl text-white/10">qr_code_2</span>
                <p className="text-white/30 text-xs text-center px-6">{t('scanner.idle.hint')}</p>
              </div>
            </div>
            {scanLog.length > 0 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
                {scanLog.slice(0, 6).map(s => {
                  const m = RESULT_META[s.resultat] || RESULT_META['inconnu']
                  return (
                    <div key={s.id} className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.bg} shadow-lg ${m.glow} shadow`}>
                      <span className="material-symbols-outlined text-white text-sm">{m.icon}</span>
                    </div>
                  )
                })}
                <span className="text-xs text-white/30 self-center ml-1">{t('scanner.idle.scans_count', { count: scanLog.length })}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-slate-900 p-5 space-y-3">
            {/* Zone indicator */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5">
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-xl">
                <span className="material-symbols-outlined text-primary text-xl">place</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('scanner.idle.checkpoint')}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{currentZone}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('scanner.idle.active')}</span>
              </div>
            </div>

            {/* Main scan button */}
            <button onClick={startScan}
              className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] text-white rounded-2xl py-5 flex items-center justify-center gap-3 text-lg font-bold shadow-xl shadow-primary/25 transition-all">
              <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
              {t('scanner.idle.btn_start')}
            </button>

            {/* Secondary buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl py-3 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-lg">nfc</span>
                {t('scanner.idle.btn_nfc')}
              </button>
              <button
                onClick={() => setShowManual(!showManual)}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
                  showManual ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>
                <span className="material-symbols-outlined text-lg">keyboard</span>
                {t('scanner.idle.btn_manual')}
              </button>
            </div>

            {/* Manual input */}
            {showManual && (
              <form onSubmit={handleManual} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={manualRef}
                    value={manualId}
                    onChange={e => setManualId(e.target.value.toUpperCase())}
                    placeholder={t('scanner.idle.manual_placeholder')}
                    className="flex-1 pl-4 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tracking-widest"
                  />
                  <button type="submit"
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors">
                    {t('scanner.idle.manual_verify')}
                  </button>
                </div>
                {/* Aperçu en direct */}
                {manualId.trim() && (() => {
                  const preview = PARTICIPANTS.find(p => p.id === manualId.trim().toUpperCase())
                  return preview ? (
                    <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2">
                      <span className="material-symbols-outlined text-emerald-500 text-lg shrink-0">check_circle</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{preview.prenom} {preview.nom}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{preview.delegation} · {preview.categorie}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                      <span className="material-symbols-outlined text-slate-400 text-lg shrink-0">help_outline</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('scanner.idle.manual_not_found')}</p>
                    </div>
                  )
                })()}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── SCANNING ─────────────────────────────────────── */}
      {phase === 'scanning' && (
        <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center" style={{ minHeight: '100%' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(30,59,138,0.2),transparent_60%)]"></div>

          <div className="relative w-56 h-56 z-10">
            {['tl','tr','bl','br'].map(c => (
              <div key={c} className={`scanner-corner scanner-corner-${c}`}></div>
            ))}
            <div className="absolute inset-0 overflow-hidden rounded-sm">
              <div className="absolute left-0 right-0 h-0.5 scan-line-anim"
                style={{ background: 'linear-gradient(to right, transparent, #10b981 30%, #10b981 70%, transparent)' }}>
              </div>
            </div>
            <div className="absolute inset-4 opacity-10">
              <svg viewBox="0 0 100 100" fill="white">
                <rect x="10" y="10" width="30" height="30" rx="2" fill="none" stroke="white" strokeWidth="4"/>
                <rect x="17" y="17" width="16" height="16" rx="1"/>
                <rect x="60" y="10" width="30" height="30" rx="2" fill="none" stroke="white" strokeWidth="4"/>
                <rect x="67" y="17" width="16" height="16" rx="1"/>
                <rect x="10" y="60" width="30" height="30" rx="2" fill="none" stroke="white" strokeWidth="4"/>
                <rect x="17" y="67" width="16" height="16" rx="1"/>
                <rect x="60" y="60" width="8" height="8" rx="1"/>
                <rect x="72" y="60" width="8" height="8" rx="1"/>
                <rect x="84" y="60" width="8" height="8" rx="1"/>
                <rect x="60" y="72" width="8" height="8" rx="1"/>
                <rect x="84" y="72" width="8" height="8" rx="1"/>
                <rect x="60" y="84" width="8" height="8" rx="1"/>
                <rect x="72" y="84" width="20" height="8" rx="1"/>
              </svg>
            </div>
          </div>

          <div className="z-10 mt-8 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <p className="text-white font-semibold text-lg">{t('scanner.scanning.label')}</p>
            </div>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, (elapsed / 1200) * 100)}%` }}></div>
            </div>
            <p className="text-white/40 text-xs mt-1">{(elapsed / 1000).toFixed(1)}s</p>
          </div>

          <button onClick={() => { clearInterval(timerRef.current); setPhase('idle') }}
            className="absolute bottom-8 z-10 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-6 py-2.5 text-sm font-medium transition-colors">
            {t('scanner.btn_cancel')}
          </button>
        </div>
      )}

      {/* ── RESULT ─────────────────────────────────────────── */}
      {phase === 'result' && result && meta && (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950" style={{ minHeight: '100%' }}>

          {/* Color status bar */}
          <div className={`${meta.bg} px-6 py-5 flex flex-col items-center gap-3 shadow-xl ${meta.glow} shadow-2xl`}>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center ring-4 ${meta.ring} ring-offset-2 ring-offset-transparent shadow-xl`}>
              <span className="material-symbols-outlined text-white filled" style={{ fontSize: 36 }}>{meta.icon}</span>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.2em] mb-1">{t('scanner.result.label')}</p>
              <h2 className="text-white text-xl sm:text-2xl font-black tracking-tight leading-tight">{meta.label}</h2>
              <p className="text-white/70 text-sm mt-1">{meta.sublabel}</p>
            </div>
            <p className="text-white/50 text-xs font-mono">
              {new Date(result.timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          {/* Participant info */}
          <div className="flex-1 px-4 py-5 space-y-3">
            {result.participant ? (
              <>
                {/* Identity card */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg ${meta.bg}`}>
                      {result.participant.prenom?.charAt(0)}{result.participant.nom?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {result.participant.prenom} {result.participant.nom}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{result.participant.delegation}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getCategoryColor(result.participant.categorie)}`}>
                          {result.participant.categorie}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          result.participant.statut === 'actif' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {result.participant.statut}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('scanner.detail.zone_scanned'),  value: result.zone, icon: 'place' },
                    { label: t('scanner.detail.badge_id'),      value: result.participant.id, icon: 'badge', mono: true },
                    { label: t('scanner.detail.scan_time'),     value: new Date(result.timestamp).toLocaleTimeString(i18n.language), icon: 'schedule' },
                    { label: t('scanner.detail.zones_allowed'), value: result.participant.zones.join(' · '), icon: 'map' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-sm">{item.icon}</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">{item.label}</p>
                      </div>
                      <p className={`text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight ${item.mono ? 'font-mono' : ''}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Zone refusée */}
                {result.resultat === 'zone-refusée' && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-orange-500 text-xl shrink-0">directions</span>
                    <div>
                      <p className="text-sm font-bold text-orange-800 dark:text-orange-300">{t('scanner.result.zone_warning_title')}</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">{t('scanner.result.zone_warning_redirect')}</p>
                    </div>
                  </div>
                )}

                {/* Révoqué / Inconnu */}
                {['révoqué', 'inconnu'].includes(result.resultat) && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-500 text-xl animate-pulse shrink-0">notification_important</span>
                    <div>
                      <p className="text-sm font-bold text-red-800 dark:text-red-300">{t('scanner.result.alert_title')}</p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{t('scanner.result.alert_sub')}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Badge inconnu */
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-6 text-center space-y-3">
                <span className="material-symbols-outlined text-violet-500 text-5xl">help_outline</span>
                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{t('scanner.result.unknown_title')}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('scanner.result.unknown_desc')}</p>
                </div>
                <div className="bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-xl p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-violet-600 dark:text-violet-400 text-lg animate-pulse">notification_important</span>
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">{t('scanner.result.unknown_alert')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 space-y-2">
            <button onClick={reset}
              className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] text-white rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all">
              <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
              {t('scanner.result.btn_next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

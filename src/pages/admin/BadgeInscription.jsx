import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { PARTICIPANTS, ZONES, CATEGORIES, getCategoryColor, getStatutColor } from '../../data/mockData'
import { signBadge } from '../../utils/badgeCrypto'
import { api } from '../../utils/api'
import { mapParticipant } from '../../utils/dataMappers'

const IS_MOCK = !import.meta.env.VITE_API_URL

const emptyForm = { prenom: '', nom: '', delegation: '', categorie: 'DEL', zones: ['Z1'], dateExpiration: '' }

export default function BadgeInscription() {
  const { t } = useTranslation()
  const [form, setForm]                 = useState(emptyForm)
  const [participants, setParticipants] = useState(PARTICIPANTS)
  const [generated, setGenerated]       = useState(null)
  const [qrValue, setQrValue]           = useState('')
  const [search, setSearch]             = useState('')
  const [step, setStep]                 = useState('form')
  const [revoking, setRevoking]         = useState(null)
  const qrContainerRef                  = useRef(null)
  const badgeCardRef                    = useRef(null)

  // Charge les vrais participants depuis l'API au mount
  useEffect(() => {
    if (IS_MOCK) return
    api.get('/api/participants')
      .then(rows => setParticipants(rows.map(mapParticipant)))
      .catch(() => {}) // garde les données mock en fallback
  }, [])

  // Sign badge payload whenever a new badge is generated
  useEffect(() => {
    if (!generated) return
    const payload = {
      id: generated.id, nom: generated.nom, prenom: generated.prenom,
      delegation: generated.delegation, categorie: generated.categorie,
      zones: generated.zones, exp: generated.dateExpiration,
    }
    signBadge(payload).then(sig => {
      setQrValue(JSON.stringify({ ...payload, sig }))
    })
  }, [generated])

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleZone = (zid) => {
    setForm(f => ({
      ...f,
      zones: f.zones.includes(zid) ? f.zones.filter(z => z !== zid) : [...f.zones, zid]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const id = `P-${String(participants.length + 1).padStart(3, '0')}`
    const expiration = form.dateExpiration || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    if (!IS_MOCK) {
      try {
        const created = await api.post('/api/participants', {
          nom:             form.nom,
          prenom:          form.prenom,
          delegation:      form.delegation,
          categorie:       form.categorie,
          zones:           form.zones,
          statut:          'actif',
          date_expiration: expiration,
        })
        const newP = mapParticipant(created)
        setParticipants(prev => [newP, ...prev])
        setGenerated(newP)
        setStep('badge')
        return
      } catch (err) {
        console.error('[inscription]', err)
      }
    }

    // Mode mock
    const newP = { id, ...form, statut: 'actif', dateExpiration: expiration }
    setParticipants(prev => [newP, ...prev])
    setGenerated(newP)
    setStep('badge')
  }

  const handleRevoke = (id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, statut: 'révoqué' } : p))
    setRevoking(null)
  }

  // Génère le badge comme canvas 2D (bypass html2canvas — fiable avec les canvas QR)
  const buildBadgeCanvas = useCallback(() => {
    const qrEl = qrContainerRef.current?.querySelector('canvas')
    if (!qrEl || !generated) return null

    const W = 680, H = 400
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const c = cv.getContext('2d')

    // Fond dégradé sombre
    const bg = c.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b')
    c.fillStyle = bg; c.fillRect(0, 0, W, H)

    // Bandeau header bleu
    c.fillStyle = '#1e40af'; c.fillRect(0, 0, W, 64)

    // Texte header
    c.fillStyle = '#ffffff'; c.font = 'bold 15px Arial'
    c.fillText('OMC CM14 — YAOUNDÉ 2025', 20, 28)
    c.fillStyle = '#93c5fd'; c.font = '10px Arial'
    c.fillText("BADGE D'ACCÈS OFFICIEL — CONFÉRENCE MINISTÉRIELLE N°14", 20, 48)

    // Badge catégorie (haut droite)
    c.fillStyle = '#ffffff'; c.fillRect(W - 90, 16, 72, 30)
    c.fillStyle = '#1e40af'; c.font = 'bold 13px Arial'
    c.textAlign = 'center'; c.fillText(generated.categorie, W - 54, 36); c.textAlign = 'left'

    // QR Code (droite)
    const qrSize = 210, qrX = W - qrSize - 24, qrY = 80
    c.fillStyle = '#ffffff'; c.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
    c.drawImage(qrEl, qrX, qrY, qrSize, qrSize)

    // ID sous le QR
    c.fillStyle = '#64748b'; c.font = '10px monospace'
    c.textAlign = 'center'; c.fillText(generated.id, qrX + qrSize / 2, qrY + qrSize + 20); c.textAlign = 'left'

    // Prénom + Nom
    c.fillStyle = '#cbd5e1'; c.font = 'bold 22px Arial'
    c.fillText(generated.prenom, 24, 108)
    c.fillStyle = '#ffffff'; c.font = 'bold 30px Arial'
    c.fillText(generated.nom.toUpperCase(), 24, 148)

    // Délégation
    c.fillStyle = '#94a3b8'; c.font = '15px Arial'
    c.fillText(generated.delegation, 24, 178)

    // Séparateur
    c.fillStyle = '#334155'; c.fillRect(24, 195, 200, 1)

    // Zones
    let zx = 24
    generated.zones.forEach(z => {
      c.font = 'bold 11px Arial'
      const tw = c.measureText(z).width + 18
      c.fillStyle = '#1e40af'; c.fillRect(zx, 208, tw, 22)
      c.fillStyle = '#ffffff'; c.fillText(z, zx + 9, 224)
      zx += tw + 6
    })

    // Date expiration
    c.fillStyle = '#475569'; c.font = '11px Arial'
    c.fillText(`Exp : ${generated.dateExpiration}`, 24, 260)

    // Bandeau footer
    c.fillStyle = '#0f172a'; c.fillRect(0, H - 36, W, 36)
    c.fillStyle = '#334155'; c.font = '10px Arial'
    c.fillText('AUTH-BADGE CM14 — Système de contrôle d\'accès OMC', 20, H - 14)

    return cv
  }, [generated])

  const handlePrint = () => {
    const cv = buildBadgeCanvas()
    if (!cv) return
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Badge CM14</title>
      <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}
      img{max-width:100%}@media print{body{margin:0}}</style></head>
      <body><img src="${cv.toDataURL('image/png')}" /></body></html>`)
    win.document.close()
    win.onload = () => win.print()
  }

  const handleDownload = () => {
    const cv = buildBadgeCanvas()
    if (!cv) return
    const a = document.createElement('a')
    a.href = cv.toDataURL('image/png')
    a.download = `badge_${generated?.id ?? 'cm14'}.png`
    a.click()
  }

  const filtered = participants.filter(p =>
    !search || `${p.prenom} ${p.nom} ${p.delegation}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('inscription.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('inscription.subtitle')}</p>
        </div>
        {step === 'badge' && (
          <button onClick={() => { setStep('form'); setGenerated(null); setForm(emptyForm) }}
            className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
            <span className="material-symbols-outlined text-lg">add</span>
            {t('inscription.btn.new')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* LEFT: form or badge */}
        <div>
          {step === 'form' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">how_to_reg</span>
                {t('inscription.form.title')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('inscription.form.firstname')}</label>
                    <input required value={form.prenom} onChange={e => handleChange('prenom', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Emmanuel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('inscription.form.lastname')}</label>
                    <input required value={form.nom} onChange={e => handleChange('nom', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Kofi Asante" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('inscription.form.delegation')}</label>
                  <input required value={form.delegation} onChange={e => handleChange('delegation', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Ghana" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('inscription.form.category')}</label>
                    <select value={form.categorie} onChange={e => handleChange('categorie', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                      {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('inscription.form.expiration')}</label>
                    <input type="date" value={form.dateExpiration} onChange={e => handleChange('dateExpiration', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('inscription.form.zones')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ZONES.map(z => (
                      <label key={z.id}
                        className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          form.zones.includes(z.id) ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <input type="checkbox" checked={form.zones.includes(z.id)} onChange={() => toggleZone(z.id)}
                          className="mt-0.5 accent-primary" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{z.id}</p>
                          <p className="text-xs text-slate-500">{z.nom}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit"
                  className="w-full bg-primary text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-lg">qr_code_2</span>
                  {t('inscription.btn.generate')}
                </button>
              </form>
            </div>
          )}

          {step === 'badge' && generated && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div ref={badgeCardRef} className="bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-sm">shield_person</span>
                  <span className="text-xs font-bold uppercase tracking-widest">OMC CM14 — Yaoundé 2025</span>
                </div>
                <div ref={qrContainerRef} className="bg-white rounded-2xl p-5 inline-block mb-4 shadow-lg">
                  <QRCodeCanvas
                    value={qrValue || '{}'}
                    size={220}
                    level="H"
                    includeMargin={false}
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                  />
                </div>
                <h3 className="text-xl font-bold">{generated.prenom} {generated.nom}</h3>
                <p className="text-slate-300 text-sm mt-1">{generated.delegation}</p>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">{generated.categorie}</span>
                  <span className="text-xs text-slate-400 font-mono">{generated.id}</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                  {generated.zones.map(z => (
                    <span key={z} className="text-xs bg-white/10 text-white px-2 py-0.5 rounded font-medium">{z}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Exp: {generated.dateExpiration}</p>
              </div>
              <div className="p-4 flex gap-3">
                <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors">
                  <span className="material-symbols-outlined text-lg">print</span>
                  {t('inscription.btn.print')}
                </button>
                <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined text-lg">download</span>
                  {t('inscription.btn.download')}
                </button>
              </div>
              <div className="px-4 pb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                  <p className="text-sm text-emerald-700 font-medium">{t('inscription.badge.success')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: participants list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 dark:text-white">{t('inscription.list.title')}</h3>
              <span className="text-xs text-slate-400">{t('inscription.list.count', { filtered: filtered.length, total: participants.length })}</span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t('inscription.list.search')} />
            </div>
          </div>
          <ul className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
            {filtered.map(p => (
              <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                  {p.prenom.charAt(0)}{p.nom.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{p.prenom} {p.nom}</p>
                  <p className="text-xs text-slate-400">{p.delegation}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getCategoryColor(p.categorie)}`}>{p.categorie}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatutColor(p.statut)}`}>{p.statut}</span>
                  {p.statut === 'actif' && (
                    <button onClick={() => setRevoking(p.id)}
                      className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                      title={t('inscription.revoke.title')}>
                      <span className="material-symbols-outlined text-base">cancel</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Revoke modal */}
      {revoking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <span className="material-symbols-outlined text-red-600">warning</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('inscription.revoke.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">{t('inscription.revoke.desc')}</p>
            <div className="flex gap-3">
              <button onClick={() => setRevoking(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                {t('common.btn.cancel')}
              </button>
              <button onClick={() => handleRevoke(revoking)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                {t('inscription.revoke.btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

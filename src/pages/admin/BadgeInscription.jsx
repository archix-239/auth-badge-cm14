import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { CATEGORIES, getCategoryColor, getStatutColor } from '../../data/mockData'
import { signBadge } from '../../utils/badgeCrypto'
import { api } from '../../utils/api'
import { mapParticipant } from '../../utils/dataMappers'
import { buildBadgeCanvas, CAT_META } from '../../utils/badgeCanvas'

const emptyForm = { prenom: '', nom: '', delegation: '', categorie: 'DEL', zones: [], dateExpiration: '' }

export default function BadgeInscription() {
  const { t } = useTranslation()
  const [form, setForm]                 = useState(emptyForm)
  const [participants, setParticipants] = useState([])
  const [zones,        setZones]        = useState([])
  const [generated, setGenerated]       = useState(null)
  const [qrValue, setQrValue]           = useState('')
  const [search, setSearch]             = useState('')
  const [step, setStep]                 = useState('form')
  const [revoking, setRevoking]         = useState(null)
  const [nfcCopied, setNfcCopied]       = useState(false)
  const qrContainerRef                  = useRef(null)
  const badgeCardRef                    = useRef(null)

  useEffect(() => {
    api.get('/api/participants')
      .then(rows => setParticipants(rows.map(mapParticipant)))
      .catch(() => {})
    api.get('/api/zones')
      .then(rows => {
        setZones(rows)
        // Sélectionne Z1 par défaut si disponible
        if (rows.length > 0) setForm(f => f.zones.length === 0 ? { ...f, zones: [rows[0].id] } : f)
      })
      .catch(() => {})
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
    const expiration = form.dateExpiration || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
    } catch (err) {
      console.error('[inscription]', err)
    }
  }

  const handleRevoke = (id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, statut: 'révoqué' } : p))
    setRevoking(null)
  }

  const getBadgeCanvas = useCallback(() => {
    const qrEl = qrContainerRef.current?.querySelector('canvas')
    return buildBadgeCanvas(generated, qrEl)
  }, [generated])

  const handlePrint = () => {
    const cv = getBadgeCanvas()
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
    const cv = getBadgeCanvas()
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
                    {zones.map(z => (
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

          {step === 'badge' && generated && (() => {
            const cat      = CAT_META[generated.categorie] ?? CAT_META.DEL
            const catColor = cat.color
            const catLabel = cat.label
            return (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Prévisualisation badge vertical */}
                <div className="flex justify-center py-6 bg-slate-100 dark:bg-slate-800">
                  <div className="w-[280px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">

                    {/* Header */}
                    <div className="relative overflow-hidden text-center py-5 px-4"
                      style={{ background: 'linear-gradient(135deg, #0f2d6b 0%, #1e40af 100%)' }}>
                      <div className="absolute top-[-30px] right-[-30px] w-32 h-32 rounded-full opacity-[0.07] bg-white"></div>
                      <div className="absolute bottom-[-20px] left-[-20px] w-20 h-20 rounded-full opacity-[0.07] bg-white"></div>
                      <div className="relative z-10">
                        <p className="text-3xl font-black text-white tracking-tight leading-none">CM14</p>
                        <p className="text-blue-200 text-[9px] font-bold uppercase tracking-[0.18em] mt-1">Conférence Ministérielle</p>
                        <p className="text-blue-300 text-[8px] mt-0.5">Yaoundé · Cameroun · 2026</p>
                      </div>
                    </div>

                    {/* Bandeau catégorie */}
                    <div className="py-2 text-center" style={{ backgroundColor: catColor }}>
                      <span className="text-white text-[11px] font-black uppercase tracking-widest">{catLabel}</span>
                    </div>

                    {/* Corps */}
                    <div className="bg-white px-4 pt-5 pb-4 text-center">
                      {/* Avatar */}
                      <div className="w-[68px] h-[68px] rounded-full mx-auto mb-3 flex items-center justify-center text-white text-[22px] font-black shadow-lg ring-[3px] ring-white"
                        style={{ backgroundColor: catColor }}>
                        {generated.prenom?.charAt(0)}{generated.nom?.charAt(0)}
                      </div>

                      {/* Nom */}
                      <p className="text-slate-500 text-sm leading-none">{generated.prenom}</p>
                      <p className="text-slate-900 text-[22px] font-black mt-1 leading-tight">{generated.nom.toUpperCase()}</p>
                      <p className="text-slate-400 text-xs mt-1">{generated.delegation}</p>

                      {/* Séparateur */}
                      <div className="w-10 h-[3px] mx-auto mt-3 mb-3 rounded-full" style={{ backgroundColor: catColor }}></div>

                      {/* Zones */}
                      {generated.zones.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Zones autorisées</p>
                          <div className="flex flex-wrap justify-center gap-1 mb-3">
                            {generated.zones.map(z => (
                              <span key={z} className="text-[10px] font-bold px-2 py-0.5 rounded border"
                                style={{ color: catColor, borderColor: catColor + '50', backgroundColor: catColor + '12' }}>
                                {z}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* QR Code */}
                      <div ref={qrContainerRef} className="inline-block rounded-xl p-2.5 shadow-sm border border-slate-100">
                        <QRCodeCanvas value={qrValue || '{}'} size={150} level="H" includeMargin={false} fgColor="#0f172a" bgColor="#ffffff" />
                      </div>
                      <p className="text-slate-300 text-[9px] font-mono mt-1.5 tracking-wider">{generated.id}</p>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-900 py-2.5 text-center space-y-0.5">
                      <p className="text-slate-500 text-[8px] uppercase tracking-wide">AUTH-BADGE CM14 — OMC</p>
                      <p className="text-slate-600 text-[8px]">Valide jusqu'au {generated.dateExpiration}</p>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
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
                <div className="px-4 pb-3">
                  <button
                    onClick={() => {
                      if (!qrValue) return
                      navigator.clipboard.writeText(qrValue).then(() => {
                        setNfcCopied(true)
                        setTimeout(() => setNfcCopied(false), 2000)
                      })
                    }}
                    disabled={!qrValue}
                    className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40">
                    <span className="material-symbols-outlined text-lg">{nfcCopied ? 'check_circle' : 'nfc'}</span>
                    {nfcCopied ? t('inscription.btn.nfc_copied') : t('inscription.btn.copy_nfc')}
                  </button>
                </div>
                <div className="px-4 pb-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                    <p className="text-sm text-emerald-700 font-medium">{t('inscription.badge.success')}</p>
                  </div>
                </div>
              </div>
            )
          })()}
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

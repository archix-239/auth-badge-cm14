import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { CATEGORIES, getCategoryColor, getStatutColor } from '../../data/mockData'
import { signBadge } from '../../utils/badgeCrypto'
import { api } from '../../utils/api'
import { mapParticipant } from '../../utils/dataMappers'

const EMPTY_FORM = { prenom: '', nom: '', delegation: '', categorie: 'DEL', zones: [], dateExpiration: '' }

export default function ParticipantManagement() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [selectedId, setSelectedId]     = useState(null)
  const [modal, setModal]               = useState(null)
  // form state (create / edit)
  const [formData, setFormData]         = useState(EMPTY_FORM)
  const [formMode, setFormMode]         = useState('create') // 'create' | 'edit'
  const [formLoading, setFormLoading]   = useState(false)
  const [badgeQrValue, setBadgeQrValue] = useState('')
  const [zones, setZones]               = useState([])
  const qrRef = useRef(null)

  useEffect(() => {
    api.get('/api/participants')
      .then(rows => setParticipants(rows.map(mapParticipant)))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/api/zones')
      .then(rows => setZones(rows))
      .catch(() => {})
  }, [])

  const filtered = participants.filter(p => {
    const q = search.toLowerCase()
    return (
      (!search || `${p.prenom} ${p.nom} ${p.delegation} ${p.id}`.toLowerCase().includes(q)) &&
      (!filterCat    || p.categorie === filterCat) &&
      (!filterStatut || p.statut === filterStatut)
    )
  })

  const selected = selectedId ? participants.find(p => p.id === selectedId) ?? null : null

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRevoke = async () => {
    await api.patch(`/api/participants/${selectedId}`, { statut: 'révoqué' }).catch(() => {})
    setParticipants(prev => prev.map(p => p.id === selectedId ? { ...p, statut: 'révoqué' } : p))
    setModal('detail')
  }

  const handleDelete = async () => {
    await api.delete(`/api/participants/${selectedId}`).catch(() => {})
    setParticipants(prev => prev.filter(p => p.id !== selectedId))
    setSelectedId(null)
    setModal(null)
  }

  const openCreate = () => {
    setFormData(EMPTY_FORM)
    setFormMode('create')
    setModal('form')
  }

  const openBadge = async () => {
    setBadgeQrValue('')
    setModal('badge')
    const payload = {
      id: selected.id, nom: selected.nom, prenom: selected.prenom,
      delegation: selected.delegation, categorie: selected.categorie,
      zones: selected.zones, exp: selected.dateExpiration,
    }
    const sig = await signBadge(payload)
    setBadgeQrValue(JSON.stringify({ ...payload, sig }))
  }

  const buildBadgeCanvas = useCallback(() => {
    const qrEl = qrRef.current?.querySelector('canvas')
    if (!qrEl || !selected) return null
    const W = 680, H = 400
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const c = cv.getContext('2d')
    const bg = c.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b')
    c.fillStyle = bg; c.fillRect(0, 0, W, H)
    c.fillStyle = '#1e40af'; c.fillRect(0, 0, W, 64)
    c.fillStyle = '#ffffff'; c.font = 'bold 15px Arial'
    c.fillText('OMC CM14 — YAOUNDÉ 2025', 20, 28)
    c.fillStyle = '#93c5fd'; c.font = '10px Arial'
    c.fillText("BADGE D'ACCÈS OFFICIEL — CONFÉRENCE MINISTÉRIELLE N°14", 20, 48)
    c.fillStyle = '#ffffff'; c.fillRect(W - 90, 16, 72, 30)
    c.fillStyle = '#1e40af'; c.font = 'bold 13px Arial'
    c.textAlign = 'center'; c.fillText(selected.categorie, W - 54, 36); c.textAlign = 'left'
    const qrSize = 210, qrX = W - qrSize - 24, qrY = 80
    c.fillStyle = '#ffffff'; c.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
    c.drawImage(qrEl, qrX, qrY, qrSize, qrSize)
    c.fillStyle = '#64748b'; c.font = '10px monospace'
    c.textAlign = 'center'; c.fillText(selected.id, qrX + qrSize / 2, qrY + qrSize + 20); c.textAlign = 'left'
    c.fillStyle = '#cbd5e1'; c.font = 'bold 22px Arial'
    c.fillText(selected.prenom, 24, 108)
    c.fillStyle = '#ffffff'; c.font = 'bold 30px Arial'
    c.fillText(selected.nom.toUpperCase(), 24, 148)
    c.fillStyle = '#94a3b8'; c.font = '15px Arial'
    c.fillText(selected.delegation, 24, 178)
    c.fillStyle = '#334155'; c.fillRect(24, 195, 200, 1)
    let zx = 24
    selected.zones.forEach(z => {
      c.font = 'bold 11px Arial'
      const tw = c.measureText(z).width + 18
      c.fillStyle = '#1e40af'; c.fillRect(zx, 208, tw, 22)
      c.fillStyle = '#ffffff'; c.fillText(z, zx + 9, 224)
      zx += tw + 6
    })
    c.fillStyle = '#475569'; c.font = '11px Arial'
    c.fillText(`Exp : ${selected.dateExpiration}`, 24, 260)
    c.fillStyle = '#0f172a'; c.fillRect(0, H - 36, W, 36)
    c.fillStyle = '#334155'; c.font = '10px Arial'
    c.fillText("AUTH-BADGE CM14 — Système de contrôle d'accès OMC", 20, H - 14)
    return cv
  }, [selected])

  const downloadBadge = useCallback(() => {
    const cv = buildBadgeCanvas()
    if (!cv || !selected) return
    const link = document.createElement('a')
    link.download = `badge_${selected.id}_${selected.nom}.png`
    link.href = cv.toDataURL('image/png')
    link.click()
  }, [buildBadgeCanvas, selected])

  const openEdit = () => {
    setFormData({
      prenom:         selected.prenom,
      nom:            selected.nom,
      delegation:     selected.delegation,
      categorie:      selected.categorie,
      zones:          [...selected.zones],
      dateExpiration: selected.dateExpiration ?? '',
    })
    setFormMode('edit')
    setModal('form')
  }

  const handleZoneToggle = (zid) => {
    setFormData(prev => ({
      ...prev,
      zones: prev.zones.includes(zid)
        ? prev.zones.filter(z => z !== zid)
        : [...prev.zones, zid],
    }))
  }

  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (!formData.prenom.trim() || !formData.nom.trim() || formData.zones.length === 0) return
    setFormLoading(true)

    const payload = {
      prenom:          formData.prenom.trim(),
      nom:             formData.nom.trim(),
      delegation:      formData.delegation.trim(),
      categorie:       formData.categorie,
      zones:           formData.zones,
      date_expiration: formData.dateExpiration || null,
    }

    if (formMode === 'create') {
      const created = await api.post('/api/participants', payload).catch(() => null)
      if (created) setParticipants(prev => [...prev, mapParticipant(created)])
    } else {
      await api.patch(`/api/participants/${selectedId}`, payload).catch(() => {})
      setParticipants(prev => prev.map(p =>
        p.id === selectedId ? { ...p, ...payload, zones: formData.zones, dateExpiration: formData.dateExpiration || p.dateExpiration } : p
      ))
    }

    setFormLoading(false)
    setModal(formMode === 'edit' ? 'detail' : null)
    setSelectedId(formMode === 'edit' ? selectedId : null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('participants.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('participants.subtitle')}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg shadow-primary/20 transition-colors shrink-0">
          <span className="material-symbols-outlined text-lg">person_add</span>
          {t('participants.action.new')}
        </button>
      </div>

      <div>
        {/* ── Liste ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Filtres */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                {t('participants.list.title')}
              </h3>
              <span className="text-xs text-slate-400">
                {t('participants.list.count', { n: filtered.length, total: participants.length })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder={t('participants.list.search')} />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{t('participants.filter.all_cat')}</option>
                {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{t('participants.filter.all_status')}</option>
                <option value="actif">{t('common.status.active')}</option>
                <option value="révoqué">{t('common.status.revoked')}</option>
                <option value="suspendu">{t('common.status.suspended')}</option>
              </select>
            </div>
          </div>

          {/* Tableau scrollable */}
          <div className="overflow-auto max-h-[400px] sm:max-h-[500px] lg:max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">ID</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('participants.col.name')}</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">{t('common.label.delegation')}</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">{t('common.label.category')}</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.label.status')}</th>
                  <th className="text-left px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">{t('participants.col.expiration')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12">
                    <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">{t('common.no_results')}</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}
                    onClick={() => { setSelectedId(p.id); setModal('detail') }}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 sm:px-6 py-3 font-mono text-xs text-slate-400 hidden sm:table-cell">{p.id}</td>
                    <td className="px-3 sm:px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {p.prenom[0]}{p.nom[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-white truncate text-xs sm:text-sm">{p.prenom} {p.nom}</p>
                          <p className="text-xs text-slate-400 truncate md:hidden">{p.delegation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-slate-600 dark:text-slate-400 text-sm hidden md:table-cell">{p.delegation}</td>
                    <td className="px-3 sm:px-6 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${getCategoryColor(p.categorie)}`}>{p.categorie}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatutColor(p.statut)}`}>{p.statut}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">{p.dateExpiration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modale détail ── */}
      {modal === 'detail' && selected && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) { setSelectedId(null); setModal(null) } }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full sm:max-w-md flex flex-col max-h-[92dvh] sm:max-h-[88vh]">

            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <div className="px-6 pt-4 sm:pt-6 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('participants.detail.title')}</h3>
                <button onClick={() => { setSelectedId(null); setModal(null) }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                  {selected.prenom[0]}{selected.nom[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{selected.prenom} {selected.nom}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selected.delegation}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${getCategoryColor(selected.categorie)}`}>{selected.categorie}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatutColor(selected.statut)}`}>{selected.statut}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-2 overflow-y-auto flex-1 border-t border-slate-100 dark:border-slate-800">
              {[
                { label: t('participants.detail.id'),         value: selected.id,            mono: true },
                { label: t('participants.detail.firstname'),  value: selected.prenom },
                { label: t('participants.detail.lastname'),   value: selected.nom },
                { label: t('participants.detail.delegation'), value: selected.delegation },
                { label: t('participants.detail.category'),   value: selected.categorie },
                { label: t('participants.detail.status'),     value: selected.statut },
                { label: t('participants.detail.expiration'), value: selected.dateExpiration },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 mr-4">{label}</span>
                  <span className={`text-sm font-semibold text-slate-800 dark:text-white text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}

              <div className="py-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('participants.detail.zones')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.zones.map(zid => {
                    const zone = zones.find(z => z.id === zid)
                    return (
                      <span key={zid} title={zone?.nom}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                        {zid} — {zone?.nom ?? zid}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
              {/* Actions badge */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={openBadge}
                  className="flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-base">qr_code_2</span>
                  {t('participants.action.view_badge')}
                </button>
                <button
                  onClick={() => navigate('/admin/badges', { state: { participantId: selected.id } })}
                  className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <span className="material-symbols-outlined text-base">badge</span>
                  {t('participants.action.generate_badge')}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={openEdit}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <span className="material-symbols-outlined text-base">edit</span>
                  {t('participants.action.edit')}
                </button>
                {selected.statut === 'actif' && (
                  <button onClick={() => setModal('revoke')}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-amber-100 transition-colors">
                    <span className="material-symbols-outlined text-base">block</span>
                    {t('participants.action.revoke')}
                  </button>
                )}
                <button onClick={() => setModal('delete')}
                  className="flex items-center justify-center gap-1 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-red-100 transition-colors">
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale formulaire (création / édition) ── */}
      {modal === 'form' && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(formMode === 'edit' ? 'detail' : null) }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full sm:max-w-md flex flex-col max-h-[92dvh] sm:max-h-[90vh]">

            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <div className="px-6 pt-4 sm:pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {formMode === 'create' ? t('participants.form.title_create') : t('participants.form.title_edit')}
              </h3>
              <button onClick={() => setModal(formMode === 'edit' ? 'detail' : null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('participants.form.firstname')} *</label>
                    <input required value={formData.prenom} onChange={e => setFormData(p => ({ ...p, prenom: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('participants.form.lastname')} *</label>
                    <input required value={formData.nom} onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('participants.form.delegation')}</label>
                  <input value={formData.delegation} onChange={e => setFormData(p => ({ ...p, delegation: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('participants.form.category')}</label>
                  <select value={formData.categorie} onChange={e => setFormData(p => ({ ...p, categorie: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">{t('participants.form.zones')} *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {zones.map(z => (
                      <label key={z.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.zones.includes(z.id)
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}>
                        <input type="checkbox" checked={formData.zones.includes(z.id)} onChange={() => handleZoneToggle(z.id)} className="accent-primary" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{z.id}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{z.nom}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('participants.form.expiration')}</label>
                  <input type="date" value={formData.dateExpiration} onChange={e => setFormData(p => ({ ...p, dateExpiration: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <p className="text-[10px] text-slate-400 mt-1">{t('participants.form.expiration_hint')}</p>
                </div>

              </div>

              <div className="px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
                <button type="button" onClick={() => setModal(formMode === 'edit' ? 'detail' : null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {t('common.btn.cancel')}
                </button>
                <button type="submit" disabled={formLoading || formData.zones.length === 0}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {formLoading ? '…' : t('participants.form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal badge QR ── */}
      {modal === 'badge' && selected && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal('detail') }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xs">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">{t('participants.badge_modal.title')}</h3>
              <button onClick={() => setModal('detail')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-5 py-5 flex flex-col items-center gap-4">
              <div ref={qrRef} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                {badgeQrValue
                  ? <QRCodeCanvas value={badgeQrValue} size={200} level="M" />
                  : <div className="w-[200px] h-[200px] flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
                    </div>
                }
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 dark:text-white">{selected.prenom} {selected.nom}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selected.delegation} · <span className={`font-bold px-1.5 py-0.5 rounded ${getCategoryColor(selected.categorie)}`}>{selected.categorie}</span></p>
                <p className="text-xs text-slate-400 font-mono mt-1">{selected.id}</p>
              </div>
              <button onClick={downloadBadge} disabled={!badgeQrValue}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-40">
                <span className="material-symbols-outlined text-base">download</span>
                {t('participants.badge_modal.download')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal révocation ── */}
      {modal === 'revoke' && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <span className="material-symbols-outlined text-amber-600">block</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('participants.modal.revoke.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t('participants.modal.revoke.desc', { name: `${selected.prenom} ${selected.nom}` })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal('detail')}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                {t('common.btn.cancel')}
              </button>
              <button onClick={handleRevoke}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">
                {t('participants.action.revoke')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression ── */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <span className="material-symbols-outlined text-red-600">delete_forever</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('participants.modal.delete.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t('participants.modal.delete.desc', { name: `${selected.prenom} ${selected.nom}` })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal('detail')}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                {t('common.btn.cancel')}
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                {t('participants.action.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

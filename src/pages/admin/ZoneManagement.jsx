import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ZONES, PARTICIPANTS } from '../../data/mockData'
import { api } from '../../utils/api'

const IS_MOCK = !import.meta.env.VITE_API_URL

const EMPTY_FORM = { id: '', nom: '', description: '', statut: 'actif', niveauAcces: 1 }

// Color scheme per access level (1→5 : public → ultra-restricted)
const LEVEL_COLORS = [
  { strip: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400' },
  { strip: 'bg-blue-500',    light: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-700 dark:text-blue-400'       },
  { strip: 'bg-indigo-600',  light: 'bg-indigo-50 dark:bg-indigo-900/20',   border: 'border-indigo-200 dark:border-indigo-800',   text: 'text-indigo-700 dark:text-indigo-400'   },
  { strip: 'bg-orange-500',  light: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-800',   text: 'text-orange-700 dark:text-orange-400'   },
  { strip: 'bg-red-600',     light: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-800',         text: 'text-red-700 dark:text-red-400'         },
]

const getLvl = (n) => LEVEL_COLORS[Math.min(Math.max((n ?? 1) - 1, 0), 4)]

export default function ZoneManagement() {
  const { t } = useTranslation()

  const [zones,    setZones]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null) // null | 'form' | 'delete'
  const [editing,  setEditing]  = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    if (IS_MOCK) {
      setZones(ZONES.map((z, i) => ({ ...z, statut: 'actif', niveauAcces: z.niveauAcces ?? i + 1 })))
      setLoading(false)
      return
    }
    api.get('/api/zones')
      .then(rows => setZones(rows.map(z => ({
        ...z,
        niveauAcces: z.niveau_acces ?? 1,
        statut: 'actif',
      }))))
      .catch(() => setZones(ZONES.map((z, i) => ({ ...z, statut: 'actif', niveauAcces: i + 1 }))))
      .finally(() => setLoading(false))
  }, [])

  // Compteur participants par zone (mockData en mode mock, valeur backend sinon)
  const pCount = (zid) => IS_MOCK
    ? PARTICIPANTS.filter(p => p.statut === 'actif' && p.zones.includes(zid)).length
    : (zones.find(z => z.id === zid)?.portes_count ?? 0)

  const filtered = zones.filter(z =>
    !search ||
    z.id.toLowerCase().includes(search.toLowerCase()) ||
    z.nom.toLowerCase().includes(search.toLowerCase()) ||
    z.description.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:    zones.length,
    actives:  zones.filter(z => z.statut === 'actif').length,
    assigned: zones.reduce((acc, z) => acc + pCount(z.id), 0),
  }

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal('form') }
  const openEdit = (z) => {
    setForm({ id: z.id, nom: z.nom, description: z.description, statut: z.statut, niveauAcces: z.niveauAcces })
    setEditing(z)
    setModal('form')
  }
  const openDel    = (z) => { setDeleting(z); setModal('delete') }
  const closeModal = () => { setModal(null); setEditing(null); setDeleting(null) }

  const handleSave = async () => {
    if (!form.id.trim() || !form.nom.trim()) return
    setSaving(true)
    setApiError(null)
    try {
      if (editing) {
        const updated = IS_MOCK ? { ...editing, ...form } : await api.patch(`/api/zones/${editing.id}`, {
          nom: form.nom.trim(), description: form.description.trim() || null, niveau_acces: form.niveauAcces,
        })
        setZones(prev => prev.map(z => z.id === editing.id
          ? { ...z, nom: form.nom, description: form.description, niveauAcces: form.niveauAcces }
          : z
        ))
      } else {
        const payload = { id: form.id.trim().toUpperCase(), nom: form.nom.trim(), description: form.description.trim() || null, niveau_acces: form.niveauAcces }
        const created = IS_MOCK ? { ...payload, niveauAcces: payload.niveau_acces, statut: 'actif' } : await api.post('/api/zones', payload)
        setZones(prev => [...prev, { ...created, niveauAcces: created.niveau_acces ?? form.niveauAcces, statut: 'actif' }])
      }
      closeModal()
    } catch (err) {
      setApiError(err.status === 409 ? 'Cet identifiant de zone existe déjà.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setApiError(null)
    try {
      if (!IS_MOCK) await api.delete(`/api/zones/${deleting.id}`)
      setZones(prev => prev.filter(z => z.id !== deleting.id))
      closeModal()
    } catch (err) {
      setApiError(err.status === 409
        ? 'Impossible de supprimer : des portes utilisent encore cette zone.'
        : err.message)
    }
  }

  const handleToggle = async (zid) => {
    const zone = zones.find(z => z.id === zid)
    if (!zone) return
    const newStatut = zone.statut === 'actif' ? 'inactif' : 'actif'
    setZones(prev => prev.map(z => z.id === zid ? { ...z, statut: newStatut } : z))
    // Note: le backend ne gère pas encore le statut actif/inactif sur les zones —
    // c'est un état UI local en attendant l'extension du schéma
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-bg-dark p-4 md:p-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
            {t('zones.system_label')}
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {t('zones.title')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">
            {t('zones.subtitle')}
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-primary/20 shrink-0">
          <span className="material-symbols-outlined text-xl">add_location_alt</span>
          {t('zones.add_btn')}
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('zones.kpi.total'),        value: stats.total,    icon: 'layers',   color: 'text-primary dark:text-blue-400',       bg: 'bg-primary/10 dark:bg-primary/20'       },
          { label: t('zones.kpi.participants'),  value: stats.assigned, icon: 'group',    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20'   },
          { label: t('zones.kpi.active'),        value: stats.actives,  icon: 'verified', color: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-900/20'     },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
            <div className={`${kpi.bg} p-3 rounded-xl shrink-0`}>
              <span className={`material-symbols-outlined text-xl ${kpi.color}`}>{kpi.icon}</span>
            </div>
            <div>
              <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('zones.search_placeholder')}
          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700 dark:text-slate-300 placeholder-slate-400 shadow-sm"/>
      </div>

      {/* ── Cards grid ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-600 text-sm">
          {t('zones.not_found')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(z => {
            const lvl   = getLvl(z.niveauAcces)
            const count = pCount(z.id)
            const isActive = z.statut === 'actif'

            return (
              <div key={z.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${isActive ? lvl.border : 'border-slate-200 dark:border-slate-700'} shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md`}>

                {/* Card header */}
                <div className={`${isActive ? lvl.light : 'bg-slate-50 dark:bg-slate-800/50'} px-5 pt-5 pb-4 flex items-start justify-between gap-3`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`${isActive ? lvl.strip : 'bg-slate-400'} text-white text-sm font-black px-3 py-2 rounded-xl shadow-sm shrink-0 min-w-[3.25rem] text-center leading-none flex items-center justify-center`}>
                      {z.id}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight truncate">{z.nom}</h3>
                      <p className={`text-xs font-semibold mt-1 ${isActive ? lvl.text : 'text-slate-400'}`}>
                        Niv. {z.niveauAcces} — {t(`zones.level_${z.niveauAcces}`)}
                      </p>
                    </div>
                  </div>

                  {/* Status toggle — état UI local, non persisté en base */}
                  <button onClick={() => handleToggle(z.id)}
                    title={t('zones.card.toggle_note', 'État local — non sauvegardé')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors shrink-0 ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {isActive ? t('zones.card.active') : t('zones.card.inactive')}
                  </button>
                </div>

                {/* Description */}
                <div className="px-5 py-3.5 flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {z.description || <span className="italic text-slate-300 dark:text-slate-600">—</span>}
                  </p>
                </div>

                {/* Stats */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-5">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{count}</span>
                    <span className="text-xs">{t('zones.card.participants')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 ml-auto">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span className="text-xs font-semibold">{t('zones.card.level')} {z.niveauAcces}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
                  <button onClick={() => openEdit(z)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    {t('zones.btn.edit')}
                  </button>
                  <div className="w-px h-5 bg-slate-100 dark:bg-slate-800 shrink-0"></div>
                  <button onClick={() => openDel(z)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    {t('zones.btn.delete')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal === 'form' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? t('zones.modal.edit_title') : t('zones.modal.add_title')}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">

              {/* Zone ID */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('zones.modal.field_id')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">tag</span>
                  <input
                    type="text"
                    value={form.id}
                    onChange={e => !editing && setForm(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                    readOnly={!!editing}
                    placeholder="Z6"
                    className={`w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 font-mono ${editing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              {/* Nom */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('zones.modal.field_name')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">layers</span>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex: Zone délégués"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('zones.modal.field_desc')}</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Réservée aux délégués officiels"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 resize-none"
                />
              </div>

              {/* Niveau d'accès */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('zones.modal.field_level')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(n => {
                    const cfg = getLvl(n)
                    const active = form.niveauAcces === n
                    return (
                      <button key={n} type="button"
                        onClick={() => setForm(p => ({ ...p, niveauAcces: n }))}
                        className={`py-2 rounded-xl text-sm font-bold transition-all ${
                          active
                            ? `${cfg.strip} text-white shadow-sm scale-105`
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}>
                        {n}
                      </button>
                    )
                  })}
                </div>
                <p className={`text-xs font-semibold ${getLvl(form.niveauAcces).text}`}>
                  {t(`zones.level_${form.niveauAcces}`)}
                </p>
              </div>

              {/* Statut toggle */}
              <div className="flex items-center justify-between py-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('zones.modal.field_status')}</label>
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, statut: p.statut === 'actif' ? 'inactif' : 'actif' }))}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${form.statut === 'actif' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.statut === 'actif' ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {apiError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                {apiError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                {t('common.btn.cancel')}
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2">
                {saving && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                {editing ? t('zones.modal.btn_save') : t('zones.modal.btn_create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {modal === 'delete' && deleting && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">wrong_location</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('zones.delete.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('zones.delete.desc', { id: deleting.id, name: deleting.nom })}
            </p>
            {apiError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                {apiError}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                {t('common.btn.cancel')}
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                {t('zones.delete.btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

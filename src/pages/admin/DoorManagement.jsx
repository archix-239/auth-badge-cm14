import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { POINTS_CONTROLE, ZONES } from '../../data/mockData'
import { api } from '../../utils/api'

const IS_MOCK = !import.meta.env.VITE_API_URL

const EMPTY_FORM = { id: '', nom: '', zone_id: '' }

export default function DoorManagement() {
  const { t } = useTranslation()
  const [doors, setDoors]       = useState([])
  const [zones, setZones]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // null | 'add' | 'edit' | 'delete'
  const [editing, setEditing]   = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  useEffect(() => {
    if (IS_MOCK) {
      setDoors(POINTS_CONTROLE)
      setZones(ZONES)
      setLoading(false)
      return
    }
    Promise.all([
      api.get('/api/terminals').catch(() => POINTS_CONTROLE),
      api.get('/api/zones').catch(() => ZONES),
    ]).then(([rows, zoneRows]) => {
      setDoors(rows)
      setZones(zoneRows)
    }).finally(() => setLoading(false))
  }, [])

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal('add') }
  const openEdit = (d) => { setForm({ id: d.id, nom: d.nom, zone_id: d.zone_id ?? '' }); setEditing(d); setModal('edit') }
  const openDel  = (d) => { setDeleting(d); setModal('delete') }
  const closeModal = () => { setModal(null); setEditing(null); setDeleting(null) }

  const handleSave = async () => {
    if (!form.id.trim() || !form.nom.trim()) return
    const payload = { id: form.id.trim(), nom: form.nom.trim(), zone_id: form.zone_id || null }
    if (modal === 'add') {
      if (!IS_MOCK) {
        try {
          const created = await api.post('/api/terminals', payload)
          setDoors(prev => [...prev, created])
        } catch (err) {
          console.error('[doors/create]', err)
        }
      } else {
        setDoors(prev => [...prev, { ...payload, agentId: null, statut: 'actif', scans: 0 }])
      }
    } else {
      if (!IS_MOCK) {
        await api.patch(`/api/terminals/${editing.id}`, { nom: form.nom.trim(), zone_id: form.zone_id || null }).catch(() => {})
      }
      setDoors(prev => prev.map(d => d.id === editing.id ? { ...d, nom: form.nom.trim(), zone_id: form.zone_id || null } : d))
    }
    closeModal()
  }

  const handleDelete = async () => {
    if (!IS_MOCK) {
      try {
        // /decommission envoie l'événement socket terminal:decommissioned + révoque les tokens
        await api.post(`/api/terminals/${deleting.id}/decommission`)
      } catch (err) {
        console.error('[doors/decommission]', err)
      }
    }
    setDoors(prev => prev.filter(d => d.id !== deleting.id))
    closeModal()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{t('doors.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('doors.subtitle')}</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-primary/20 shrink-0">
          <span className="material-symbols-outlined text-xl">add</span>
          {t('doors.add_btn')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800">
              <tr>
                {[t('doors.col.id'), t('doors.col.name'), t('doors.col.zone'), t('doors.col.agent'), t('doors.col.status'), t('doors.col.scans'), t('doors.col.actions')].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
                </td></tr>
              ) : doors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">{t('doors.not_found')}</td></tr>
              ) : doors.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{d.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{d.nom}</td>
                  <td className="px-6 py-4">
                    {d.zone_id ? (
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                        {d.zone_id}{d.zone_nom ? ` — ${d.zone_nom}` : ''}
                      </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{d.agentId ?? d.agent_name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      d.statut === 'actif' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : d.statut === 'alerte' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>{d.statut ?? '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{d.scans ?? 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(d)} title={t('common.btn.save')}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button onClick={() => openDel(d)} title={t('doors.delete.btn')}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {modal === 'add' ? t('doors.modal.add_title') : t('doors.modal.edit_title')}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('doors.modal.field_id')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">tag</span>
                  <input
                    type="text"
                    value={form.id}
                    onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                    placeholder="Ex: PC-05"
                    disabled={modal === 'edit'}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('doors.modal.field_name')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">door_front</span>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex: Entrée Nord"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('doors.modal.field_zone')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">layers</span>
                  <select
                    value={form.zone_id}
                    onChange={e => setForm(p => ({ ...p, zone_id: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                  >
                    <option value="">{t('doors.modal.zone_none')}</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.id} — {z.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                {t('common.btn.cancel')}
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors shadow-sm">
                {modal === 'add' ? t('common.btn.confirm') : t('common.btn.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {modal === 'delete' && deleting && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">delete_forever</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('doors.delete.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('doors.delete.desc', { id: deleting.id, name: deleting.nom })}
            </p>
            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                {t('common.btn.cancel')}
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                {t('doors.delete.btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

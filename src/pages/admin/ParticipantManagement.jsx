import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PARTICIPANTS, ZONES, CATEGORIES, getCategoryColor, getStatutColor } from '../../data/mockData'
import { api } from '../../utils/api'
import { mapParticipant } from '../../utils/dataMappers'

const IS_MOCK = !import.meta.env.VITE_API_URL

export default function ParticipantManagement() {
  const { t } = useTranslation()
  const [participants, setParticipants] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [selectedId, setSelectedId]     = useState(null)
  const [modal, setModal]               = useState(null)

  useEffect(() => {
    if (IS_MOCK) {
      setParticipants(PARTICIPANTS)
      setLoading(false)
      return
    }
    api.get('/api/participants')
      .then(rows => setParticipants(rows.map(mapParticipant)))
      .catch(() => setParticipants(PARTICIPANTS))
      .finally(() => setLoading(false))
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

  const handleRevoke = async () => {
    if (!IS_MOCK) {
      await api.patch(`/api/participants/${selectedId}`, { statut: 'révoqué' }).catch(() => {})
    }
    setParticipants(prev => prev.map(p => p.id === selectedId ? { ...p, statut: 'révoqué' } : p))
    setModal('detail')
  }

  const handleDelete = async () => {
    if (!IS_MOCK) {
      await api.delete(`/api/participants/${selectedId}`).catch(() => {})
    }
    setParticipants(prev => prev.filter(p => p.id !== selectedId))
    setSelectedId(null)
    setModal(null)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('participants.title')}</h2>
        <p className="text-slate-500 text-sm mt-1">{t('participants.subtitle')}</p>
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

            {/* Drag handle — mobile only */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* En-tête fixe */}
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

            {/* Informations scrollables */}
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

              {/* Zones */}
              <div className="py-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('participants.detail.zones')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.zones.map(zid => {
                    const zone = ZONES.find(z => z.id === zid)
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

            {/* Actions fixées en bas */}
            <div className="px-4 sm:px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0">
              {selected.statut === 'actif' && (
                <button onClick={() => setModal('revoke')}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg py-3 sm:py-2.5 text-sm font-semibold hover:bg-amber-100 transition-colors">
                  <span className="material-symbols-outlined text-base">block</span>
                  {t('participants.action.revoke')}
                </button>
              )}
              <button onClick={() => setModal('delete')}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg py-3 sm:py-2.5 text-sm font-semibold hover:bg-red-100 transition-colors">
                <span className="material-symbols-outlined text-base">delete</span>
                {t('participants.action.delete')}
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

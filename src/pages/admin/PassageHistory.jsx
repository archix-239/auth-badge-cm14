import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LOGS, getResultConfig, getCategoryColor, formatDateTime } from '../../data/mockData'

const RESULT_OPTIONS = ['Tous', 'autorisé', 'révoqué', 'zone-refusée', 'inconnu']
const ZONE_OPTIONS   = ['Toutes', 'Entrée Nord', 'Entrée Est', 'Entrée Sud', 'Accueil VIP', 'Salle Plénière']

export default function PassageHistory() {
  const { t } = useTranslation()
  const [search, setSearch]     = useState('')
  const [resFilter, setRes]     = useState('Tous')
  const [zoneFilter, setZone]   = useState('Toutes')
  const [sortDesc, setSortDesc] = useState(true)

  const filtered = LOGS
    .filter(l => {
      const matchSearch = !search ||
        l.nom.toLowerCase().includes(search.toLowerCase()) ||
        l.delegation.toLowerCase().includes(search.toLowerCase()) ||
        l.zone.toLowerCase().includes(search.toLowerCase())
      const matchRes  = resFilter === 'Tous' || l.resultat === resFilter
      const matchZone = zoneFilter === 'Toutes' || l.zone === zoneFilter
      return matchSearch && matchRes && matchZone
    })
    .sort((a, b) => sortDesc
      ? new Date(b.timestamp) - new Date(a.timestamp)
      : new Date(a.timestamp) - new Date(b.timestamp)
    )

  const exportCSV = () => {
    const headers = ['ID','Nom','Délégation','Catégorie','Zone','Point de contrôle','Résultat','Agent','Horodatage']
    const rows    = filtered.map(l => [l.id,l.nom,l.delegation,l.categorie,l.zone,l.pointControle,l.resultat,l.agentId,formatDateTime(l.timestamp)])
    const csv     = [headers,...rows].map(r => r.join(',')).join('\n')
    const blob    = new Blob([csv], { type: 'text/csv' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = `cm14_passages_${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const eventsLabel = filtered.length === 1
    ? t('passages.events_one',   { count: filtered.length })
    : t('passages.events_other', { count: filtered.length })

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-bg-dark p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('passages.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{eventsLabel}</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-primary/20 shrink-0">
          <span className="material-symbols-outlined text-lg">download</span>
          {t('common.btn.export_csv')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400"
              placeholder={t('passages.filter.search')} />
          </div>
          {[[resFilter, setRes, RESULT_OPTIONS], [zoneFilter, setZone, ZONE_OPTIONS]].map(([val, setter, opts], i) => (
            <select key={i} value={val} onChange={e => setter(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('passages.table.participant')}</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('passages.table.delegation')}</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('passages.table.category')}</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('passages.table.zone')}</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('passages.table.result')}</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('passages.table.agent')}</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  <button onClick={() => setSortDesc(!sortDesc)}
                    className="flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {t('passages.table.timestamp')}
                    <span className="material-symbols-outlined text-sm">{sortDesc ? 'arrow_downward' : 'arrow_upward'}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">{t('passages.table.empty')}</td></tr>
              )}
              {filtered.map(log => {
                const cfg = getResultConfig(log.resultat)
                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {log.nom.split(' ').map(n => n[0]).join('').slice(0,2)}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{log.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{log.delegation}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getCategoryColor(log.categorie)}`}>{log.categorie}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{log.zone}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.light}`}>{log.resultat}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 text-xs font-mono">{log.agentId}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

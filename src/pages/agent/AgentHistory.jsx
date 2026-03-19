import { useState } from 'react'
import { LOGS, getResultConfig, formatDateTime, getCategoryColor } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'

const TIME_FILTERS   = ["Aujourd'hui", 'Cette semaine', 'Ce mois']
const RESULT_FILTERS = ['Tous', 'Autorisé', 'Alertes']

export default function AgentHistory() {
  const { user } = useAuth()
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState("Aujourd'hui")
  const [resultF, setResultF] = useState('Tous')
  const [selected, setSelected] = useState(null)

  const allLogs = LOGS.filter(l => l.agentId === user?.id)
  const filtered = allLogs.filter(log => {
    const matchSearch = !search ||
      log.nom.toLowerCase().includes(search.toLowerCase()) ||
      log.delegation.toLowerCase().includes(search.toLowerCase())
    const matchResult =
      resultF === 'Tous'     ? true :
      resultF === 'Autorisé' ? log.resultat === 'autorisé' :
      ['révoqué','inconnu','zone-refusée'].includes(log.resultat)
    return matchSearch && matchResult
  })

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-bg-dark">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-slate-100/90 dark:bg-bg-dark/90 backdrop-blur-md pt-2">
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex w-full items-stretch rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 h-12">
            <div className="text-slate-400 flex items-center justify-center pl-4">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="flex w-full border-none bg-transparent focus:outline-none text-sm px-3 text-slate-900 dark:text-white placeholder-slate-400"
              placeholder="Rechercher un participant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Time chips */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {TIME_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
                filter === f ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Result chips */}
        <div className="flex gap-2 px-4 pb-3 items-center overflow-x-auto no-scrollbar">
          {RESULT_FILTERS.map(f => (
            <button key={f} onClick={() => setResultF(f)}
              className={`flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold transition-colors ${
                resultF === f ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
              {f}
            </button>
          ))}
          <span className="ml-auto shrink-0 text-xs text-slate-400 dark:text-slate-500 font-medium">
            {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 pb-4 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
            <p className="text-sm font-medium">Aucun résultat</p>
          </div>
        )}
        {filtered.map(log => {
          const cfg = getResultConfig(log.resultat)
          const isOpen = selected?.id === log.id
          return (
            <button key={log.id}
              onClick={() => setSelected(isOpen ? null : log)}
              className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden text-left transition-all hover:shadow-md">
              <div className="flex items-center gap-4 p-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg} shadow-sm`}>
                  <span className="material-symbols-outlined text-white text-lg">{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{log.nom}</p>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${cfg.light}`}>{log.resultat}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.delegation} · {log.zone}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-lg">
                  {isOpen ? 'expand_less' : 'expand_more'}
                </span>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-50 dark:border-slate-800 pt-3 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Délégation', value: log.delegation },
                    { label: 'Catégorie', value: log.categorie, badge: true },
                    { label: 'Point de contrôle', value: log.pointControle },
                    { label: 'Horodatage', value: formatDateTime(log.timestamp), mono: true },
                    { label: 'ID événement', value: log.id, mono: true, full: true },
                  ].map(item => (
                    <div key={item.label} className={item.full ? 'col-span-2' : ''}>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-semibold uppercase tracking-wider">{item.label}</p>
                      {item.badge
                        ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCategoryColor(item.value)}`}>{item.value}</span>
                        : <p className={`text-sm font-semibold text-slate-800 dark:text-slate-200 ${item.mono ? 'font-mono text-xs' : ''}`}>{item.value}</p>
                      }
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

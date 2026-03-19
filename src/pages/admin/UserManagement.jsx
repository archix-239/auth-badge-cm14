import { useState } from 'react'
import { USERS as INITIAL_USERS } from '../../data/mockData'

const ALL_ROLES   = ['Tous les rôles', 'admin', 'supervisor', 'agent']
const ALL_STATUTS = ['Tous les statuts', 'EN LIGNE', 'HORS LIGNE', 'BLOQUÉ']
const ALL_ZONES   = ['Toutes les zones', 'Entrée Nord', 'Entrée Est', 'Accueil VIP', 'Salle Plénière', 'QG Central']

// Extend mock users with extra display fields
const MOCK_USERS = [
  { id: 'CM14-8842', name: 'Jean Dupont',       role: 'admin',      zone: 'QG Central — Niveau 4',         statut: 'EN LIGNE',   password: 'Admin@CM14!',  loginId: 'ADMIN-001' },
  { id: 'CM14-2291', name: 'Marie Claire Owono', role: 'supervisor', zone: 'Secteur Alpha — Porte 12',      statut: 'HORS LIGNE', password: 'Super@CM14!',  loginId: 'SUPER-001' },
  { id: 'CM14-4092', name: 'Alima Nkemba',       role: 'agent',      zone: 'Zone Nord — Patrouille B',      statut: 'EN LIGNE',   password: 'Agent@CM14!',  loginId: 'AG-8824'   },
  { id: 'CM14-9901', name: 'Bruno Essomba',       role: 'agent',      zone: 'Secteur Alpha — Accueil',       statut: 'EN LIGNE',   password: 'Agent@CM14!',  loginId: 'AG-0031'   },
  { id: 'CM14-0433', name: 'Julian Voss',         role: 'agent',      zone: 'Zone Nord — Patrouille B',      statut: 'BLOQUÉ',     password: 'Agent@CM14!',  loginId: 'AG-0433'   },
  { id: 'CM14-1122', name: 'Fatou Diallo',        role: 'agent',      zone: 'Entrée Est — Salle B',          statut: 'HORS LIGNE', password: 'Agent@CM14!',  loginId: 'AG-1122'   },
  { id: 'CM14-3310', name: 'Eric Mballa',         role: 'agent',      zone: 'Accueil VIP — Niveau 3',        statut: 'EN LIGNE',   password: 'Agent@CM14!',  loginId: 'AG-3310'   },
  { id: 'CM14-5500', name: 'Sophie Kamga',        role: 'supervisor', zone: 'Salle Plénière — Supervision',  statut: 'EN LIGNE',   password: 'Super@CM14!',  loginId: 'SUP-5500'  },
]

const EMPTY_FORM = { name: '', loginId: '', password: '', role: 'agent', zone: '', statut: 'HORS LIGNE' }

const ROLE_BADGE = {
  admin:      'bg-primary text-white',
  supervisor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  agent:      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

const STATUT_BADGE = {
  'EN LIGNE':   'text-emerald-600 dark:text-emerald-400',
  'HORS LIGNE': 'text-slate-400',
  'BLOQUÉ':     'text-red-500',
}

export default function UserManagement() {
  const [users, setUsers]         = useState(MOCK_USERS)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleF]    = useState('Tous les rôles')
  const [statutFilter, setStatF]  = useState('Tous les statuts')
  const [zoneFilter, setZoneF]    = useState('Toutes les zones')
  const [page, setPage]           = useState(1)
  const [modal, setModal]         = useState(null) // null | 'add' | 'edit' | 'delete'
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [showPwd, setShowPwd]     = useState(false)
  const PER_PAGE = 8

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.loginId.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    const matchRole   = roleFilter === 'Tous les rôles' || u.role === roleFilter
    const matchStatut = statutFilter === 'Tous les statuts' || u.statut === statutFilter
    const matchZone   = zoneFilter === 'Toutes les zones' || u.zone.includes(zoneFilter.replace('Toutes les zones',''))
    return matchSearch && matchRole && matchStatut && matchZone
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal('add') }
  const openEdit = (u) => { setForm({ name: u.name, loginId: u.loginId, password: u.password, role: u.role, zone: u.zone, statut: u.statut }); setEditing(u); setModal('edit') }
  const openDel  = (u) => { setEditing(u); setModal('delete') }
  const closeModal = () => { setModal(null); setEditing(null); setShowPwd(false) }

  const handleSave = () => {
    if (!form.name || !form.loginId) return
    if (modal === 'add') {
      const newUser = { ...form, id: `CM14-${Math.floor(Math.random() * 9000 + 1000)}` }
      setUsers(prev => [newUser, ...prev])
    } else {
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u))
    }
    closeModal()
  }

  const handleDelete = () => {
    setUsers(prev => prev.filter(u => u.id !== editing.id))
    closeModal()
  }

  const handleBlock = (userId) => {
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, statut: u.statut === 'BLOQUÉ' ? 'HORS LIGNE' : 'BLOQUÉ' }
      : u
    ))
  }

  const stats = {
    actifs:  users.filter(u => u.statut === 'EN LIGNE').length,
    alertes: users.filter(u => u.statut === 'BLOQUÉ').length,
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-bg-dark p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Administration Système</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Gestion des Utilisateurs</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">
            Supervision des accès souverains et contrôle granulaire des privilèges agents sur le périmètre CM14.
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-primary/20 shrink-0">
          <span className="material-symbols-outlined text-xl">person_add</span>
          Ajouter un utilisateur
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span className="material-symbols-outlined text-base">tune</span>
            FILTRES :
          </div>
          {[
            { value: roleFilter, setter: setRoleF, opts: ALL_ROLES },
            { value: statutFilter, setter: setStatF, opts: ALL_STATUTS },
            { value: zoneFilter, setter: setZoneF, opts: ALL_ZONES },
          ].map((f, i) => (
            <div key={i} className="relative">
              <select value={f.value} onChange={e => { f.setter(e.target.value); setPage(1) }}
                className="appearance-none pl-3 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">expand_more</span>
            </div>
          ))}
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Rechercher un matricule ou nom..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 placeholder-slate-400"/>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800">
              <tr>
                {['Utilisateur', 'Rôle', 'Point de Contrôle', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {paginated.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">Aucun utilisateur trouvé</td></tr>
              )}
              {paginated.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  {/* User */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">ID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  {/* Zone */}
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{u.zone}</td>
                  {/* Statut */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        u.statut === 'EN LIGNE' ? 'bg-emerald-500' :
                        u.statut === 'BLOQUÉ'   ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}></div>
                      <span className={`text-sm font-semibold ${STATUT_BADGE[u.statut]}`}>{u.statut}</span>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)}
                        title="Modifier"
                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button onClick={() => handleBlock(u.id)}
                        title={u.statut === 'BLOQUÉ' ? 'Débloquer' : 'Bloquer'}
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                        <span className="material-symbols-outlined text-base">{u.statut === 'BLOQUÉ' ? 'lock_open' : 'lock'}</span>
                      </button>
                      <button onClick={() => openDel(u)}
                        title="Supprimer"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <span className="material-symbols-outlined text-base">person_remove</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 gap-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
            Affichage de {Math.min(paginated.length, PER_PAGE)} sur {filtered.length} agents
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                  page === n ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Accès Actifs', value: stats.actifs, sub: `+4 depuis 24h`, color: 'text-primary dark:text-blue-400' },
          { label: 'Alertes Sécurité', value: String(stats.alertes).padStart(2, '0'), sub: stats.alertes > 0 ? 'ACTION REQUISE' : 'Aucune alerte', color: stats.alertes > 0 ? 'text-red-500' : 'text-slate-400' },
          { label: 'Dernière Sync', value: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), sub: 'Protocole AES-256', color: 'text-slate-800 dark:text-white' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-4xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className={`text-xs font-semibold mt-1 ${stats.alertes > 0 && kpi.label === 'Alertes Sécurité' ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {modal === 'add' ? 'Ajouter un utilisateur' : 'Modifier l\'utilisateur'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Nom complet', key: 'name', type: 'text', placeholder: 'Ex: Alima Nkemba', icon: 'person' },
                { label: 'Identifiant de connexion', key: 'loginId', type: 'text', placeholder: 'Ex: AG-8824', icon: 'badge' },
                { label: 'Zone / Point de contrôle', key: 'zone', type: 'text', placeholder: 'Ex: Entrée Nord', icon: 'place' },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{f.label}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{f.icon}</span>
                    <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400"/>
                  </div>
                </div>
              ))}

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mot de passe</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">key</span>
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Minimum 12 caractères"
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400"/>
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-lg">{showPwd ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Rôle</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="agent">Agent</option>
                  <option value="supervisor">Superviseur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors shadow-sm">
                {modal === 'add' ? 'Créer l\'utilisateur' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {modal === 'delete' && editing && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">person_remove</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Supprimer cet utilisateur ?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              L'utilisateur <strong className="text-slate-900 dark:text-white">{editing.name}</strong> ({editing.id}) sera supprimé définitivement du système.
            </p>
            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

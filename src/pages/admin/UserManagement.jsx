import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { POINTS_CONTROLE } from '../../data/mockData'
import { api } from '../../utils/api'
import { useSocket } from '../../hooks/useSocket'

const IS_MOCK = !import.meta.env.VITE_API_URL

const MOCK_USERS = [
  { id: 'CM14-8842', name: 'Jean Dupont',        role: 'admin',      zone: 'QG Central — Niveau 4',         statut: 'EN LIGNE',   password: 'Admin@CM14!',  loginId: 'ADMIN-001' },
  { id: 'CM14-2291', name: 'Marie Claire Owono', role: 'supervisor', zone: 'Secteur Alpha — Porte 12',      statut: 'HORS LIGNE', password: 'Super@CM14!',  loginId: 'SUPER-001' },
  { id: 'CM14-4092', name: 'Alima Nkemba',       role: 'agent',      zone: 'Zone Nord — Patrouille B',      statut: 'EN LIGNE',   password: 'Agent@CM14!',  loginId: 'AG-8824'   },
  { id: 'CM14-9901', name: 'Bruno Essomba',       role: 'agent',      zone: 'Secteur Alpha — Accueil',       statut: 'EN LIGNE',   password: 'Agent@CM14!',  loginId: 'AG-0031'   },
  { id: 'CM14-0433', name: 'Julian Voss',         role: 'agent',      zone: 'Zone Nord — Patrouille B',      statut: 'BLOQUÉ',     password: 'Agent@CM14!',  loginId: 'AG-0433'   },
  { id: 'CM14-1122', name: 'Fatou Diallo',        role: 'agent',      zone: 'Entrée Est — Salle B',          statut: 'HORS LIGNE', password: 'Agent@CM14!',  loginId: 'AG-1122'   },
  { id: 'CM14-3310', name: 'Eric Mballa',         role: 'agent',      zone: 'Accueil VIP — Niveau 3',        statut: 'EN LIGNE',   password: 'Agent@CM14!',  loginId: 'AG-3310'   },
  { id: 'CM14-5500', name: 'Sophie Kamga',        role: 'supervisor', zone: 'Salle Plénière — Supervision',  statut: 'EN LIGNE',   password: 'Super@CM14!',  loginId: 'SUP-5500'  },
]

const EMPTY_FORM = { name: '', loginId: '', password: '', role: 'agent', zone: '', statut: 'HORS LIGNE' }

const MOCK_USERS_FALLBACK = MOCK_USERS

const ROLE_BADGE = {
  admin:      'bg-primary text-white',
  supervisor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  agent:      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

const STATUT_COLOR = {
  'EN LIGNE':   'text-emerald-600 dark:text-emerald-400',
  'HORS LIGNE': 'text-slate-400',
  'BLOQUÉ':     'text-red-500',
}

const STATUT_DOT = {
  'EN LIGNE':   'bg-emerald-500',
  'HORS LIGNE': 'bg-slate-300 dark:bg-slate-600',
  'BLOQUÉ':     'bg-red-500',
}


export default function UserManagement() {
  const { t, i18n } = useTranslation()
  const [users, setUsers]        = useState(MOCK_USERS_FALLBACK)
  const [loading, setLoading]    = useState(true)
  const [doors, setDoors]        = useState([])
  const [search, setSearch]      = useState('')
  const [roleFilter, setRoleF]   = useState('all')
  const [statutFilter, setStatF] = useState('all')
  const [zoneFilter, setZoneF]   = useState('all')
  const [page, setPage]          = useState(1)
  const [modal, setModal]        = useState(null)
  const [editing, setEditing]    = useState(null)
  const [form, setForm]          = useState(EMPTY_FORM)
  const [showPwd, setShowPwd]    = useState(false)
  const [saving, setSaving]      = useState(false)
  const [apiError, setApiError]  = useState(null)
  const [totpModal, setTotpModal] = useState(null) // { id, name, totpSecret } | null
  const PER_PAGE = 8

  useSocket({
    'user:status': ({ userId, status }) => {
      setUsers(prev => prev.map(u =>
        u.loginId === userId && u.statut !== 'BLOQUÉ'
          ? { ...u, statut: status }
          : u
      ))
    },
  })

  useEffect(() => {
    if (IS_MOCK) {
      setDoors(POINTS_CONTROLE)
      setLoading(false)
      return
    }
    Promise.all([
      api.get('/api/users'),
      api.get('/api/terminals'),
    ])
      .then(([usersRows, doorsRows]) => {
        setUsers(usersRows)
        setDoors(doorsRows)
      })
      .catch(() => {
        setUsers(MOCK_USERS_FALLBACK)
        setDoors(POINTS_CONTROLE)
      })
      .finally(() => setLoading(false))
  }, [])

  const statutLabel = {
    'EN LIGNE':   t('common.status.online'),
    'HORS LIGNE': t('common.status.offline'),
    'BLOQUÉ':     t('common.status.blocked'),
  }

  const roleOpts = [
    { value: 'all',        label: t('users.filters.all_roles') },
    { value: 'admin',      label: t('agent_profile.role.admin') },
    { value: 'supervisor', label: t('agent_profile.role.supervisor') },
    { value: 'agent',      label: t('agent_profile.role.agent') },
  ]

  const statutOpts = [
    { value: 'all',         label: t('users.filters.all_statuts') },
    { value: 'EN LIGNE',   label: t('common.status.online') },
    { value: 'HORS LIGNE', label: t('common.status.offline') },
    { value: 'BLOQUÉ',     label: t('common.status.blocked') },
  ]

  const zoneOpts = [
    { value: 'all', label: t('users.filters.all_zones') },
    ...doors.map(d => ({ value: d.nom, label: d.nom })),
  ]

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.loginId.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const matchStatut = statutFilter === 'all' || u.statut === statutFilter
    const matchZone   = zoneFilter === 'all' || u.zone.includes(zoneFilter)
    return matchSearch && matchRole && matchStatut && matchZone
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const openAdd    = () => { setForm(EMPTY_FORM); setEditing(null); setModal('add') }
  const openEdit   = (u) => { setForm({ name: u.name, loginId: u.loginId, password: u.password, role: u.role, zone: u.zone, statut: u.statut }); setEditing(u); setModal('edit') }
  const openDel    = (u) => { setEditing(u); setModal('delete') }
  const openTotp   = async (u) => {
    if (IS_MOCK) {
      // En mock, on utilise des secrets de démonstration
      const MOCK_SECRETS = {
        'ADMIN-001': 'JBSWY3DPEHPK3PXP', 'SUPER-001': 'KVKFKRCPNZQUYMLX',
        'AG-8824': 'JBSWY3DPEHPK3PXP', 'AG-0031': 'KVKFKRCPNZQUYMLX',
        'AG-0433': 'MFRA2YTNJFQWCYLB', 'AG-1122': 'GEZDGNBVGY3TQOJQ',
      }
      setTotpModal({ id: u.loginId, name: u.name, totpSecret: MOCK_SECRETS[u.loginId] ?? 'JBSWY3DPEHPK3PXP' })
      return
    }
    try {
      const data = await api.get(`/api/users/${u.loginId}/totp`)
      setTotpModal({ id: data.id, name: data.name, totpSecret: data.totpSecret })
    } catch {
      setTotpModal(null)
    }
  }
  const closeModal = () => { setModal(null); setEditing(null); setShowPwd(false); setApiError(null) }

  const handleSave = async () => {
    if (!form.name || !form.loginId) return
    setSaving(true)
    setApiError(null)
    try {
      if (modal === 'add') {
        const payload = { loginId: form.loginId.toUpperCase(), name: form.name, password: form.password, role: form.role, zone: form.zone }
        const created = IS_MOCK
          ? { ...payload, id: form.loginId.toUpperCase(), statut: 'HORS LIGNE' }
          : await api.post('/api/users', payload)
        setUsers(prev => [created, ...prev])
      } else {
        const payload = { name: form.name, role: form.role, zone: form.zone }
        const updated = IS_MOCK
          ? { ...editing, ...payload }
          : await api.patch(`/api/users/${editing.id}`, payload)
        setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...updated } : u))
      }
      closeModal()
    } catch (err) {
      setApiError(err.status === 409 ? 'Identifiant déjà utilisé.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setApiError(null)
    try {
      if (!IS_MOCK) await api.delete(`/api/users/${editing.id}`)
      setUsers(prev => prev.filter(u => u.id !== editing.id))
      closeModal()
    } catch (err) {
      setApiError(err.status === 403 ? err.message : (err.message || 'Erreur lors de la suppression.'))
    }
  }

  const handleBlock = async (userId) => {
    try {
      if (!IS_MOCK) {
        const res = await api.patch(`/api/users/${userId}/lock`)
        setUsers(prev => prev.map(u => u.id === userId
          ? { ...u, statut: res.is_locked ? 'BLOQUÉ' : 'HORS LIGNE' }
          : u
        ))
      } else {
        setUsers(prev => prev.map(u => u.id === userId
          ? { ...u, statut: u.statut === 'BLOQUÉ' ? 'HORS LIGNE' : 'BLOQUÉ' }
          : u
        ))
      }
    } catch {
      // Ignore silently
    }
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
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('users.system_admin')}</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{t('users.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">{t('users.page_subtitle')}</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-primary/20 shrink-0">
          <span className="material-symbols-outlined text-xl">person_add</span>
          {t('users.btn.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span className="material-symbols-outlined text-base">tune</span>
            {t('users.filters_label')}
          </div>
          {[
            { value: roleFilter,   setter: setRoleF,   opts: roleOpts },
            { value: statutFilter, setter: setStatF,   opts: statutOpts },
            { value: zoneFilter,   setter: setZoneF,   opts: zoneOpts },
          ].map((f, i) => (
            <div key={i} className="relative">
              <select value={f.value} onChange={e => { f.setter(e.target.value); setPage(1) }}
                className="appearance-none pl-3 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                {f.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">expand_more</span>
            </div>
          ))}
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder={t('users.search_placeholder')}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 placeholder-slate-400"/>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          </div>
        ) : null}
        <div className={`overflow-x-auto ${loading ? 'hidden' : ''}`}>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800">
              <tr>
                {[t('users.table.name'), t('users.table.role'), t('users.table.zone'), t('users.table.status'), t('users.table.actions')].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {paginated.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">{t('users.not_found')}</td></tr>
              )}
              {paginated.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
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
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{u.zone}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUT_DOT[u.statut] || 'bg-slate-300'}`}></div>
                      <span className={`text-sm font-semibold ${STATUT_COLOR[u.statut] || 'text-slate-500'}`}>{statutLabel[u.statut] || u.statut}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openTotp(u)} title={t('users.btn.show_totp')}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                        <span className="material-symbols-outlined text-base">qr_code_2</span>
                      </button>
                      <button onClick={() => openEdit(u)} title={t('users.btn.edit')}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button onClick={() => handleBlock(u.id)}
                        title={u.statut === 'BLOQUÉ' ? t('users.btn.unblock') : t('users.btn.block')}
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                        <span className="material-symbols-outlined text-base">{u.statut === 'BLOQUÉ' ? 'lock_open' : 'lock'}</span>
                      </button>
                      <button onClick={() => openDel(u)} title={t('users.btn.delete')}
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
            {t('users.showing', { count: Math.min(paginated.length, PER_PAGE), total: filtered.length })}
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
          { key: 'active',  label: t('users.kpi.active'),  value: stats.actifs,  sub: '+4 depuis 24h',  color: 'text-primary dark:text-blue-400' },
          { key: 'alerts',  label: t('users.kpi.alerts'),  value: String(stats.alertes).padStart(2, '0'), sub: stats.alertes > 0 ? t('users.kpi.action_required') : t('users.kpi.no_alert'), color: stats.alertes > 0 ? 'text-red-500' : 'text-slate-400' },
          { key: 'sync',    label: t('users.kpi.sync'),    value: new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }), sub: t('users.kpi.protocol'), color: 'text-slate-800 dark:text-white' },
        ].map(kpi => (
          <div key={kpi.key} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-4xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className={`text-xs font-semibold mt-1 ${kpi.key === 'alerts' && stats.alertes > 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {modal === 'add' ? t('users.modal.add_title') : t('users.modal.edit_title')}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: t('users.modal.field_name'),     key: 'name',    type: 'text', placeholder: 'Ex: Alima Nkemba', icon: 'person' },
                { label: t('users.modal.field_id'),       key: 'loginId', type: 'text', placeholder: 'Ex: AG-8824',      icon: 'badge'  },
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('users.modal.field_zone')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">door_front</span>
                  <select value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none">
                    <option value="">-- Sélectionner une porte --</option>
                    {doors.map(d => <option key={d.id} value={d.nom}>{d.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('users.modal.field_password')}</label>
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('users.modal.field_role')}</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="agent">{t('agent_profile.role.agent')}</option>
                  <option value="supervisor">{t('agent_profile.role.supervisor')}</option>
                  <option value="admin">{t('agent_profile.role.admin')}</option>
                </select>
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
                {modal === 'add' ? t('users.modal.btn_create') : t('users.modal.btn_save')}
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
              <h3 className="font-bold text-slate-900 dark:text-white">{t('users.delete.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('users.delete.desc', { name: editing.name, id: editing.id })}
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
                {t('users.delete.btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal QR TOTP ── */}
      {totpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setTotpModal(null) }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xs">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{t('users.totp_modal.title')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{totpModal.name} · {totpModal.id}</p>
              </div>
              <button onClick={() => setTotpModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-5 py-5 flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <QRCodeCanvas
                  value={`otpauth://totp/AUTH-BADGE%20CM14:${totpModal.id}?secret=${totpModal.totpSecret}&issuer=AUTH-BADGE%20CM14`}
                  size={200} level="M"
                />
              </div>
              <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('users.totp_modal.manual_secret')}</p>
                <p className="font-mono font-bold text-slate-800 dark:text-white tracking-widest text-sm">{totpModal.totpSecret}</p>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                {t('users.totp_modal.warning')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

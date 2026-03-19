import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { PARTICIPANTS, ZONES, CATEGORIES, getCategoryColor, getStatutColor } from '../../data/mockData'

const emptyForm = { prenom: '', nom: '', delegation: '', categorie: 'DEL', zones: ['Z1'], dateExpiration: '' }

export default function BadgeInscription() {
  const [form, setForm]           = useState(emptyForm)
  const [participants, setParticipants] = useState(PARTICIPANTS)
  const [generated, setGenerated] = useState(null)
  const [search, setSearch]       = useState('')
  const [step, setStep]           = useState('form') // form | badge
  const [revoking, setRevoking]   = useState(null)

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleZone = (zid) => {
    setForm(f => ({
      ...f,
      zones: f.zones.includes(zid) ? f.zones.filter(z => z !== zid) : [...f.zones, zid]
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newP = {
      id: `P-${String(participants.length + 1).padStart(3, '0')}`,
      ...form,
      statut: 'actif',
      dateExpiration: form.dateExpiration || '2025-03-28',
    }
    setParticipants(prev => [newP, ...prev])
    setGenerated(newP)
    setStep('badge')
  }

  const handleRevoke = (id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, statut: 'révoqué' } : p))
    setRevoking(null)
  }

  const qrPayload = (p) => JSON.stringify({
    id: p.id, nom: p.nom, prenom: p.prenom,
    delegation: p.delegation, categorie: p.categorie,
    zones: p.zones, exp: p.dateExpiration,
    sig: 'ECDSA-P256-MOCK'
  })

  const filtered = participants.filter(p =>
    !search || `${p.prenom} ${p.nom} ${p.delegation}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Inscription & Badges</h2>
          <p className="text-slate-500 text-sm mt-1">Enregistrer un participant et générer son badge QR</p>
        </div>
        {step === 'badge' && (
          <button onClick={() => { setStep('form'); setGenerated(null); setForm(emptyForm) }}
            className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
            <span className="material-symbols-outlined text-lg">add</span>
            Nouveau participant
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* LEFT: form or badge */}
        <div>
          {step === 'form' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">how_to_reg</span>
                Nouveau participant
              </h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                    <input required value={form.prenom} onChange={e => handleChange('prenom', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Emmanuel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                    <input required value={form.nom} onChange={e => handleChange('nom', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Kofi Asante" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Délégation / Organisation *</label>
                  <input required value={form.delegation} onChange={e => handleChange('delegation', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Ghana" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie *</label>
                    <select value={form.categorie} onChange={e => handleChange('categorie', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                      {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expiration</label>
                    <input type="date" value={form.dateExpiration} onChange={e => handleChange('dateExpiration', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Zones d'accès autorisées *</label>
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
                  Générer le badge QR
                </button>
              </form>
            </div>
          )}

          {step === 'badge' && generated && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-sm">shield_person</span>
                  <span className="text-xs font-bold uppercase tracking-widest">OMC CM14 — Yaoundé 2025</span>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 inline-block mb-4">
                  <QRCodeSVG value={qrPayload(generated)} size={160} level="H" />
                </div>
                <h3 className="text-xl font-bold">{generated.prenom} {generated.nom}</h3>
                <p className="text-slate-300 text-sm mt-1">{generated.delegation}</p>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white`}>
                    {generated.categorie}
                  </span>
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
                <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors">
                  <span className="material-symbols-outlined text-lg">print</span>
                  Imprimer
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Télécharger
                </button>
              </div>
              <div className="px-4 pb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                  <p className="text-sm text-emerald-700 font-medium">Badge généré et enregistré avec succès</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: participants list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 dark:text-white">Participants enregistrés</h3>
              <span className="text-xs text-slate-400">{filtered.length} / {participants.length}</span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Rechercher..." />
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
                      title="Révoquer">
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
              <h3 className="font-bold text-slate-900 dark:text-white">Révoquer ce badge ?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Cette action est immédiate et sera propagée sur tous les terminaux agents en moins de 60 secondes.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRevoking(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleRevoke(revoking)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Révoquer maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

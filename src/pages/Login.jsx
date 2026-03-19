import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, locked } = useAuth()
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(id, password, otp)
    setLoading(false)
    if (result.success) {
      const role = result.user.role
      if (role === 'agent') navigate('/agent/dashboard')
      else navigate('/admin/dashboard')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="flex flex-col items-center p-8 bg-slate-50 border-b border-slate-200">
          <div className="bg-primary/10 text-primary p-3 rounded-full mb-4">
            <span className="material-symbols-outlined text-4xl">shield_lock</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Terminal Agent CM14</h1>
          <p className="text-slate-500 text-sm mt-1">Accès Restreint — Niveau d'Accréditation 4</p>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900">Connexion Sécurisée</h2>
            <p className="text-sm text-slate-500 mt-1">Entrez vos identifiants pour accéder au terminal CM14.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Agent ID */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Identifiant Agent</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={e => setId(e.target.value)}
                  placeholder="Ex: AG-8824 ou ADMIN-001"
                  required
                  disabled={locked}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Mot de passe fort</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">key</span>
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={locked}
                  className="block w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-lg">{showPwd ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>

            {/* 2FA */}
            <div className="pt-2">
              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium uppercase tracking-wider">Authentification 2FA</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Code OTP (6 chiffres)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-lg">pin</span>
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    required
                    disabled={locked}
                    className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm tracking-[0.4em] font-mono disabled:opacity-50"
                  />
                </div>
                <p className="text-xs text-slate-400">Code généré par votre application d'authentification. En mode démo : entrez 6 chiffres quelconques.</p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || locked}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Vérification en cours...
                </>
              ) : locked ? (
                <>
                  <span className="material-symbols-outlined text-lg">lock</span>
                  Compte bloqué
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  Accéder au terminal
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700 font-medium mb-1">Mode démonstration</p>
            <p className="text-xs text-amber-600">
              Agent : <span className="font-mono font-bold">AG-8824</span> / <span className="font-mono font-bold">Agent@CM14!</span><br />
              Admin : <span className="font-mono font-bold">ADMIN-001</span> / <span className="font-mono font-bold">Admin@CM14!</span><br />
              OTP : n'importe quels 6 chiffres (ex: <span className="font-mono font-bold">123456</span>)
            </p>
          </div>
        </div>

        {/* OTP Recovery */}
        <div className="text-center">
          <button
            onClick={() => navigate('/otp-recovery')}
            className="text-xs text-slate-400 hover:text-primary transition-colors"
          >
            Code OTP perdu ?{' '}
            <span className="font-semibold underline underline-offset-2">Récupérer l'accès 2FA</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-slate-400">AUTH-BADGE CM14 — OMC Yaoundé 2025</p>
          <p className="text-xs text-slate-300 mt-1">Système de contrôle d'accès sécurisé — v2.0</p>
        </div>
      </div>
    </div>
  )
}

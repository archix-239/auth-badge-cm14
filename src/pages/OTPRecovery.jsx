import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = ['identity', 'email', 'code', 'done']

export default function OTPRecovery() {
  const navigate = useNavigate()
  const [step, setStep]       = useState('identity')
  const [agentId, setAgentId] = useState('')
  const [email, setEmail]     = useState('')
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleIdentity = async (e) => {
    e.preventDefault()
    setError('')
    if (!agentId.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    // Demo: any ID works
    setLoading(false)
    setStep('email')
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) { setError('Adresse email invalide.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setStep('code')
  }

  const handleCode = async (e) => {
    e.preventDefault()
    setError('')
    if (code.length !== 6) { setError('Le code doit contenir 6 chiffres.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setStep('done')
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="material-symbols-outlined text-3xl text-primary">shield_lock</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">AUTH-BADGE CM14</span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

          {/* Progress */}
          <div className="flex">
            {['Identité', 'Email', 'Code', 'Terminé'].map((label, i) => {
              const stepKeys = STEPS
              const current = STEPS.indexOf(step)
              const done = i < current
              const active = i === current
              return (
                <div key={label} className="flex-1 relative">
                  <div className={`h-1 w-full transition-colors ${done || active ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
                  <p className={`text-center text-[10px] font-semibold mt-1.5 px-1 transition-colors ${active ? 'text-primary' : done ? 'text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                    {label}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className={`inline-flex p-3 rounded-full mb-3 ${
                step === 'done' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-primary/10'
              }`}>
                <span className={`material-symbols-outlined text-3xl ${step === 'done' ? 'text-emerald-600' : 'text-primary'}`}>
                  {step === 'identity' ? 'badge'
                  : step === 'email' ? 'mail'
                  : step === 'code' ? 'pin'
                  : 'check_circle'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {step === 'identity' && 'Récupération OTP'}
                {step === 'email'    && 'Vérification email'}
                {step === 'code'     && 'Code de récupération'}
                {step === 'done'     && 'OTP réinitialisé !'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {step === 'identity' && 'Entrez votre matricule agent pour commencer.'}
                {step === 'email'    && `Un code a été envoyé à votre adresse email enregistrée.`}
                {step === 'code'     && `Entrez le code à 6 chiffres reçu sur ${email}.`}
                {step === 'done'     && 'Votre OTP a été réinitialisé. Consultez votre application d\'authentification.'}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Step: Identity */}
            {step === 'identity' && (
              <form onSubmit={handleIdentity} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Matricule agent</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">badge</span>
                    <input
                      type="text"
                      value={agentId}
                      onChange={e => setAgentId(e.target.value)}
                      placeholder="Ex: AG-8824 ou ADMIN-001"
                      required
                      className="w-full pl-10 pr-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>Vérification…</>
                    : <><span className="material-symbols-outlined text-lg">arrow_forward</span>Continuer</>}
                </button>
              </form>
            )}

            {/* Step: Email */}
            {step === 'email' && (
              <form onSubmit={handleEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse email institutionnelle</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="agent@omc-cm14.org"
                      required
                      className="w-full pl-10 pr-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Renseignez l'email associé à votre compte agent.</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>Envoi en cours…</>
                    : <><span className="material-symbols-outlined text-lg">send</span>Envoyer le code</>}
                </button>
              </form>
            )}

            {/* Step: Code */}
            {step === 'code' && (
              <form onSubmit={handleCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Code de récupération (6 chiffres)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">pin</span>
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      maxLength={6}
                      required
                      className="w-full pl-10 pr-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm tracking-[0.5em] font-mono text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-center">Valable 10 minutes · En démo : entrez 6 chiffres quelconques</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>Validation…</>
                    : <><span className="material-symbols-outlined text-lg">verified</span>Valider</>}
                </button>
              </form>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    Votre secret TOTP a été réinitialisé. Scannez le QR Code reçu sur votre email avec votre application d'authentification (Google Authenticator, Authy…).
                  </p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">login</span>
                  Retour à la connexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        {step !== 'done' && (
          <button
            onClick={() => step === 'identity' ? navigate('/login') : setStep(STEPS[STEPS.indexOf(step) - 1])}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {step === 'identity' ? 'Retour à la connexion' : 'Étape précédente'}
          </button>
        )}
      </div>
    </div>
  )
}

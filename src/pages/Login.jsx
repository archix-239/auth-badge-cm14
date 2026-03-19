import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as OTPAuth from 'otpauth'
import { useAuth } from '../context/AuthContext'
import { USERS } from '../data/mockData'

export default function Login() {
  const { login, locked } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoOtp, setDemoOtp] = useState({ agent: '------', admin: '------', countdown: 30 })

  useEffect(() => {
    const agentUser = USERS.find(u => u.id === 'AG-8824')
    const adminUser = USERS.find(u => u.id === 'ADMIN-001')
    const compute = () => {
      const makeTotp = (secret) => new OTPAuth.TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) })
      setDemoOtp({
        agent: makeTotp(agentUser.totpSecret).generate(),
        admin: makeTotp(adminUser.totpSecret).generate(),
        countdown: 30 - (Math.floor(Date.now() / 1000) % 30),
      })
    }
    compute()
    const interval = setInterval(compute, 1000)
    return () => clearInterval(interval)
  }, [])

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('login.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900">{t('login.section')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('login.section_sub')}</p>
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
              <label className="block text-sm font-medium text-slate-700">{t('login.field.id')}</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={e => setId(e.target.value)}
                  placeholder={t('login.field.id_placeholder')}
                  required
                  disabled={locked}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">{t('login.field.password')}</label>
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
                <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium uppercase tracking-wider">{t('login.field.otp_divider')}</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">{t('login.field.otp')}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-lg">pin</span>
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('login.field.otp_placeholder')}
                    maxLength={6}
                    required
                    disabled={locked}
                    className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm tracking-[0.4em] font-mono disabled:opacity-50"
                  />
                </div>
                <p className="text-xs text-slate-400">{t('login.field.otp_hint')}</p>
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
                  {t('login.btn.loading')}
                </>
              ) : locked ? (
                <>
                  <span className="material-symbols-outlined text-lg">lock</span>
                  {t('login.btn.locked')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  {t('login.btn.submit')}
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-700 font-medium">{t('login.demo.title')}</p>
              <span className="text-[10px] text-amber-500 font-mono bg-amber-100 px-1.5 py-0.5 rounded">
                ⏱ {demoOtp.countdown}s
              </span>
            </div>
            <div className="text-xs text-amber-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>Agent : <span className="font-mono font-bold">AG-8824</span> / <span className="font-mono font-bold">Agent@CM14!</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span>OTP Agent :</span>
                <span className="font-mono font-bold text-sm tracking-[0.3em] text-amber-800">{demoOtp.agent}</span>
              </div>
              <div className="border-t border-amber-200 pt-1 flex items-center justify-between">
                <span>Admin : <span className="font-mono font-bold">ADMIN-001</span> / <span className="font-mono font-bold">Admin@CM14!</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span>OTP Admin :</span>
                <span className="font-mono font-bold text-sm tracking-[0.3em] text-amber-800">{demoOtp.admin}</span>
              </div>
            </div>
          </div>
        </div>

        {/* OTP Recovery */}
        <div className="text-center">
          <button
            onClick={() => navigate('/otp-recovery')}
            className="text-xs text-slate-400 hover:text-primary transition-colors"
          >
            {t('login.otp_lost')}{' '}
            <span className="font-semibold underline underline-offset-2">{t('login.otp_recover')}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-slate-400">{t('login.footer')}</p>
          <p className="text-xs text-slate-300 mt-1">Système de contrôle d'accès sécurisé — v2.0</p>
        </div>
      </div>
    </div>
  )
}

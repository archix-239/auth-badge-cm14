import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as OTPAuth from 'otpauth'
import { USERS, PARTICIPANTS } from '../data/mockData'
import { syncBadgeStore } from '../utils/badgeStore'
import { api, setAccessToken, clearTokens } from '../utils/api'
import { mapParticipant } from '../utils/dataMappers'

const AuthContext = createContext(null)

const IS_MOCK          = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === ''
const SESSION_TIMEOUT  = (parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MIN) || 30) * 60 * 1000

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [sessionTimer, setSessionTimer] = useState(null)
  const [otpAttempts,  setOtpAttempts]  = useState(0)
  const [locked,       setLocked]       = useState(false)

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('cm14_session')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const age    = Date.now() - parsed.loginTime
        if (age < 60 * 60 * 1000) {
          setUser(parsed.user)
          if (parsed.accessToken) setAccessToken(parsed.accessToken)
          startInactivityTimer()
        } else {
          localStorage.removeItem('cm14_session')
        }
      } catch { localStorage.removeItem('cm14_session') }
    }
    setLoading(false)
  }, [])

  const startInactivityTimer = useCallback(() => {
    if (sessionTimer) clearTimeout(sessionTimer)
    const timer = setTimeout(() => logout(), SESSION_TIMEOUT)
    setSessionTimer(timer)
  }, [sessionTimer])

  const resetInactivityTimer = useCallback(() => {
    startInactivityTimer()
  }, [startInactivityTimer])

  // ─── Login ───────────────────────────────────────────────────────────────
  const login = async (id, password, otp) => {
    if (locked) return { success: false, error: 'Compte bloqué. Contactez l\'administrateur.' }

    // ── Mode API réelle ────────────────────────────────────────────────────
    if (!IS_MOCK) {
      try {
        const data = await api.post('/api/auth/login', { id, password, otp })
        setAccessToken(data.accessToken)
        localStorage.setItem('cm14_refresh_token', data.refreshToken)
        localStorage.setItem('cm14_session', JSON.stringify({
          user:        data.user,
          accessToken: data.accessToken,
          loginTime:   Date.now(),
        }))
        setUser(data.user)
        setOtpAttempts(0)
        startInactivityTimer()
        // Sync les participants depuis l'API (pas depuis mockData)
        api.get('/api/participants')
          .then(rows => syncBadgeStore(rows.map(mapParticipant)))
          .catch(() => syncBadgeStore(PARTICIPANTS))
        return { success: true, user: data.user }
      } catch (err) {
        if (err.offline) {
          return { success: false, error: 'Hors ligne. Connexion à Internet requise pour se connecter.' }
        }
        const newAttempts = otpAttempts + 1
        setOtpAttempts(newAttempts)
        if (newAttempts >= 5) {
          setLocked(true)
          return { success: false, error: 'Compte bloqué après 5 tentatives. Contactez l\'administrateur.' }
        }
        return { success: false, error: err.message || 'Identifiants incorrects.' }
      }
    }

    // ── Mode mock (pas de VITE_API_URL) ───────────────────────────────────
    await new Promise(r => setTimeout(r, 800))

    const found = USERS.find(u => u.id === id && u.password === password)
    if (!found) {
      const newAttempts = otpAttempts + 1
      setOtpAttempts(newAttempts)
      if (newAttempts >= 5) {
        setLocked(true)
        return { success: false, error: 'Compte bloqué après 5 tentatives. Contactez l\'administrateur.' }
      }
      return { success: false, error: `Identifiants incorrects. Tentative ${newAttempts}/5.` }
    }

    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      return { success: false, error: 'Code OTP invalide (6 chiffres requis).' }
    }
    const totp  = new OTPAuth.TOTP({
      algorithm: 'SHA1', digits: 6, period: 30,
      secret: OTPAuth.Secret.fromBase32(found.totpSecret),
    })
    const delta = totp.validate({ token: otp, window: 1 })
    if (delta === null) {
      return { success: false, error: 'Code OTP invalide ou expiré. Vérifiez l\'heure de votre appareil.' }
    }

    const session = { user: found, loginTime: Date.now() }
    localStorage.setItem('cm14_session', JSON.stringify(session))
    setUser(found)
    setOtpAttempts(0)
    startInactivityTimer()
    syncBadgeStore(PARTICIPANTS).catch(() => {})
    return { success: true, user: found }
  }

  // ─── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (sessionTimer) clearTimeout(sessionTimer)
    if (!IS_MOCK) {
      try { await api.post('/api/auth/logout', {}) } catch { /* token déjà expiré */ }
      clearTokens()
    }
    localStorage.removeItem('cm14_session')
    setUser(null)
  }, [sessionTimer])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, resetInactivityTimer, locked }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

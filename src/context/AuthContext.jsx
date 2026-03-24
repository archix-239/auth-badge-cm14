import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { syncBadgeStore } from '../utils/badgeStore'
import { api, setAccessToken, clearTokens } from '../utils/api'
import { mapParticipant } from '../utils/dataMappers'

const AuthContext = createContext(null)

const SESSION_TIMEOUT = (parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MIN) || 30) * 60 * 1000

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
    if (locked) return { success: false, error: "Compte bloqué. Contactez l'administrateur." }
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
      // Pré-charge le cache badges offline
      api.get('/api/participants')
        .then(rows => syncBadgeStore(rows.map(mapParticipant)))
        .catch(() => {})
      return { success: true, user: data.user }
    } catch (err) {
      if (err.offline) {
        return { success: false, error: 'Hors ligne. Connexion à Internet requise pour se connecter.' }
      }
      const newAttempts = otpAttempts + 1
      setOtpAttempts(newAttempts)
      if (newAttempts >= 5) {
        setLocked(true)
        return { success: false, error: "Compte bloqué après 5 tentatives. Contactez l'administrateur." }
      }
      return { success: false, error: err.message || 'Identifiants incorrects.' }
    }
  }

  // ─── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (sessionTimer) clearTimeout(sessionTimer)
    try { await api.post('/api/auth/logout', {}) } catch { /* token déjà expiré */ }
    clearTokens()
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

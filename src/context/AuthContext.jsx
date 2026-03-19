import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as OTPAuth from 'otpauth'
import { USERS } from '../data/mockData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionTimer, setSessionTimer] = useState(null)
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [locked, setLocked] = useState(false)

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('cm14_session')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const age = Date.now() - parsed.loginTime
        if (age < 60 * 60 * 1000) { // 1h max
          setUser(parsed.user)
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
    const timer = setTimeout(() => {
      logout()
    }, 15 * 60 * 1000) // 15 minutes
    setSessionTimer(timer)
  }, [sessionTimer])

  const resetInactivityTimer = useCallback(() => {
    startInactivityTimer()
  }, [startInactivityTimer])

  const login = async (id, password, otp) => {
    if (locked) return { success: false, error: 'Compte bloqué. Contactez l\'administrateur.' }

    // Simulate async
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

    // Real TOTP validation (RFC 6238, SHA-1, 6 digits, 30s period)
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      return { success: false, error: 'Code OTP invalide (6 chiffres requis).' }
    }
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
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
    return { success: true, user: found }
  }

  const logout = useCallback(() => {
    if (sessionTimer) clearTimeout(sessionTimer)
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

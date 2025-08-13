// Hook useAuth — MVP (Profil + Bot)
// Fichier: /frontend/src/lib/hooks/useAuth.ts

import React, { useState, useEffect, useCallback } from 'react'
import { authService, UserSession } from '@/lib/services/authService'
import { User, Boutique, ApiResponse, SystemConfig } from '@/lib/types'

interface AuthState {
  session: UserSession
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isBoutique: boolean
  currentUser: User | null
  currentBoutique: Boutique | null
}

interface AuthActions {
  loginAdmin: (email: string, password: string) => Promise<ApiResponse<any>>
  loginBoutique: (numeroWhatsApp: string) => Promise<ApiResponse<any>>
  logout: () => Promise<ApiResponse<void>>

  updateProfile: (name: string, email?: string) => Promise<ApiResponse<void>>
  changePassword: (newPassword: string, currentPassword?: string) => Promise<ApiResponse<void>>
  sendPasswordReset: (email: string) => Promise<ApiResponse<void>>

  getSystemConfig: () => Promise<ApiResponse<SystemConfig>>
  saveBotWelcomeTemplate: (message: string) => Promise<ApiResponse<void>>

  validateSession: () => Promise<boolean>
  refreshSession: () => void
}

export function useAuth(): AuthState & AuthActions {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    loading: true,
    isAuthenticated: false,
    isAdmin: false,
    isBoutique: false,
    currentUser: null,
    currentBoutique: null,
  })

  const updateAuthState = useCallback((session: UserSession) => {
    setAuthState({
      session,
      loading: false,
      isAuthenticated: session !== null,
      isAdmin: session?.type === 'admin',
      isBoutique: session?.type === 'boutique',
      currentUser: session?.type === 'admin' ? session.user : null,
      currentBoutique: session?.type === 'boutique' ? session.boutique : null,
    })
  }, [])

  useEffect(() => {
    authService.ensureClientInitialization()
    const unsubscribe = authService.onAuthStateChange(updateAuthState)
    return unsubscribe
  }, [updateAuthState])

  useEffect(() => {
    if (!authState.isAuthenticated) return
    const interval = setInterval(async () => {
      const isValid = await authService.validateSession()
      if (!isValid) console.log('Session expirée, déconnexion automatique')
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [authState.isAuthenticated])

  const loginAdmin = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true }))
    try {
      const res = await authService.loginAdmin(email, password)
      if (!res.success) setAuthState(prev => ({ ...prev, loading: false }))
      return res
    } catch (e) {
      setAuthState(prev => ({ ...prev, loading: false }))
      throw e
    }
  }, [])

  const loginBoutique = useCallback(async (numeroWhatsApp: string) => {
    setAuthState(prev => ({ ...prev, loading: true }))
    try {
      const res = await authService.loginBoutique(numeroWhatsApp)
      if (!res.success) setAuthState(prev => ({ ...prev, loading: false }))
      return res
    } catch (e) {
      setAuthState(prev => ({ ...prev, loading: false }))
      throw e
    }
  }, [])

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }))
    try {
      return await authService.logout()
    } finally {
      // L'état se mettra à jour via le listener
    }
  }, [])

  const updateProfile = useCallback(async (name: string, email?: string) => {
    return await authService.updateProfile(name, email)
  }, [])

  const changePassword = useCallback(async (newPassword: string, currentPassword?: string) => {
    return await authService.changePassword(newPassword, currentPassword)
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    return await authService.sendPasswordReset(email)
  }, [])

  const getSystemConfig = useCallback(async () => {
    return await authService.getSystemConfig()
  }, [])

  const saveBotWelcomeTemplate = useCallback(async (message: string) => {
    return await authService.saveBotWelcomeTemplate(message)
  }, [])

  const validateSession = useCallback(async () => {
    return await authService.validateSession()
  }, [])

  const refreshSession = useCallback(() => {
    const currentSession = authService.getCurrentSession()
    updateAuthState(currentSession)
  }, [updateAuthState])

  return {
    ...authState,
    loginAdmin,
    loginBoutique,
    logout,
    updateProfile,
    changePassword,
    sendPasswordReset,
    getSystemConfig,
    saveBotWelcomeTemplate,
    validateSession,
    refreshSession,
  }
}

export function useAuthState(): Pick<AuthState, 'isAuthenticated' | 'isAdmin' | 'isBoutique' | 'loading'> {
  const { isAuthenticated, isAdmin, isBoutique, loading } = useAuth()
  return { isAuthenticated, isAdmin, isBoutique, loading }
}

export function useCurrentUser(): {
  user: User | null
  boutique: Boutique | null
  type: 'admin' | 'boutique' | null
  loading: boolean
} {
  const { currentUser, currentBoutique, session, loading } = useAuth()
  return { user: currentUser, boutique: currentBoutique, type: session?.type || null, loading }
}

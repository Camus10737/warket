// Service Auth — MVP simplifié et corrigé
// Fichier: /frontend/src/lib/services/authService.ts

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile as updateFirebaseProfile,
  createUserWithEmailAndPassword,
  updateEmail,
  EmailAuthProvider,
  signInAnonymously,
  reauthenticateWithCredential,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import {
  User,
  Boutique,
  ApiResponse,
  SystemConfig,
} from '@/lib/types'
import { boutiqueService } from './boutiqueService'

const isClient = typeof window !== 'undefined'

// ==================== SESSIONS ====================

export interface AdminSession {
  type: 'admin'
  user: User
  firebaseUser: FirebaseUser
}

export interface BoutiqueSession {
  type: 'boutique'
  boutique: Boutique
  connected_at: Date
}

export type UserSession = AdminSession | BoutiqueSession | null

// ==================== SERVICE ====================

class AuthService {
  private currentSession: UserSession = null
  private authListeners: ((session: UserSession) => void)[] = []
  private isInitialized = false

  constructor() {
    if (isClient) this.initializeClientSide()
  }

  private initializeClientSide(): void {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await this.handleFirebaseAuthChange(firebaseUser)
      } else {
        await this.handleFirebaseSignOut()
      }
    })
    this.restoreBoutiqueSession()
    this.isInitialized = true
  }

  public ensureClientInitialization(): void {
    if (isClient && !this.isInitialized) this.initializeClientSide()
  }

  // ==================== ADMIN LOGIN ====================

  async loginAdmin(email: string, password: string): Promise<ApiResponse<AdminSession>> {
    if (!isClient) return { success: false, error: 'Cette action doit être effectuée côté client' }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      const userDocRef = doc(db, 'users', firebaseUser.uid)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        await signOut(auth)
        return { success: false, error: 'Données utilisateur non trouvées' }
      }
      const userData = userDoc.data() as User
      if (userData.role !== 'admin') {
        await signOut(auth)
        return { success: false, error: 'Accès administrateur non autorisé' }
      }

      const adminSession: AdminSession = {
        type: 'admin',
        user: { ...userData, id: userDoc.id },
        firebaseUser,
      }
      this.currentSession = adminSession
      this.notifyAuthListeners()
      await this.updateLastLogin(firebaseUser.uid)

      // Cookies pour middleware
      this.setRoleCookies('admin')

      return { success: true, data: adminSession, message: 'Connexion administrateur réussie' }
    } catch (error: any) {
      let msg = 'Erreur de connexion'
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password': msg = 'Email ou mot de passe incorrect'; break
        case 'auth/invalid-email': msg = 'Email invalide'; break
        case 'auth/too-many-requests': msg = 'Trop de tentatives. Réessayez plus tard'; break
        default: msg = error.message
      }
      return { success: false, error: msg }
    }
  }

  async createAdmin(email: string, password: string, name: string): Promise<ApiResponse<User>> {
    if (!isClient) return { success: false, error: 'Cette action doit être effectuée côté client' }
    try {
      if (!this.isAdmin()) return { success: false, error: 'Seuls les administrateurs peuvent créer des comptes admin' }

      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = cred.user

      const userData: Omit<User, 'id'> = {
        email, name, role: 'admin', status: 'active', created_at: serverTimestamp() as any,
      }
      await setDoc(doc(db, 'users', firebaseUser.uid), userData)

      return {
        success: true,
        data: { ...userData, id: firebaseUser.uid, created_at: new Date() as any } as User,
        message: 'Compte administrateur créé avec succès',
      }
    } catch (error: any) {
      let msg = 'Erreur lors de la création du compte'
      switch (error.code) {
        case 'auth/email-already-in-use': msg = 'Cette adresse email est déjà utilisée'; break
        case 'auth/weak-password': msg = 'Le mot de passe doit contenir au moins 6 caractères'; break
        case 'auth/invalid-email': msg = 'Adresse email invalide'; break
        default: msg = error.message
      }
      return { success: false, error: msg }
    }
  }

  // ==================== BOUTIQUE LOGIN ====================

async loginBoutique(numeroWhatsApp: string): Promise<ApiResponse<BoutiqueSession>> {
  if (!isClient) return { success: false, error: 'Cette action doit être effectuée côté client' }
  try {
    const cleanNumber = numeroWhatsApp.replace(/[\s\-\+]/g, '')
    const boutiqueResult = await boutiqueService.getBoutiqueByWhatsApp(cleanNumber)
    if (!boutiqueResult.success || !boutiqueResult.data) {
      return { success: false, error: 'Numéro WhatsApp non trouvé ou boutique inactive' }
    }

    // AJOUT : Connecter aussi dans Firebase Auth pour Storage
    try {
      await signInAnonymously(auth)
      console.log('Boutique connectée dans Firebase Auth:', auth.currentUser?.uid)
    } catch (authError) {
      console.error('Erreur auth Firebase:', authError)
      // Continue quand même si l'auth anonyme échoue
    }

    const boutiqueSession: BoutiqueSession = {
      type: 'boutique',
      boutique: boutiqueResult.data,
      connected_at: new Date(),
    }

    this.currentSession = boutiqueSession
    this.notifyAuthListeners()
    this.saveBoutiqueSession(boutiqueSession)

    // Cookies pour middleware
    this.setRoleCookies('boutique')

    return { success: true, data: boutiqueSession, message: 'Connexion boutique réussie' }
  } catch (error: any) {
    return { success: false, error: `Erreur de connexion: ${error.message}` }
  }
}

  // ==================== PROFIL ADMIN ====================

  async updateProfile(name: string, email?: string): Promise<ApiResponse<void>> {
    if (!isClient) return { success: false, error: 'Cette action doit être effectuée côté client' }
    try {
      if (!this.isAdmin() || !this.currentSession) {
        return { success: false, error: 'Vous devez être connecté comme administrateur' }
      }

      const adminSession = this.currentSession as AdminSession
      const userId = adminSession.user.id

      if (!name.trim()) return { success: false, error: 'Le nom est obligatoire' }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: "Format d'email invalide" }
      }

      if (email && email !== adminSession.user.email) {
        try {
          await updateEmail(adminSession.firebaseUser, email)
        } catch (e: any) {
          if (e.code === 'auth/requires-recent-login') {
            return { success: false, error: 'Veuillez vous reconnecter avant de modifier votre email' }
          }
          throw e
        }
      }

      await updateFirebaseProfile(adminSession.firebaseUser, { displayName: name })

      const updateData: any = { name, updated_at: serverTimestamp() }
      if (email) updateData.email = email
      await updateDoc(doc(db, 'users', userId), updateData)

      this.currentSession = {
        ...adminSession,
        user: { ...adminSession.user, name, ...(email ? { email } : {}) },
      }
      this.notifyAuthListeners()

      return { success: true, message: 'Profil mis à jour avec succès' }
    } catch (error: any) {
      let msg = 'Erreur lors de la mise à jour du profil'
      switch (error.code) {
        case 'auth/requires-recent-login': msg = 'Veuillez vous reconnecter avant de modifier votre profil'; break
        case 'auth/email-already-in-use': msg = 'Cette adresse email est déjà utilisée'; break
        default: msg = error.message
      }
      return { success: false, error: msg }
    }
  }

  // ==================== CHANGEMENT MOT DE PASSE ====================

  async changePassword(newPassword: string, currentPassword?: string): Promise<ApiResponse<void>> {
    if (!isClient) return { success: false, error: 'Cette action doit être effectuée côté client' }
    try {
      if (!this.isAdmin() || !this.currentSession) {
        return { success: false, error: 'Vous devez être connecté comme administrateur' }
      }

      const configResult = await this.getSystemConfig()
      const minLength = configResult.success ? configResult.data!.password_min_length : 8
      if (newPassword.length < minLength) {
        return { success: false, error: `Le mot de passe doit contenir au moins ${minLength} caractères` }
      }

      const adminSession = this.currentSession as AdminSession
      if (currentPassword) {
        const cred = EmailAuthProvider.credential(adminSession.user.email, currentPassword)
        await reauthenticateWithCredential(adminSession.firebaseUser, cred)
      }

      await updatePassword(adminSession.firebaseUser, newPassword)
      await updateDoc(doc(db, 'users', adminSession.user.id), {
        password_changed_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })

      return { success: true, message: 'Mot de passe modifié avec succès' }
    } catch (error: any) {
      let msg = 'Erreur lors du changement de mot de passe'
      if (error.code === 'auth/requires-recent-login') msg = 'Veuillez vous reconnecter puis réessayer'
      if (error.code === 'auth/weak-password') msg = 'Mot de passe trop faible'
      return { success: false, error: msg }
    }
  }

  // ==================== CONFIG SYSTÈME (MVP) ====================

  async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    try {
      if (!this.isAdmin()) return { success: false, error: 'Accès réservé aux administrateurs' }

      const snap = await getDoc(doc(db, 'system_config', 'main'))
      if (snap.exists()) {
        return { success: true, data: snap.data() as SystemConfig }
      }

      const defaults: SystemConfig = {
        maintenance_mode: false,
        auto_backup: false,
        email_notifications: false,
        max_boutiques: 100,
        session_timeout: 24,
        bot_welcome_template: "Bonjour ! Je suis votre assistant Wariket. Comment puis-je vous aider ?",
        bot_escalation_threshold: 3,
        bot_auto_response_delay: 2,
        max_negotiation_percent: 10,
        max_login_attempts: 5,
        require_2fa: false,
        password_min_length: 8,
      }

      await setDoc(
        doc(db, 'system_config', 'main'),
        { ...defaults, created_at: serverTimestamp(), updated_at: serverTimestamp() },
        { merge: true }
      )

      return { success: true, data: defaults }
    } catch (e: any) {
      return { success: false, error: `Erreur lors du chargement de la configuration: ${e.message}` }
    }
  }

  async saveBotWelcomeTemplate(message: string): Promise<ApiResponse<void>> {
    try {
      if (!this.isAdmin()) return { success: false, error: 'Accès réservé aux administrateurs' }
      await setDoc(
        doc(db, 'system_config', 'main'),
        { bot_welcome_template: message, updated_at: serverTimestamp() },
        { merge: true }
      )
      return { success: true, message: 'Message de bienvenue mis à jour' }
    } catch (e: any) {
      return { success: false, error: `Erreur: ${e.message}` }
    }
  }

  // ==================== VALIDATION SESSION ====================

  async validateSession(): Promise<boolean> {
    if (!this.isAuthenticated()) return false

    try {
      if (this.currentSession?.type === 'admin') {
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true).catch(() => null)
        }
        return auth.currentUser !== null
      }

      if (this.currentSession?.type === 'boutique') {
        const boutiqueSession = this.currentSession as BoutiqueSession
        const maxAge = 24 * 60 * 60 * 1000 // 24h
        const age = Date.now() - boutiqueSession.connected_at.getTime()
        if (age > maxAge) {
          await this.logout()
          return false
        }
        return true
      }

      return false
    } catch (e) {
      console.error('Erreur validation session:', e)
      return false
    }
  }

  // ==================== LOGOUT & ACCESSEURS ====================

  async logout(): Promise<ApiResponse<void>> {
    if (!isClient) return { success: false, error: 'Cette action doit être effectuée côté client' }
    try {
      if (this.currentSession?.type === 'admin') {
        await signOut(auth) // handleFirebaseSignOut nettoiera la session
      } else if (this.currentSession?.type === 'boutique') {
        this.clearBoutiqueSession()
        this.currentSession = null
        this.notifyAuthListeners()
      }

      // Nettoie toujours les cookies de rôle
      this.clearRoleCookies()

      return { success: true, message: 'Déconnexion réussie' }
    } catch (e: any) {
      return { success: false, error: `Erreur lors de la déconnexion: ${e.message}` }
    }
  }

  getCurrentSession(): UserSession { return this.currentSession }
  isAuthenticated(): boolean { return this.currentSession !== null }
  isAdmin(): boolean { return this.currentSession?.type === 'admin' }
  isBoutique(): boolean { return this.currentSession?.type === 'boutique' }
  getCurrentUser(): User | null { return this.currentSession?.type === 'admin' ? this.currentSession.user : null }
  getCurrentBoutique(): Boutique | null { return this.currentSession?.type === 'boutique' ? this.currentSession.boutique : null }

  async sendPasswordReset(email: string): Promise<ApiResponse<void>> {
    if (!isClient) return { success: false, error: 'Cette action doit être effectuée côté client' }
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true, message: 'Email de réinitialisation envoyé' }
    } catch (error: any) {
      let msg = "Erreur lors de l'envoi de l'email"
      switch (error.code) {
        case 'auth/user-not-found': msg = 'Aucun compte trouvé avec cette adresse email'; break
        case 'auth/invalid-email': msg = 'Adresse email invalide'; break
        default: msg = error.message
      }
      return { success: false, error: msg }
    }
  }

  onAuthStateChange(callback: (session: UserSession) => void): () => void {
    this.authListeners.push(callback)
    callback(this.currentSession)
    return () => { this.authListeners = this.authListeners.filter(l => l !== callback) }
  }

  // ==================== HANDLERS AUTH STATE ====================

  private async handleFirebaseAuthChange(firebaseUser: FirebaseUser): Promise<void> {
    if (!isClient) return
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        const userData = userDoc.data() as User
        const adminSession: AdminSession = {
          type: 'admin',
          user: { ...userData, id: userDoc.id },
          firebaseUser,
        }
        this.currentSession = adminSession
        this.notifyAuthListeners()

        // Cookies pour reload d’une page admin
        this.setRoleCookies('admin')
      }
    } catch (e) {
      console.error('Erreur lors de la récupération des données utilisateur:', e)
    }
  }

  private async handleFirebaseSignOut(): Promise<void> {
    if (this.currentSession?.type === 'admin') {
      this.currentSession = null
      this.notifyAuthListeners()
      this.clearRoleCookies()
    }
  }

  private notifyAuthListeners(): void {
    this.authListeners.forEach((l) => l(this.currentSession))
  }

  // ==================== SESSION BOUTIQUE (LOCAL) ====================

  private saveBoutiqueSession(session: BoutiqueSession): void {
    if (!isClient) return
    try {
      localStorage.setItem('boutiqueSession', JSON.stringify({
        boutique: session.boutique,
        connected_at: session.connected_at.toISOString(),
        timestamp: Date.now(),
      }))
    } catch (e) {
      console.error('Erreur sauvegarde session boutique:', e)
    }
  }

  private restoreBoutiqueSession(): void {
    if (!isClient) return
    try {
      const saved = localStorage.getItem('boutiqueSession')
      if (!saved) return
      const parsed = JSON.parse(saved)
      const maxAge = 24 * 60 * 60 * 1000
      if (parsed.timestamp && (Date.now() - parsed.timestamp) > maxAge) {
        this.clearBoutiqueSession()
        return
      }
      this.currentSession = {
        type: 'boutique',
        boutique: parsed.boutique,
        connected_at: new Date(parsed.connected_at),
      }
      this.notifyAuthListeners()

      // Cookies pour reload d’une page vendeuse
      this.setRoleCookies('boutique')
    } catch (e) {
      console.error('Erreur restauration session boutique:', e)
      this.clearBoutiqueSession()
    }
  }

  private clearBoutiqueSession(): void {
    if (!isClient) return
    try { localStorage.removeItem('boutiqueSession') } catch {}
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        last_login: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
    } catch (e) {
      console.error('Erreur mise à jour dernière connexion:', e)
    }
  }

  // ==================== UTILITAIRE: MAJ BOUTIQUE EN SESSION ====================

  updateBoutiqueInSession(patch: Partial<Boutique>): void {
    if (this.currentSession?.type !== 'boutique') return
    const current = this.currentSession as BoutiqueSession
    const updatedBoutique = { ...current.boutique, ...patch }
    const updatedSession: BoutiqueSession = { ...current, boutique: updatedBoutique }
    this.currentSession = updatedSession
    this.saveBoutiqueSession(updatedSession)
    this.notifyAuthListeners()
  }

  // ==================== COOKIES DE RÔLE (MVP) ====================

  private setRoleCookies(role: 'admin' | 'boutique') {
    if (typeof document === 'undefined') return
    document.cookie = `w_auth=1; path=/; SameSite=Lax`
    document.cookie = `w_role=${role}; path=/; SameSite=Lax`
  }

  private clearRoleCookies() {
    if (typeof document === 'undefined') return
    document.cookie = `w_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    document.cookie = `w_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  }

  // ==================== DEBUG DEV ====================

  getDebugInfo(): any {
    if (process.env.NODE_ENV !== 'development') return { error: 'Debug info only available in development' }
    return {
      currentSession: this.currentSession,
      isInitialized: this.isInitialized,
      listenersCount: this.authListeners.length,
      firebaseCurrentUser: auth.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
      } : null,
      localStorage: isClient ? { hasBoutiqueSession: !!localStorage.getItem('boutiqueSession') } : null,
    }
  }
}

// Instance unique
export const authService = new AuthService()
export default authService

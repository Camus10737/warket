// Service Boutique - CRUD et gestion des boutiques
// Fichier: /frontend/src/lib/services/boutiqueService.ts

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  Boutique, 
  CreateBoutiqueData, 
  UpdateBoutiqueData,
  BoutiqueStatus,
  ApiResponse,
  FilterParams 
} from '@/lib/types'

class BoutiqueService {
  private readonly collectionName = 'boutiques'

  // ==================== CRÉATION ====================

  /**
   * Créer une nouvelle boutique (Admin seulement)
   */
  async createBoutique(data: CreateBoutiqueData, adminId: string): Promise<ApiResponse<Boutique>> {
    try {
      // Vérifier si le numéro WhatsApp existe déjà
      const existingBoutique = await this.getBoutiqueByWhatsApp(data.numero_whatsapp)
      if (existingBoutique.success && existingBoutique.data) {
        return {
          success: false,
          error: 'Ce numéro WhatsApp est déjà utilisé par une autre boutique'
        }
      }

      const boutiqueData = {
        ...data,
        created_by: adminId,
        status: 'active' as BoutiqueStatus,
        created_at: serverTimestamp(),
        // Stats initiales
        total_produits: 0,
        total_ventes: 0,
        chiffre_affaires: 0
      }

      const docRef = await addDoc(collection(db, this.collectionName), boutiqueData)
      
      const newBoutique: Boutique = {
        id: docRef.id,
        ...boutiqueData,
        created_at: Timestamp.now() // Pour le retour immédiat
      }

      return {
        success: true,
        data: newBoutique,
        message: 'Boutique créée avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la création: ${error.message}`
      }
    }
  }

  // ==================== LECTURE ====================

  /**
   * Récupérer toutes les boutiques (Admin)
   */
  async getAllBoutiques(filters?: FilterParams): Promise<ApiResponse<Boutique[]>> {
    try {
      let boutiqueQuery = query(collection(db, this.collectionName))

      // Filtres
      if (filters?.status) {
        boutiqueQuery = query(boutiqueQuery, where('status', '==', filters.status))
      }

      // Tri par défaut : plus récentes d'abord
      boutiqueQuery = query(boutiqueQuery, orderBy('created_at', 'desc'))

      const querySnapshot = await getDocs(boutiqueQuery)
      const boutiques: Boutique[] = []

      querySnapshot.forEach((doc) => {
        boutiques.push({
          id: doc.id,
          ...doc.data()
        } as Boutique)
      })

      // Filtrer par recherche si nécessaire
      let filteredBoutiques = boutiques
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredBoutiques = boutiques.filter(boutique => 
          boutique.nom_boutique.toLowerCase().includes(searchTerm) ||
          boutique.nom_vendeuse.toLowerCase().includes(searchTerm) ||
          boutique.prenom_vendeuse.toLowerCase().includes(searchTerm) ||
          boutique.numero_whatsapp.includes(searchTerm)
        )
      }

      return {
        success: true,
        data: filteredBoutiques
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer une boutique par ID
   */
  async getBoutiqueById(id: string): Promise<ApiResponse<Boutique>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Boutique non trouvée'
        }
      }

      const boutique: Boutique = {
        id: docSnap.id,
        ...docSnap.data()
      } as Boutique

      return {
        success: true,
        data: boutique
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer une boutique par numéro WhatsApp (pour connexion vendeuse)
   */
  async getBoutiqueByWhatsApp(numeroWhatsApp: string): Promise<ApiResponse<Boutique>> {
    try {
      const boutiqueQuery = query(
        collection(db, this.collectionName),
        where('numero_whatsapp', '==', numeroWhatsApp),
        where('status', '==', 'active')
      )

      const querySnapshot = await getDocs(boutiqueQuery)

      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Aucune boutique active trouvée avec ce numéro'
        }
      }

      const doc = querySnapshot.docs[0]
      const boutique: Boutique = {
        id: doc.id,
        ...doc.data()
      } as Boutique

      return {
        success: true,
        data: boutique
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la recherche: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les boutiques d'un admin
   */
  async getBoutiquesByAdmin(adminId: string): Promise<ApiResponse<Boutique[]>> {
    try {
      const boutiqueQuery = query(
        collection(db, this.collectionName),
        where('created_by', '==', adminId),
        orderBy('created_at', 'desc')
      )

      const querySnapshot = await getDocs(boutiqueQuery)
      const boutiques: Boutique[] = []

      querySnapshot.forEach((doc) => {
        boutiques.push({
          id: doc.id,
          ...doc.data()
        } as Boutique)
      })

      return {
        success: true,
        data: boutiques
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  // ==================== MISE À JOUR ====================

  /**
   * Mettre à jour une boutique
   */
  async updateBoutique(id: string, data: UpdateBoutiqueData): Promise<ApiResponse<Boutique>> {
    try {
      // Vérifier que la boutique existe
      const existingBoutique = await this.getBoutiqueById(id)
      if (!existingBoutique.success) {
        return existingBoutique
      }

      const updateData = {
        ...data,
        updated_at: serverTimestamp()
      }

      const docRef = doc(db, this.collectionName, id)
      await updateDoc(docRef, updateData)

      // Récupérer la boutique mise à jour
      const updatedBoutique = await this.getBoutiqueById(id)
      
      return {
        success: true,
        data: updatedBoutique.data,
        message: 'Boutique mise à jour avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour: ${error.message}`
      }
    }
  }

  /**
   * Changer le statut d'une boutique
   */
  async updateBoutiqueStatus(id: string, status: BoutiqueStatus): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      await updateDoc(docRef, {
        status,
        updated_at: serverTimestamp()
      })

      return {
        success: true,
        message: `Boutique ${status === 'active' ? 'activée' : 'désactivée'} avec succès`
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du changement de statut: ${error.message}`
      }
    }
  }

  /**
   * Mettre à jour les stats d'une boutique (appelé par d'autres services)
   */
  async updateBoutiqueStats(
    id: string, 
    stats: {
      total_produits?: number
      total_ventes?: number
      chiffre_affaires?: number
    }
  ): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      await updateDoc(docRef, {
        ...stats,
        updated_at: serverTimestamp()
      })

      return {
        success: true
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour des stats: ${error.message}`
      }
    }
  }

  // ==================== SUPPRESSION ====================

  /**
   * Supprimer une boutique (Admin seulement - à utiliser avec précaution)
   */
  async deleteBoutique(id: string): Promise<ApiResponse<void>> {
    try {
      // Vérifier que la boutique existe
      const existingBoutique = await this.getBoutiqueById(id)
      if (!existingBoutique.success) {
        return {
          success: false,
          error: 'Boutique non trouvée'
        }
      }

      // TODO: Vérifier qu'il n'y a pas de commandes en cours
      // TODO: Supprimer ou transférer les produits associés

      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)

      return {
        success: true,
        message: 'Boutique supprimée avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la suppression: ${error.message}`
      }
    }
  }

  // ==================== STATISTIQUES ====================

  /**
   * Récupérer les stats rapides pour le dashboard
   */
  async getBoutiquesStats(): Promise<ApiResponse<{
    total_boutiques: number
    boutiques_actives: number
    boutiques_inactives: number
    nouvelles_ce_mois: number
  }>> {
    try {
      // Toutes les boutiques
      const allBoutiquesResult = await this.getAllBoutiques()
      if (!allBoutiquesResult.success) {
        return allBoutiquesResult as any
      }

      const allBoutiques = allBoutiquesResult.data!
      
      // Calculs
      const total_boutiques = allBoutiques.length
      const boutiques_actives = allBoutiques.filter(b => b.status === 'active').length
      const boutiques_inactives = total_boutiques - boutiques_actives
      
      // Nouvelles ce mois
      const debutMois = new Date()
      debutMois.setDate(1)
      debutMois.setHours(0, 0, 0, 0)
      
      const nouvelles_ce_mois = allBoutiques.filter(b => {
        const createdDate = b.created_at.toDate()
        return createdDate >= debutMois
      }).length

      return {
        success: true,
        data: {
          total_boutiques,
          boutiques_actives,
          boutiques_inactives,
          nouvelles_ce_mois
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du calcul des stats: ${error.message}`
      }
    }
  }

  /**
   * Récupérer le top des boutiques par chiffre d'affaires
   */
  async getTopBoutiques(limitCount: number = 10): Promise<ApiResponse<Boutique[]>> {
    try {
      const boutiqueQuery = query(
        collection(db, this.collectionName),
        where('status', '==', 'active'),
        orderBy('chiffre_affaires', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(boutiqueQuery)
      const topBoutiques: Boutique[] = []

      querySnapshot.forEach((doc) => {
        topBoutiques.push({
          id: doc.id,
          ...doc.data()
        } as Boutique)
      })

      return {
        success: true,
        data: topBoutiques
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération du top: ${error.message}`
      }
    }
  }
}

// Instance unique du service
export const boutiqueService = new BoutiqueService()
export default boutiqueService
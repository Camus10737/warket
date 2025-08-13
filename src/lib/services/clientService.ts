// Service Client - Gestion des clients et relations boutiques
// Fichier: /frontend/src/lib/services/clientService.ts

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  Client, 
  ClientBoutique,
  ApiResponse,
  FilterParams 
} from '@/lib/types'

class ClientService {
  private readonly clientsCollection = 'clients'
  private readonly clientBoutiquesCollection = 'client_boutiques'

  // ==================== GESTION CLIENTS ====================

  /**
   * Créer ou récupérer un client par numéro WhatsApp
   */
  async getOrCreateClient(numeroWhatsApp: string, nom?: string): Promise<ApiResponse<Client>> {
    try {
      // Nettoyer le numéro WhatsApp
      const cleanNumber = numeroWhatsApp.replace(/[\s\-\+]/g, '')

      // Chercher un client existant
      const existingClient = await this.getClientByWhatsApp(cleanNumber)
      
      if (existingClient.success && existingClient.data) {
        // Client trouvé, mettre à jour le nom si fourni et différent
        if (nom && nom !== existingClient.data.nom) {
          await this.updateClientName(existingClient.data.id, nom)
          return {
            success: true,
            data: { ...existingClient.data, nom }
          }
        }
        return existingClient
      }

      // Créer un nouveau client
      const clientData = {
        numero_whatsapp: cleanNumber,
        nom: nom || undefined,
        created_at: serverTimestamp(),
        total_commandes: 0,
        total_achats: 0
      }

      const docRef = await addDoc(collection(db, this.clientsCollection), clientData)
      
      const newClient: Client = {
        id: docRef.id,
        ...clientData,
        created_at: Timestamp.now() // Pour le retour immédiat
      }

      return {
        success: true,
        data: newClient,
        message: 'Client créé avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la gestion du client: ${error.message}`
      }
    }
  }

  /**
   * Récupérer un client par numéro WhatsApp
   */
  async getClientByWhatsApp(numeroWhatsApp: string): Promise<ApiResponse<Client>> {
    try {
      const cleanNumber = numeroWhatsApp.replace(/[\s\-\+]/g, '')
      
      const clientQuery = query(
        collection(db, this.clientsCollection),
        where('numero_whatsapp', '==', cleanNumber)
      )

      const querySnapshot = await getDocs(clientQuery)

      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Client non trouvé'
        }
      }

      const doc = querySnapshot.docs[0]
      const client: Client = {
        id: doc.id,
        ...doc.data()
      } as Client

      return {
        success: true,
        data: client
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la recherche: ${error.message}`
      }
    }
  }

  /**
   * Récupérer un client par ID
   */
  async getClientById(id: string): Promise<ApiResponse<Client>> {
    try {
      const docRef = doc(db, this.clientsCollection, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Client non trouvé'
        }
      }

      const client: Client = {
        id: docSnap.id,
        ...docSnap.data()
      } as Client

      return {
        success: true,
        data: client
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Mettre à jour le nom d'un client
   */
  async updateClientName(id: string, nom: string): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.clientsCollection, id)
      await updateDoc(docRef, {
        nom,
        updated_at: serverTimestamp()
      })

      return {
        success: true,
        message: 'Nom du client mis à jour'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour: ${error.message}`
      }
    }
  }

  /**
   * Mettre à jour les stats d'un client
   */
  async updateClientStats(
    id: string, 
    stats: {
      total_commandes?: number
      total_achats?: number
    }
  ): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.clientsCollection, id)
      
      const updateData: any = {
        updated_at: serverTimestamp()
      }

      if (stats.total_commandes !== undefined) {
        updateData.total_commandes = increment(stats.total_commandes)
      }

      if (stats.total_achats !== undefined) {
        updateData.total_achats = increment(stats.total_achats)
      }

      await updateDoc(docRef, updateData)

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

  // ==================== RELATIONS CLIENT-BOUTIQUE ====================

  /**
   * Créer ou récupérer une relation client-boutique
   */
  async getOrCreateClientBoutique(clientId: string, boutiqueId: string, nomClient?: string): Promise<ApiResponse<ClientBoutique>> {
    try {
      // Chercher une relation existante
      const existingRelation = await this.getClientBoutiqueRelation(clientId, boutiqueId)
      
      if (existingRelation.success && existingRelation.data) {
        // Relation trouvée, mettre à jour le nom si fourni
        if (nomClient && nomClient !== existingRelation.data.nom_client) {
          await this.updateClientBoutiqueName(existingRelation.data.id, nomClient)
          return {
            success: true,
            data: { ...existingRelation.data, nom_client: nomClient }
          }
        }
        return existingRelation
      }

      // Créer une nouvelle relation
      const relationData = {
        client_id: clientId,
        boutique_id: boutiqueId,
        nom_client: nomClient || undefined,
        historique_achats: 0,
        created_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, this.clientBoutiquesCollection), relationData)
      
      const newRelation: ClientBoutique = {
        id: docRef.id,
        ...relationData,
        created_at: Timestamp.now() // Pour le retour immédiat
      }

      return {
        success: true,
        data: newRelation,
        message: 'Relation client-boutique créée'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la gestion de la relation: ${error.message}`
      }
    }
  }

  /**
   * Récupérer la relation client-boutique
   */
  async getClientBoutiqueRelation(clientId: string, boutiqueId: string): Promise<ApiResponse<ClientBoutique>> {
    try {
      const relationQuery = query(
        collection(db, this.clientBoutiquesCollection),
        where('client_id', '==', clientId),
        where('boutique_id', '==', boutiqueId)
      )

      const querySnapshot = await getDocs(relationQuery)

      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Relation non trouvée'
        }
      }

      const doc = querySnapshot.docs[0]
      const relation: ClientBoutique = {
        id: doc.id,
        ...doc.data()
      } as ClientBoutique

      return {
        success: true,
        data: relation
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la recherche: ${error.message}`
      }
    }
  }

  /**
   * Récupérer toutes les relations d'une boutique
   */
  async getClientsByBoutique(boutiqueId: string, filters?: FilterParams): Promise<ApiResponse<ClientBoutique[]>> {
    try {
      let relationQuery = query(
        collection(db, this.clientBoutiquesCollection),
        where('boutique_id', '==', boutiqueId),
        orderBy('dernier_achat', 'desc')
      )

      const querySnapshot = await getDocs(relationQuery)
      const relations: ClientBoutique[] = []

      querySnapshot.forEach((doc) => {
        relations.push({
          id: doc.id,
          ...doc.data()
        } as ClientBoutique)
      })

      // Filtrer par recherche si nécessaire
      let filteredRelations = relations
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredRelations = relations.filter(relation => 
          relation.nom_client?.toLowerCase().includes(searchTerm)
        )
      }

      return {
        success: true,
        data: filteredRelations
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer l'historique d'un client avec une boutique
   */
  async getClientBoutiqueHistory(clientId: string, boutiqueId: string): Promise<ApiResponse<{
    relation: ClientBoutique
    client: Client
    stats: {
      nombre_commandes: number
      total_achats: number
      dernier_achat?: Date
      client_depuis: Date
    }
  }>> {
    try {
      // Récupérer la relation
      const relationResult = await this.getClientBoutiqueRelation(clientId, boutiqueId)
      if (!relationResult.success) {
        return relationResult as any
      }

      // Récupérer les infos client
      const clientResult = await this.getClientById(clientId)
      if (!clientResult.success) {
        return clientResult as any
      }

      const relation = relationResult.data!
      const client = clientResult.data!

      // TODO: Récupérer les commandes pour calculer les stats précises
      // Pour l'instant, utiliser les données de la relation
      const stats = {
        nombre_commandes: relation.historique_achats,
        total_achats: relation.historique_achats,
        dernier_achat: relation.dernier_achat?.toDate(),
        client_depuis: relation.created_at.toDate()
      }

      return {
        success: true,
        data: {
          relation,
          client,
          stats
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération de l'historique: ${error.message}`
      }
    }
  }

  /**
   * Mettre à jour le nom du client dans la relation boutique
   */
  async updateClientBoutiqueName(relationId: string, nomClient: string): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.clientBoutiquesCollection, relationId)
      await updateDoc(docRef, {
        nom_client: nomClient,
        updated_at: serverTimestamp()
      })

      return {
        success: true
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour: ${error.message}`
      }
    }
  }

  /**
   * Mettre à jour les stats d'achat d'une relation client-boutique
   */
  async updateClientBoutiqueStats(
    relationId: string,
    stats: {
      historique_achats?: number
      dernier_achat?: boolean // true pour mettre la date actuelle
    }
  ): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.clientBoutiquesCollection, relationId)
      
      const updateData: any = {
        updated_at: serverTimestamp()
      }

      if (stats.historique_achats !== undefined) {
        updateData.historique_achats = increment(stats.historique_achats)
      }

      if (stats.dernier_achat) {
        updateData.dernier_achat = serverTimestamp()
      }

      await updateDoc(docRef, updateData)

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

  // ==================== WORKFLOW BOT WHATSAPP ====================

  /**
   * Gérer un nouveau message d'un client (pour le bot WhatsApp)
   */
  async handleClientMessage(
    numeroWhatsApp: string, 
    boutiqueId: string, 
    nomClient?: string
  ): Promise<ApiResponse<{
    client: Client
    clientBoutique: ClientBoutique
    isNewClient: boolean
    isNewRelation: boolean
  }>> {
    try {
      // 1. Créer ou récupérer le client global
      const clientResult = await this.getOrCreateClient(numeroWhatsApp, nomClient)
      if (!clientResult.success) {
        return clientResult as any
      }

      const client = clientResult.data!
      const isNewClient = clientResult.message === 'Client créé avec succès'

      // 2. Créer ou récupérer la relation client-boutique
      const relationResult = await this.getOrCreateClientBoutique(
        client.id, 
        boutiqueId, 
        nomClient
      )
      if (!relationResult.success) {
        return relationResult as any
      }

      const clientBoutique = relationResult.data!
      const isNewRelation = relationResult.message === 'Relation client-boutique créée'

      return {
        success: true,
        data: {
          client,
          clientBoutique,
          isNewClient,
          isNewRelation
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du traitement du message: ${error.message}`
      }
    }
  }

  // ==================== STATISTIQUES ====================

  /**
   * Récupérer les stats clients d'une boutique
   */
  async getBoutiqueClientStats(boutiqueId: string): Promise<ApiResponse<{
    total_clients: number
    nouveaux_ce_mois: number
    clients_actifs: number // avec achat dans les 30 derniers jours
    client_le_plus_fidele?: ClientBoutique
  }>> {
    try {
      const clientsResult = await this.getClientsByBoutique(boutiqueId)
      if (!clientsResult.success) {
        return clientsResult as any
      }

      const relations = clientsResult.data!
      const total_clients = relations.length

      // Clients nouveaux ce mois
      const debutMois = new Date()
      debutMois.setDate(1)
      debutMois.setHours(0, 0, 0, 0)

      const nouveaux_ce_mois = relations.filter(relation => {
        const createdDate = relation.created_at.toDate()
        return createdDate >= debutMois
      }).length

      // Clients actifs (dernier achat dans les 30 jours)
      const il_y_a_30_jours = new Date()
      il_y_a_30_jours.setDate(il_y_a_30_jours.getDate() - 30)

      const clients_actifs = relations.filter(relation => {
        if (!relation.dernier_achat) return false
        const dernierAchat = relation.dernier_achat.toDate()
        return dernierAchat >= il_y_a_30_jours
      }).length

      // Client le plus fidèle (plus d'achats)
      const client_le_plus_fidele = relations.reduce((max, relation) => {
        return relation.historique_achats > (max?.historique_achats || 0) ? relation : max
      }, relations[0])

      return {
        success: true,
        data: {
          total_clients,
          nouveaux_ce_mois,
          clients_actifs,
          client_le_plus_fidele: client_le_plus_fidele?.historique_achats > 0 ? client_le_plus_fidele : undefined
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
   * Récupérer les top clients d'une boutique
   */
  async getTopClients(boutiqueId: string, limitCount: number = 10): Promise<ApiResponse<ClientBoutique[]>> {
    try {
      const clientsResult = await this.getClientsByBoutique(boutiqueId)
      if (!clientsResult.success) {
        return clientsResult
      }

      const relations = clientsResult.data!
      
      // Trier par nombre d'achats et prendre les top
      const topClients = relations
        .filter(relation => relation.historique_achats > 0)
        .sort((a, b) => b.historique_achats - a.historique_achats)
        .slice(0, limitCount)

      return {
        success: true,
        data: topClients
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
export const clientService = new ClientService()
export default clientService
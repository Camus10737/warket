// Service Conversation - Gestion des messages et escalations bot
// Fichier: /frontend/src/lib/services/conversationService.ts

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
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  Conversation,
  Message,
  ConversationStatus,
  EscalationReason,
  ApiResponse,
  FilterParams 
} from '@/lib/types'
import { clientService } from './clientService'

class ConversationService {
  private readonly conversationsCollection = 'conversations'
  private readonly messagesCollection = 'messages'

  // ==================== GESTION CONVERSATIONS ====================

  /**
   * Créer ou récupérer une conversation active
   */
  async getOrCreateConversation(
    clientBoutiqueId: string
  ): Promise<ApiResponse<Conversation>> {
    try {
      // Chercher une conversation active ou récente
      const activeConversation = await this.getActiveConversation(clientBoutiqueId)
      
      if (activeConversation.success && activeConversation.data) {
        return activeConversation
      }

      // Créer une nouvelle conversation
      const conversationData = {
        client_boutique_id: clientBoutiqueId,
        status: 'bot' as ConversationStatus,
        derniere_activite: serverTimestamp(),
        messages_count: 0,
        traite_par_bot: true,
        created_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, this.conversationsCollection), conversationData)
      
      const newConversation: Conversation = {
        id: docRef.id,
        ...conversationData,
        created_at: Timestamp.now(),
        derniere_activite: Timestamp.now()
      }

      return {
        success: true,
        data: newConversation,
        message: 'Nouvelle conversation créée'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la gestion de la conversation: ${error.message}`
      }
    }
  }

  /**
   * Récupérer la conversation active d'un client-boutique
   */
  async getActiveConversation(clientBoutiqueId: string): Promise<ApiResponse<Conversation>> {
    try {
      const conversationQuery = query(
        collection(db, this.conversationsCollection),
        where('client_boutique_id', '==', clientBoutiqueId),
        where('status', 'in', ['bot', 'escalade']),
        orderBy('derniere_activite', 'desc'),
        limit(1)
      )

      const querySnapshot = await getDocs(conversationQuery)

      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Aucune conversation active trouvée'
        }
      }

      const doc = querySnapshot.docs[0]
      const conversation: Conversation = {
        id: doc.id,
        ...doc.data()
      } as Conversation

      return {
        success: true,
        data: conversation
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la recherche: ${error.message}`
      }
    }
  }

  /**
   * Récupérer une conversation par ID
   */
  async getConversationById(id: string): Promise<ApiResponse<Conversation>> {
    try {
      const docRef = doc(db, this.conversationsCollection, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Conversation non trouvée'
        }
      }

      const conversation: Conversation = {
        id: docSnap.id,
        ...docSnap.data()
      } as Conversation

      return {
        success: true,
        data: conversation
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les conversations d'une boutique
   */
  async getConversationsByBoutique(
    boutiqueId: string, 
    filters?: FilterParams & { status?: ConversationStatus }
  ): Promise<ApiResponse<Conversation[]>> {
    try {
      // D'abord récupérer toutes les relations client-boutique
      const clientsResult = await clientService.getClientsByBoutique(boutiqueId)
      if (!clientsResult.success) {
        return clientsResult as any
      }

      const clientBoutiqueIds = clientsResult.data!.map(cb => cb.id)

      if (clientBoutiqueIds.length === 0) {
        return {
          success: true,
          data: []
        }
      }

      // Récupérer les conversations pour ces relations
      let conversationQuery = query(
        collection(db, this.conversationsCollection),
        where('client_boutique_id', 'in', clientBoutiqueIds.slice(0, 10)), // Firebase limite à 10 pour 'in'
        orderBy('derniere_activite', 'desc')
      )

      // Ajouter le filtre de statut si spécifié
      if (filters?.status) {
        conversationQuery = query(
          collection(db, this.conversationsCollection),
          where('client_boutique_id', 'in', clientBoutiqueIds.slice(0, 10)),
          where('status', '==', filters.status),
          orderBy('derniere_activite', 'desc')
        )
      }

      const querySnapshot = await getDocs(conversationQuery)
      const conversations: Conversation[] = []

      querySnapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        } as Conversation)
      })

      return {
        success: true,
        data: conversations
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les conversations escaladées (pour la vendeuse)
   */
  async getEscalatedConversations(boutiqueId: string): Promise<ApiResponse<Conversation[]>> {
    try {
      return this.getConversationsByBoutique(boutiqueId, { status: 'escalade' })
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération des escalations: ${error.message}`
      }
    }
  }

  /**
   * Escalader une conversation vers la vendeuse
   */
  async escalateConversation(
    conversationId: string, 
    reason: EscalationReason,
    notes?: string
  ): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.conversationsCollection, conversationId)
      
      await updateDoc(docRef, {
        status: 'escalade',
        escalation_reason: reason,
        notes_escalation: notes,
        escalated_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      // TODO: Envoyer notification à la vendeuse (WhatsApp + Push)

      return {
        success: true,
        message: 'Conversation escaladée vers la vendeuse'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de l'escalation: ${error.message}`
      }
    }
  }

  /**
   * Résoudre une conversation escaladée
   */
  async resolveConversation(conversationId: string, resolutionNotes?: string): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.conversationsCollection, conversationId)
      
      await updateDoc(docRef, {
        status: 'resolu',
        resolution_notes: resolutionNotes,
        resolved_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      return {
        success: true,
        message: 'Conversation marquée comme résolue'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la résolution: ${error.message}`
      }
    }
  }

  /**
   * Fermer une conversation
   */
  async closeConversation(conversationId: string): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.conversationsCollection, conversationId)
      
      await updateDoc(docRef, {
        status: 'ferme',
        closed_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      return {
        success: true,
        message: 'Conversation fermée'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la fermeture: ${error.message}`
      }
    }
  }

  // ==================== GESTION MESSAGES ====================

  /**
   * Ajouter un message à une conversation
   */
  async addMessage(
    conversationId: string,
    content: string,
    sender: 'client' | 'bot' | 'vendeuse',
    type: 'text' | 'image' | 'audio' | 'system' = 'text',
    metadata?: {
      bot_processed?: boolean
      bot_confidence?: number
      product_id?: string
      commande_id?: string
    }
  ): Promise<ApiResponse<Message>> {
    try {
      // Créer le message
      const messageData = {
        conversation_id: conversationId,
        sender,
        content,
        type,
        bot_processed: metadata?.bot_processed || false,
        bot_confidence: metadata?.bot_confidence,
        product_id: metadata?.product_id,
        commande_id: metadata?.commande_id,
        timestamp: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, this.messagesCollection), messageData)
      
      // Mettre à jour la conversation
      await this.updateConversationActivity(conversationId)

      const newMessage: Message = {
        id: docRef.id,
        ...messageData,
        timestamp: Timestamp.now()
      }

      return {
        success: true,
        data: newMessage
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de l'ajout du message: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les messages d'une conversation
   */
  async getConversationMessages(
    conversationId: string, 
    limitCount?: number
  ): Promise<ApiResponse<Message[]>> {
    try {
      let messageQuery = query(
        collection(db, this.messagesCollection),
        where('conversation_id', '==', conversationId),
        orderBy('timestamp', 'asc')
      )

      if (limitCount) {
        messageQuery = query(messageQuery, limit(limitCount))
      }

      const querySnapshot = await getDocs(messageQuery)
      const messages: Message[] = []

      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as Message)
      })

      return {
        success: true,
        data: messages
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération des messages: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les derniers messages d'une conversation
   */
  async getRecentMessages(conversationId: string, count: number = 10): Promise<ApiResponse<Message[]>> {
    try {
      const messageQuery = query(
        collection(db, this.messagesCollection),
        where('conversation_id', '==', conversationId),
        orderBy('timestamp', 'desc'),
        limit(count)
      )

      const querySnapshot = await getDocs(messageQuery)
      const messages: Message[] = []

      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as Message)
      })

      // Inverser pour avoir l'ordre chronologique
      return {
        success: true,
        data: messages.reverse()
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  // ==================== WORKFLOW BOT WHATSAPP ====================

  /**
   * Traitement d'un message client par le bot
   */
  async handleBotMessage(
    numeroWhatsApp: string,
    boutiqueId: string,
    messageContent: string,
    nomClient?: string
  ): Promise<ApiResponse<{
    conversation: Conversation
    message: Message
    shouldEscalate: boolean
    escalationReason?: EscalationReason
  }>> {
    try {
      // 1. Gérer le client et la relation
      const clientResult = await clientService.handleClientMessage(
        numeroWhatsApp, 
        boutiqueId, 
        nomClient
      )
      if (!clientResult.success) {
        return clientResult as any
      }

      const { clientBoutique } = clientResult.data!

      // 2. Créer ou récupérer la conversation
      const conversationResult = await this.getOrCreateConversation(clientBoutique.id)
      if (!conversationResult.success) {
        return conversationResult as any
      }

      const conversation = conversationResult.data!

      // 3. Ajouter le message client
      const messageResult = await this.addMessage(
        conversation.id,
        messageContent,
        'client',
        'text'
      )
      if (!messageResult.success) {
        return messageResult as any
      }

      const message = messageResult.data!

      // 4. Analyser si escalation nécessaire
      const escalationAnalysis = this.analyzeForEscalation(messageContent)

      return {
        success: true,
        data: {
          conversation,
          message,
          shouldEscalate: escalationAnalysis.shouldEscalate,
          escalationReason: escalationAnalysis.reason
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du traitement du message bot: ${error.message}`
      }
    }
  }

  /**
   * Réponse du bot à un message client
   */
  async sendBotResponse(
    conversationId: string,
    responseContent: string,
    confidence: number = 1.0,
    metadata?: any
  ): Promise<ApiResponse<Message>> {
    try {
      return await this.addMessage(
        conversationId,
        responseContent,
        'bot',
        'text',
        {
          bot_processed: true,
          bot_confidence: confidence,
          ...metadata
        }
      )
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la réponse bot: ${error.message}`
      }
    }
  }

  // ==================== STATISTIQUES ====================

  /**
   * Récupérer les stats conversations d'une boutique
   */
  async getConversationStats(boutiqueId: string): Promise<ApiResponse<{
    total_conversations: number
    conversations_actives: number
    escalations_en_attente: number
    taux_resolution_bot: number
    temps_reponse_moyen?: number
  }>> {
    try {
      const conversationsResult = await this.getConversationsByBoutique(boutiqueId)
      if (!conversationsResult.success) {
        return conversationsResult as any
      }

      const conversations = conversationsResult.data!
      const total_conversations = conversations.length

      // Conversations actives (bot ou escaladées)
      const conversations_actives = conversations.filter(c => 
        c.status === 'bot' || c.status === 'escalade'
      ).length

      // Escalations en attente
      const escalations_en_attente = conversations.filter(c => 
        c.status === 'escalade'
      ).length

      // Taux de résolution bot (conversations résolues par le bot vs escaladées)
      const resolues_par_bot = conversations.filter(c => 
        c.traite_par_bot && (c.status === 'resolu' || c.status === 'ferme')
      ).length

      const taux_resolution_bot = total_conversations > 0 
        ? (resolues_par_bot / total_conversations) * 100 
        : 0

      return {
        success: true,
        data: {
          total_conversations,
          conversations_actives,
          escalations_en_attente,
          taux_resolution_bot: Math.round(taux_resolution_bot)
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du calcul des stats: ${error.message}`
      }
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Mettre à jour l'activité d'une conversation
   */
  private async updateConversationActivity(conversationId: string): Promise<void> {
    try {
      const docRef = doc(db, this.conversationsCollection, conversationId)
      await updateDoc(docRef, {
        derniere_activite: serverTimestamp(),
        messages_count: serverTimestamp(), // Sera remplacé par un increment dans une version future
        updated_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Erreur mise à jour activité conversation:', error)
    }
  }

  /**
   * Analyser un message pour déterminer si une escalation est nécessaire
   */
  private analyzeForEscalation(messageContent: string): {
    shouldEscalate: boolean
    reason?: EscalationReason
  } {
    const message = messageContent.toLowerCase()

    // Mots-clés pour remises
    const remiseKeywords = ['remise', 'reduction', 'prix', 'moins cher', 'discount', 'promo']
    if (remiseKeywords.some(keyword => message.includes(keyword))) {
      return { shouldEscalate: true, reason: 'remise' }
    }

    // Mots-clés pour livraison
    const livraisonKeywords = ['livraison', 'livrer', 'recevoir', 'quand', 'où', 'adresse']
    if (livraisonKeywords.some(keyword => message.includes(keyword))) {
      return { shouldEscalate: true, reason: 'livraison' }
    }

    // Mots-clés pour problèmes produits
    const problemeKeywords = ['probleme', 'defaut', 'casse', 'abime', 'retour', 'rembourse']
    if (problemeKeywords.some(keyword => message.includes(keyword))) {
      return { shouldEscalate: true, reason: 'probleme_produit' }
    }

    // Messages complexes (trop longs ou questions multiples)
    if (message.length > 200 || (message.match(/\?/g) || []).length > 2) {
      return { shouldEscalate: true, reason: 'complexe' }
    }

    return { shouldEscalate: false }
  }

  /**
   * Supprimer les conversations et messages d'une boutique (cleanup)
   */
  async deleteConversationsByBoutique(boutiqueId: string): Promise<ApiResponse<void>> {
    try {
      const conversationsResult = await this.getConversationsByBoutique(boutiqueId)
      if (!conversationsResult.success) {
        return conversationsResult as any
      }

      const conversations = conversationsResult.data!
      const batch = writeBatch(db)

      // Supprimer toutes les conversations et leurs messages
      for (const conversation of conversations) {
        // Supprimer les messages
        const messagesResult = await this.getConversationMessages(conversation.id)
        if (messagesResult.success) {
          messagesResult.data!.forEach(message => {
            const messageRef = doc(db, this.messagesCollection, message.id)
            batch.delete(messageRef)
          })
        }

        // Supprimer la conversation
        const conversationRef = doc(db, this.conversationsCollection, conversation.id)
        batch.delete(conversationRef)
      }

      await batch.commit()

      return {
        success: true,
        message: `${conversations.length} conversations supprimées`
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la suppression: ${error.message}`
      }
    }
  }
}

// Instance unique du service
export const conversationService = new ConversationService()
export default conversationService
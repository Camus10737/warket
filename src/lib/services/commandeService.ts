// Service Commande - Gestion des commandes et paiements
// Fichier: /frontend/src/lib/services/commandeService.ts

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
  writeBatch,
  runTransaction
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  Commande,
  CommandeProduit,
  CommandeStatus,
  PaymentMethod,
  ApiResponse,
  FilterParams 
} from '@/lib/types'
import { productService } from './productService'
import { clientService } from './clientService'
import { boutiqueService } from './boutiqueService'
import { conversationService } from './conversationService'

class CommandeService {
  private readonly collectionName = 'commandes'

  // ==================== CRÉATION COMMANDES ====================

  /**
   * Créer une nouvelle commande
   */
  async createCommande(
    clientBoutiqueId: string,
    boutiqueId: string,
    produits: CommandeProduit[],
    conversationId?: string,
    reduction?: number
  ): Promise<ApiResponse<Commande>> {
    try {
      // Valider les produits et calculer le total
      const validationResult = await this.validateProductsAndCalculateTotal(produits, boutiqueId)
      if (!validationResult.success) {
        return validationResult as any
      }

      const { total_amount, validated_produits } = validationResult.data!

      // Calculer le montant final avec réduction
      const final_amount = reduction ? total_amount - reduction : total_amount

      if (final_amount <= 0) {
        return {
          success: false,
          error: 'Le montant final doit être supérieur à 0'
        }
      }

      const commandeData = {
        client_boutique_id: clientBoutiqueId,
        boutique_id: boutiqueId,
        conversation_id: conversationId,
        produits: validated_produits,
        total_amount,
        reduction,
        final_amount,
        status: 'en_attente' as CommandeStatus,
        created_at: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, this.collectionName), commandeData)

      // Ajouter un message système à la conversation si fournie
      if (conversationId) {
        await conversationService.addMessage(
          conversationId,
          `Commande créée : ${validated_produits.length} articles pour ${final_amount} GNF`,
          'bot',
          'system',
          { commande_id: docRef.id }
        )
      }

      const newCommande: Commande = {
        id: docRef.id,
        ...commandeData,
        created_at: Timestamp.now()
      }

      return {
        success: true,
        data: newCommande,
        message: 'Commande créée avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la création de la commande: ${error.message}`
      }
    }
  }

  /**
   * Créer une commande rapide (pour le bot WhatsApp)
   */
  async createQuickCommande(
    numeroWhatsApp: string,
    boutiqueId: string,
    productId: string,
    quantite: number,
    conversationId?: string,
    nomClient?: string
  ): Promise<ApiResponse<Commande>> {
    try {
      // Gérer le client et la relation
      const clientResult = await clientService.handleClientMessage(
        numeroWhatsApp,
        boutiqueId,
        nomClient
      )
      if (!clientResult.success) {
        return clientResult as any
      }

      const { clientBoutique } = clientResult.data!

      // Récupérer le produit
      const productResult = await productService.getProductById(productId)
      if (!productResult.success) {
        return productResult as any
      }

      const product = productResult.data!

      // Vérifier le stock
      if (product.stock_quantity < quantite) {
        return {
          success: false,
          error: `Stock insuffisant. Disponible: ${product.stock_quantity}`
        }
      }

      // Créer le produit commande
      const commandeProduit: CommandeProduit = {
        product_id: productId,
        nom_produit: product.nom,
        prix_unitaire: product.prix_affichage,
        quantite,
        total: product.prix_affichage * quantite
      }

      // Créer la commande
      return await this.createCommande(
        clientBoutique.id,
        boutiqueId,
        [commandeProduit],
        conversationId
      )
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la création de la commande rapide: ${error.message}`
      }
    }
  }

  /**
   * Demander validation de paiement à la vendeuse (pour le bot)
   */
  async requestPaymentValidation(
    commandeId: string,
    clientProvidedRef?: string,
    clientMessage?: string
  ): Promise<ApiResponse<void>> {
    try {
      const commandeResult = await this.getCommandeById(commandeId)
      if (!commandeResult.success) {
        return commandeResult as any
      }

      const commande = commandeResult.data!

      if (commande.status !== 'en_attente') {
        return {
          success: false,
          error: 'Seules les commandes en attente peuvent être validées'
        }
      }

      // Marquer la commande comme "en attente de validation"
      const docRef = doc(db, this.collectionName, commandeId)
      await updateDoc(docRef, {
        payment_validation_requested: true,
        client_provided_ref: clientProvidedRef,
        client_payment_message: clientMessage,
        validation_requested_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      // Ajouter message système dans la conversation
      if (commande.conversation_id) {
        const messageContent = clientProvidedRef 
          ? `Client signale paiement effectué - Réf: ${clientProvidedRef}`
          : 'Client signale paiement effectué - Aucune référence fournie'

        await conversationService.addMessage(
          commande.conversation_id,
          messageContent,
          'bot',
          'system',
          { commande_id: commandeId }
        )

        // Escalader la conversation pour notification vendeuse
        await conversationService.escalateConversation(
          commande.conversation_id,
          'autre',
          'Validation paiement requise'
        )
      }

      // TODO: Envoyer notification push/WhatsApp à la vendeuse
      // Format: "Nouveau paiement à valider - Commande #XXX - Montant: XXX GNF"

      return {
        success: true,
        message: 'Demande de validation envoyée à la vendeuse'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la demande de validation: ${error.message}`
      }
    }
  }

  /**
   * Bot: Gérer une déclaration de paiement client
   */
  async handleClientPaymentClaim(
    numeroWhatsApp: string,
    boutiqueId: string,
    commandeId?: string,
    clientProvidedRef?: string,
    conversationId?: string
  ): Promise<ApiResponse<{
    message: string
    requiresVendeuseValidation: boolean
    commande?: Commande
  }>> {
    try {
      let commande: Commande | undefined

      // Si pas de commandeId fourni, chercher la dernière commande en attente du client
      if (!commandeId) {
        // Récupérer le client-boutique
        const clientResult = await clientService.handleClientMessage(numeroWhatsApp, boutiqueId)
        if (!clientResult.success) {
          return clientResult as any
        }

        // Chercher sa dernière commande en attente
        const commandesResult = await this.getCommandesByBoutique(boutiqueId, { status: 'en_attente' })
        if (commandesResult.success) {
          const commandesClient = commandesResult.data!.filter(c => 
            c.client_boutique_id === clientResult.data!.clientBoutique.id
          )
          commande = commandesClient[0] // Plus récente
        }

        if (!commande) {
          return {
            success: false,
            error: 'Aucune commande en attente trouvée pour ce client'
          }
        }
        commandeId = commande.id
      } else {
        const commandeResult = await this.getCommandeById(commandeId)
        if (!commandeResult.success) {
          return commandeResult as any
        }
        commande = commandeResult.data!
      }

      // Demander validation à la vendeuse
      const validationResult = await this.requestPaymentValidation(
        commandeId,
        clientProvidedRef,
        'Client signale avoir effectué le paiement'
      )

      if (!validationResult.success) {
        return validationResult as any
      }

      const responseMessage = clientProvidedRef
        ? `Merci ! Je vérifie avec la vendeuse pour la référence ${clientProvidedRef}. Tu recevras une confirmation bientôt.`
        : 'Merci ! Je demande à la vendeuse de vérifier la réception. Tu recevras une confirmation bientôt.'

      return {
        success: true,
        data: {
          message: responseMessage,
          requiresVendeuseValidation: true,
          commande
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du traitement de la déclaration de paiement: ${error.message}`
      }
    }
  }

  /**
   * Refuser une validation de paiement
   */
  async rejectPaymentValidation(
    commandeId: string,
    raison?: string,
    rejectedBy?: string
  ): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, commandeId)
      await updateDoc(docRef, {
        payment_validation_requested: false,
        payment_rejected: true,
        payment_rejection_reason: raison,
        rejected_by: rejectedBy,
        rejected_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      // Notifier dans la conversation
      const commandeResult = await this.getCommandeById(commandeId)
      if (commandeResult.success && commandeResult.data!.conversation_id) {
        await conversationService.addMessage(
          commandeResult.data!.conversation_id,
          `Paiement non reçu par la vendeuse${raison ? ` - ${raison}` : ''}`,
          'bot',
          'system',
          { commande_id: commandeId }
        )
      }

      return {
        success: true,
        message: 'Validation de paiement refusée'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du refus: ${error.message}`
      }
    }
  }

  /**
   * Valider le paiement d'une commande (Vendeuse uniquement)
   */
  async validatePayment(
    commandeId: string,
    paymentMethod: PaymentMethod,
    referencePayment?: string,
    clientProvidedRef?: string,
    validatedBy?: string
  ): Promise<ApiResponse<Commande>> {
    try {
      const commandeResult = await this.getCommandeById(commandeId)
      if (!commandeResult.success) {
        return commandeResult
      }

      const commande = commandeResult.data!

      if (commande.status !== 'en_attente') {
        return {
          success: false,
          error: 'Seules les commandes en attente peuvent être validées'
        }
      }

      // Utiliser une transaction pour éviter les conflits
      return await runTransaction(db, async (transaction) => {
        const commandeRef = doc(db, this.collectionName, commandeId)
        
        // Mettre à jour la commande
        transaction.update(commandeRef, {
          status: 'payee',
          payment_method: paymentMethod,
          reference_paiement: referencePayment,
          client_provided_ref: clientProvidedRef,
          validated_at: serverTimestamp(),
          validated_by: validatedBy,
          updated_at: serverTimestamp()
        })

        // Décrémenter le stock des produits
        for (const produit of commande.produits) {
          await productService.updateStock(produit.product_id, -produit.quantite)
          await productService.updateProductStats(produit.product_id, { total_ventes: produit.quantite })
        }

        // Mettre à jour les stats client
        await clientService.updateClientStats(commande.client_boutique_id.split('_')[0], {
          total_commandes: 1,
          total_achats: commande.final_amount
        })

        // Mettre à jour les stats de la relation client-boutique
        await clientService.updateClientBoutiqueStats(commande.client_boutique_id, {
          historique_achats: 1,
          dernier_achat: true
        })

        // Mettre à jour les stats boutique
        const statsResult = await boutiqueService.getBoutiqueById(commande.boutique_id)
        if (statsResult.success) {
          const boutique = statsResult.data!
          await boutiqueService.updateBoutiqueStats(commande.boutique_id, {
            total_ventes: (boutique.total_ventes || 0) + 1,
            chiffre_affaires: (boutique.chiffre_affaires || 0) + commande.final_amount
          })
        }

        // Ajouter message système si conversation
        if (commande.conversation_id) {
          await conversationService.addMessage(
            commande.conversation_id,
            `Paiement confirmé - Commande ${commandeId.substring(0, 8)} validée`,
            'bot',
            'system',
            { commande_id: commandeId }
          )
        }

        const updatedCommande: Commande = {
          ...commande,
          status: 'payee',
          payment_method: paymentMethod,
          reference_paiement: referencePayment,
          client_provided_ref: clientProvidedRef,
          validated_at: Timestamp.now(),
          validated_by: validatedBy,
          updated_at: Timestamp.now()
        }

        return {
          success: true,
          data: updatedCommande,
          message: 'Paiement validé avec succès'
        }
      })
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la validation du paiement: ${error.message}`
      }
    }
  }

  /**
   * Marquer une commande comme expédiée
   */
  async markAsShipped(
    commandeId: string,
    adresseLivraison?: string,
    dateLivraisonPrevue?: Date
  ): Promise<ApiResponse<void>> {
    try {
      const commandeResult = await this.getCommandeById(commandeId)
      if (!commandeResult.success) {
        return commandeResult as any
      }

      const commande = commandeResult.data!

      if (commande.status !== 'payee') {
        return {
          success: false,
          error: 'Seules les commandes payées peuvent être expédiées'
        }
      }

      const docRef = doc(db, this.collectionName, commandeId)
      const updateData: any = {
        status: 'expediee',
        updated_at: serverTimestamp()
      }

      if (adresseLivraison) {
        updateData.adresse_livraison = adresseLivraison
      }

      if (dateLivraisonPrevue) {
        updateData.date_livraison_prevue = Timestamp.fromDate(dateLivraisonPrevue)
      }

      await updateDoc(docRef, updateData)

      // Ajouter message système
      if (commande.conversation_id) {
        await conversationService.addMessage(
          commande.conversation_id,
          `Commande expédiée${dateLivraisonPrevue ? ` - Livraison prévue le ${dateLivraisonPrevue.toLocaleDateString()}` : ''}`,
          'bot',
          'system',
          { commande_id: commandeId }
        )
      }

      return {
        success: true,
        message: 'Commande marquée comme expédiée'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de l'expédition: ${error.message}`
      }
    }
  }

  /**
   * Marquer une commande comme livrée
   */
  async markAsDelivered(commandeId: string): Promise<ApiResponse<void>> {
    try {
      const commandeResult = await this.getCommandeById(commandeId)
      if (!commandeResult.success) {
        return commandeResult as any
      }

      const commande = commandeResult.data!

      if (commande.status !== 'expediee') {
        return {
          success: false,
          error: 'Seules les commandes expédiées peuvent être livrées'
        }
      }

      const docRef = doc(db, this.collectionName, commandeId)
      await updateDoc(docRef, {
        status: 'livree',
        date_livraison_reelle: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      // Ajouter message système
      if (commande.conversation_id) {
        await conversationService.addMessage(
          commande.conversation_id,
          'Commande livrée avec succès ✅',
          'bot',
          'system',
          { commande_id: commandeId }
        )
      }

      return {
        success: true,
        message: 'Commande marquée comme livrée'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la livraison: ${error.message}`
      }
    }
  }

  /**
   * Signaler un problème avec une commande
   */
  async reportProblem(
    commandeId: string,
    problemeDescription: string,
    notesVendeuse?: string
  ): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, commandeId)
      await updateDoc(docRef, {
        status: 'probleme',
        probleme_description: problemeDescription,
        notes_vendeuse: notesVendeuse,
        updated_at: serverTimestamp()
      })

      // Récupérer la commande pour la conversation
      const commandeResult = await this.getCommandeById(commandeId)
      if (commandeResult.success && commandeResult.data!.conversation_id) {
        await conversationService.addMessage(
          commandeResult.data!.conversation_id,
          `Problème signalé: ${problemeDescription}`,
          'bot',
          'system',
          { commande_id: commandeId }
        )

        // Escalader la conversation automatiquement
        await conversationService.escalateConversation(
          commandeResult.data!.conversation_id,
          'probleme_produit',
          problemeDescription
        )
      }

      return {
        success: true,
        message: 'Problème signalé et conversation escaladée'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors du signalement: ${error.message}`
      }
    }
  }

  /**
   * Annuler une commande
   */
  async cancelCommande(commandeId: string, raison?: string): Promise<ApiResponse<void>> {
    try {
      const commandeResult = await this.getCommandeById(commandeId)
      if (!commandeResult.success) {
        return commandeResult as any
      }

      const commande = commandeResult.data!

      if (commande.status === 'livree') {
        return {
          success: false,
          error: 'Impossible d\'annuler une commande déjà livrée'
        }
      }

      // Si la commande était payée, remettre le stock
      if (commande.status === 'payee' || commande.status === 'expediee') {
        for (const produit of commande.produits) {
          await productService.updateStock(produit.product_id, produit.quantite)
        }
      }

      const docRef = doc(db, this.collectionName, commandeId)
      await updateDoc(docRef, {
        status: 'annulee',
        notes_vendeuse: raison,
        updated_at: serverTimestamp()
      })

      // Ajouter message système
      if (commande.conversation_id) {
        await conversationService.addMessage(
          commande.conversation_id,
          `Commande annulée${raison ? ` - Raison: ${raison}` : ''}`,
          'bot',
          'system',
          { commande_id: commandeId }
        )
      }

      return {
        success: true,
        message: 'Commande annulée avec succès'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de l'annulation: ${error.message}`
      }
    }
  }

  // ==================== LECTURE ====================

  /**
   * Récupérer une commande par ID
   */
  async getCommandeById(id: string): Promise<ApiResponse<Commande>> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Commande non trouvée'
        }
      }

      const commande: Commande = {
        id: docSnap.id,
        ...docSnap.data()
      } as Commande

      return {
        success: true,
        data: commande
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les commandes d'une boutique
   */
  async getCommandesByBoutique(
    boutiqueId: string,
    filters?: FilterParams & { status?: CommandeStatus; dateFrom?: Date; dateTo?: Date }
  ): Promise<ApiResponse<Commande[]>> {
    try {
      let commandeQuery = query(
        collection(db, this.collectionName),
        where('boutique_id', '==', boutiqueId),
        orderBy('created_at', 'desc')
      )

      // Filtrer par statut
      if (filters?.status) {
        commandeQuery = query(
          collection(db, this.collectionName),
          where('boutique_id', '==', boutiqueId),
          where('status', '==', filters.status),
          orderBy('created_at', 'desc')
        )
      }

      const querySnapshot = await getDocs(commandeQuery)
      let commandes: Commande[] = []

      querySnapshot.forEach((doc) => {
        commandes.push({
          id: doc.id,
          ...doc.data()
        } as Commande)
      })

      // Filtrer par dates si spécifiées
      if (filters?.dateFrom || filters?.dateTo) {
        commandes = commandes.filter(commande => {
          const commandeDate = commande.created_at.toDate()
          if (filters.dateFrom && commandeDate < filters.dateFrom) return false
          if (filters.dateTo && commandeDate > filters.dateTo) return false
          return true
        })
      }

      return {
        success: true,
        data: commandes
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération: ${error.message}`
      }
    }
  }

  /**
   * Récupérer les commandes en attente de validation
   */
  async getPendingCommandes(boutiqueId: string): Promise<ApiResponse<Commande[]>> {
    try {
      return this.getCommandesByBoutique(boutiqueId, { status: 'en_attente' })
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération des commandes en attente: ${error.message}`
      }
    }
  }

  // ==================== STATISTIQUES ====================

  /**
   * Récupérer les stats commandes d'une boutique
   */
  async getCommandeStats(boutiqueId: string): Promise<ApiResponse<{
    total_commandes: number
    commandes_en_attente: number
    commandes_payees: number
    chiffre_affaires_total: number
    chiffre_affaires_ce_mois: number
    panier_moyen: number
  }>> {
    try {
      const commandesResult = await this.getCommandesByBoutique(boutiqueId)
      if (!commandesResult.success) {
        return commandesResult as any
      }

      const commandes = commandesResult.data!
      const total_commandes = commandes.length
      const commandes_en_attente = commandes.filter(c => c.status === 'en_attente').length
      const commandes_payees = commandes.filter(c => 
        ['payee', 'expediee', 'livree'].includes(c.status)
      ).length

      // Chiffre d'affaires total (commandes payées uniquement)
      const chiffre_affaires_total = commandes
        .filter(c => ['payee', 'expediee', 'livree'].includes(c.status))
        .reduce((total, commande) => total + commande.final_amount, 0)

      // Chiffre d'affaires ce mois
      const debutMois = new Date()
      debutMois.setDate(1)
      debutMois.setHours(0, 0, 0, 0)

      const chiffre_affaires_ce_mois = commandes
        .filter(c => {
          const isPayee = ['payee', 'expediee', 'livree'].includes(c.status)
          const isCeMois = c.created_at.toDate() >= debutMois
          return isPayee && isCeMois
        })
        .reduce((total, commande) => total + commande.final_amount, 0)

      // Panier moyen
      const panier_moyen = commandes_payees > 0 ? chiffre_affaires_total / commandes_payees : 0

      return {
        success: true,
        data: {
          total_commandes,
          commandes_en_attente,
          commandes_payees,
          chiffre_affaires_total,
          chiffre_affaires_ce_mois,
          panier_moyen: Math.round(panier_moyen)
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
   * Valider les produits et calculer le total d'une commande
   */
  private async validateProductsAndCalculateTotal(
    produits: CommandeProduit[],
    boutiqueId: string
  ): Promise<ApiResponse<{
    total_amount: number
    validated_produits: CommandeProduit[]
  }>> {
    try {
      if (produits.length === 0) {
        return {
          success: false,
          error: 'La commande doit contenir au moins un produit'
        }
      }

      let total_amount = 0
      const validated_produits: CommandeProduit[] = []

      for (const produitCommande of produits) {
        // Vérifier que le produit existe et appartient à la boutique
        const productResult = await productService.getProductById(produitCommande.product_id)
        if (!productResult.success) {
          return {
            success: false,
            error: `Produit ${produitCommande.product_id} non trouvé`
          }
        }

        const product = productResult.data!
        
        if (product.boutique_id !== boutiqueId) {
          return {
            success: false,
            error: `Produit ${product.nom} n'appartient pas à cette boutique`
          }
        }

        if (product.status !== 'available') {
          return {
            success: false,
            error: `Produit ${product.nom} non disponible`
          }
        }

        if (product.stock_quantity < produitCommande.quantite) {
          return {
            success: false,
            error: `Stock insuffisant pour ${product.nom}. Disponible: ${product.stock_quantity}`
          }
        }

        // Valider et recalculer le total
        const produitValide: CommandeProduit = {
          product_id: produitCommande.product_id,
          nom_produit: product.nom,
          prix_unitaire: produitCommande.prix_unitaire,
          quantite: produitCommande.quantite,
          total: produitCommande.prix_unitaire * produitCommande.quantite
        }

        validated_produits.push(produitValide)
        total_amount += produitValide.total
      }

      return {
        success: true,
        data: {
          total_amount,
          validated_produits
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la validation: ${error.message}`
      }
    }
  }
}

// Instance unique du service
export const commandeService = new CommandeService()
export default commandeService
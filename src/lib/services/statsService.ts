// Service Stats - Analytics et statistiques globales
// Fichier: /frontend/src/lib/services/statsService.ts

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
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  BoutiqueStats,
  AdminStats,
  ApiResponse 
} from '@/lib/types'
import { boutiqueService } from './boutiqueService'
import { productService } from './productService'
import { clientService } from './clientService'
import { conversationService } from './conversationService'
import { commandeService } from './commandeService'

class StatsService {
  private readonly boutiqueStatsCollection = 'boutique_stats'
  private readonly adminStatsCollection = 'admin_stats'

  // ==================== STATS BOUTIQUE ====================

  /**
   * Générer les stats complètes d'une boutique
   */
  async generateBoutiqueStats(boutiqueId: string): Promise<ApiResponse<{
    boutique: any
    produits: any
    clients: any
    conversations: any
    commandes: any
    resume: {
      score_performance: number
      tendance: 'hausse' | 'baisse' | 'stable'
      points_forts: string[]
      axes_amelioration: string[]
    }
  }>> {
    try {
      // 1. Stats boutique de base
      const boutiqueResult = await boutiqueService.getBoutiqueById(boutiqueId)
      if (!boutiqueResult.success) {
        return boutiqueResult as any
      }

      // 2. Stats produits
      const produitsStats = await productService.getBoutiqueProductStats(boutiqueId)
      
      // 3. Stats clients
      const clientsStats = await clientService.getBoutiqueClientStats(boutiqueId)
      
      // 4. Stats conversations
      const conversationsStats = await conversationService.getConversationStats(boutiqueId)
      
      // 5. Stats commandes
      const commandesStats = await commandeService.getCommandeStats(boutiqueId)

      // 6. Calculer le score de performance global
      const performanceData = await this.calculatePerformanceScore(boutiqueId, {
        produits: produitsStats.data,
        clients: clientsStats.data,
        conversations: conversationsStats.data,
        commandes: commandesStats.data
      })

      return {
        success: true,
        data: {
          boutique: boutiqueResult.data,
          produits: produitsStats.data,
          clients: clientsStats.data,
          conversations: conversationsStats.data,
          commandes: commandesStats.data,
          resume: performanceData
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la génération des stats: ${error.message}`
      }
    }
  }

  /**
   * Stats rapides pour le dashboard vendeuse
   */
  async getBoutiqueQuickStats(boutiqueId: string): Promise<ApiResponse<{
    total_produits: number
    produits_rupture: number
    commandes_en_attente: number
    chiffre_affaires_ce_mois: number
    nouveaux_clients_ce_mois: number
    taux_resolution_bot: number
  }>> {
    try {
      const [produitsResult, commandesResult, clientsResult, conversationsResult] = await Promise.all([
        productService.getBoutiqueProductStats(boutiqueId),
        commandeService.getCommandeStats(boutiqueId),
        clientService.getBoutiqueClientStats(boutiqueId),
        conversationService.getConversationStats(boutiqueId)
      ])

      if (!produitsResult.success || !commandesResult.success || 
          !clientsResult.success || !conversationsResult.success) {
        return {
          success: false,
          error: 'Erreur lors de la récupération des stats'
        }
      }

      return {
        success: true,
        data: {
          total_produits: produitsResult.data!.total_produits,
          produits_rupture: produitsResult.data!.produits_rupture,
          commandes_en_attente: commandesResult.data!.commandes_en_attente,
          chiffre_affaires_ce_mois: commandesResult.data!.chiffre_affaires_ce_mois,
          nouveaux_clients_ce_mois: clientsResult.data!.nouveaux_ce_mois,
          taux_resolution_bot: conversationsResult.data!.taux_resolution_bot
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération des stats rapides: ${error.message}`
      }
    }
  }

  /**
   * Sauvegarder les stats quotidiennes d'une boutique
   */
  async saveDailyBoutiqueStats(boutiqueId: string, date?: Date): Promise<ApiResponse<BoutiqueStats>> {
    try {
      const statsDate = date || new Date()
      const dateStr = statsDate.toISOString().split('T')[0] // YYYY-MM-DD

      // Générer les stats du jour
      const statsResult = await this.generateBoutiqueStats(boutiqueId)
      if (!statsResult.success) {
        return statsResult as any
      }

      const { produits, clients, conversations, commandes } = statsResult.data!

      const dailyStats: Omit<BoutiqueStats, 'updated_at'> = {
        boutique_id: boutiqueId,
        date: dateStr,
        
        // Messages
        messages_recus: conversations?.total_conversations || 0,
        messages_traites_bot: Math.round((conversations?.taux_resolution_bot || 0) * (conversations?.total_conversations || 0) / 100),
        messages_escalades: conversations?.escalations_en_attente || 0,
        
        // Ventes
        commandes_creees: commandes?.total_commandes || 0,
        commandes_payees: commandes?.commandes_payees || 0,
        chiffre_affaires: commandes?.chiffre_affaires_ce_mois || 0,
        
        // Produits (simplified tracking)
        produits_demandes: {},
        produits_vendus: {},
        
        // Problèmes
        problemes_livraison: 0, // TODO: calculer depuis les commandes
        problemes_produits: 0
      }

      const docRef = await addDoc(collection(db, this.boutiqueStatsCollection), {
        ...dailyStats,
        updated_at: serverTimestamp()
      })

      return {
        success: true,
        data: {
          ...dailyStats,
          updated_at: Timestamp.now()
        } as BoutiqueStats,
        message: 'Stats quotidiennes sauvegardées'
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la sauvegarde: ${error.message}`
      }
    }
  }

  // ==================== STATS ADMIN ====================

  /**
   * Générer les stats globales pour l'admin
   */
  async generateAdminStats(): Promise<ApiResponse<{
    global: {
      total_boutiques: number
      boutiques_actives: number
      total_produits: number
      total_clients: number
      total_commandes: number
      chiffre_affaires_global: number
    }
    performance: {
      taux_resolution_bot_global: number
      temps_reponse_moyen: number
      taux_conversion_global: number
      croissance_ca_mensuelle: number
    }
    top_performers: {
      top_boutiques: Array<{ boutique: any, stats: any }>
      top_produits: Array<{ produit: any, ventes: number }>
      top_categories: Array<{ category: string, ventes: number }>
    }
    alertes: Array<{
      type: 'stock' | 'performance' | 'client'
      boutique_id: string
      message: string
      severity: 'low' | 'medium' | 'high'
    }>
  }>> {
    try {
      // 1. Stats globales de base
      const boutiquesStatsResult = await boutiqueService.getBoutiquesStats()
      if (!boutiquesStatsResult.success) {
        return boutiquesStatsResult as any
      }

      const boutiquesStats = boutiquesStatsResult.data!

      // 2. Récupérer toutes les boutiques actives
      const boutiquesResult = await boutiqueService.getAllBoutiques({ status: 'active' })
      if (!boutiquesResult.success) {
        return boutiquesResult as any
      }

      const boutiques = boutiquesResult.data!

      // 3. Calculer les stats agrégées
      let total_produits = 0
      let total_clients = 0
      let total_commandes = 0
      let chiffre_affaires_global = 0
      const topBoutiquesData: Array<{ boutique: any, stats: any }> = []

      for (const boutique of boutiques) {
        const [produitsStats, clientsStats, commandesStats] = await Promise.all([
          productService.getBoutiqueProductStats(boutique.id),
          clientService.getBoutiqueClientStats(boutique.id),
          commandeService.getCommandeStats(boutique.id)
        ])

        if (produitsStats.success) total_produits += produitsStats.data!.total_produits
        if (clientsStats.success) total_clients += clientsStats.data!.total_clients
        if (commandesStats.success) {
          total_commandes += commandesStats.data!.total_commandes
          chiffre_affaires_global += commandesStats.data!.chiffre_affaires_total
        }

        topBoutiquesData.push({
          boutique,
          stats: {
            produits: produitsStats.data,
            clients: clientsStats.data,
            commandes: commandesStats.data
          }
        })
      }

      // 4. Trier les top performers
      const top_boutiques = topBoutiquesData
        .sort((a, b) => (b.stats.commandes?.chiffre_affaires_total || 0) - (a.stats.commandes?.chiffre_affaires_total || 0))
        .slice(0, 5)

      // 5. Top produits globaux
      const topProduitsResult = await productService.getTopProducts(10)
      const top_produits = topProduitsResult.success ? topProduitsResult.data!.map(p => ({
        produit: p,
        ventes: p.total_ventes || 0
      })) : []

      // 6. Générer alertes
      const alertes = await this.generateAlerts(boutiques)

      return {
        success: true,
        data: {
          global: {
            total_boutiques: boutiquesStats.total_boutiques,
            boutiques_actives: boutiquesStats.boutiques_actives,
            total_produits,
            total_clients,
            total_commandes,
            chiffre_affaires_global
          },
          performance: {
            taux_resolution_bot_global: 75, // TODO: calculer réellement
            temps_reponse_moyen: 5, // TODO: calculer réellement
            taux_conversion_global: total_commandes > 0 ? (total_commandes / total_clients) * 100 : 0,
            croissance_ca_mensuelle: 15 // TODO: calculer réellement
          },
          top_performers: {
            top_boutiques,
            top_produits,
            top_categories: [] // TODO: implémenter
          },
          alertes
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la génération des stats admin: ${error.message}`
      }
    }
  }

  /**
   * Stats rapides pour le dashboard admin
   */
  async getAdminQuickStats(): Promise<ApiResponse<{
    boutiques_actives: number
    nouveaux_clients_aujourd_hui: number
    commandes_en_attente_global: number
    chiffre_affaires_aujourd_hui: number
    alertes_critiques: number
  }>> {
    try {
      const boutiquesResult = await boutiqueService.getAllBoutiques({ status: 'active' })
      if (!boutiquesResult.success) {
        return boutiquesResult as any
      }

      const boutiques = boutiquesResult.data!
      let commandes_en_attente_global = 0
      let chiffre_affaires_aujourd_hui = 0

      // Agréger les stats de toutes les boutiques
      for (const boutique of boutiques) {
        const commandesStats = await commandeService.getCommandeStats(boutique.id)
        if (commandesStats.success) {
          commandes_en_attente_global += commandesStats.data!.commandes_en_attente
          // TODO: calculer CA aujourd'hui spécifiquement
        }
      }

      return {
        success: true,
        data: {
          boutiques_actives: boutiques.length,
          nouveaux_clients_aujourd_hui: 0, // TODO: calculer
          commandes_en_attente_global,
          chiffre_affaires_aujourd_hui,
          alertes_critiques: 0 // TODO: calculer
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération des stats admin: ${error.message}`
      }
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Calculer le score de performance d'une boutique
   */
  private async calculatePerformanceScore(
    boutiqueId: string, 
    stats: any
  ): Promise<{
    score_performance: number
    tendance: 'hausse' | 'baisse' | 'stable'
    points_forts: string[]
    axes_amelioration: string[]
  }> {
    const points_forts: string[] = []
    const axes_amelioration: string[] = []
    let score = 0

    // Critères de performance (sur 100 points)
    
    // 1. Taux de résolution bot (25 points)
    const tauxBot = stats.conversations?.taux_resolution_bot || 0
    score += Math.min(25, (tauxBot / 100) * 25)
    if (tauxBot > 70) points_forts.push('Excellent taux de résolution automatique')
    if (tauxBot < 50) axes_amelioration.push('Améliorer la configuration du bot')

    // 2. Diversité produits (20 points)
    const nbProduits = stats.produits?.total_produits || 0
    score += Math.min(20, (nbProduits / 20) * 20)
    if (nbProduits > 15) points_forts.push('Large gamme de produits')
    if (nbProduits < 5) axes_amelioration.push('Enrichir le catalogue produits')

    // 3. Fidélisation clients (25 points)
    const clientsActifs = stats.clients?.clients_actifs || 0
    const totalClients = stats.clients?.total_clients || 1
    const tauxFidelisation = (clientsActifs / totalClients) * 100
    score += Math.min(25, (tauxFidelisation / 50) * 25)
    if (tauxFidelisation > 30) points_forts.push('Bonne fidélisation client')
    if (tauxFidelisation < 15) axes_amelioration.push('Améliorer la fidélisation')

    // 4. Performance ventes (30 points)
    const panierMoyen = stats.commandes?.panier_moyen || 0
    score += Math.min(30, (panierMoyen / 100000) * 30) // 100k GNF de référence
    if (panierMoyen > 75000) points_forts.push('Panier moyen élevé')
    if (panierMoyen < 25000) axes_amelioration.push('Augmenter la valeur du panier')

    // Gestion stock
    const tauxRupture = (stats.produits?.produits_rupture || 0) / (stats.produits?.total_produits || 1) * 100
    if (tauxRupture < 10) points_forts.push('Bonne gestion des stocks')
    if (tauxRupture > 25) axes_amelioration.push('Réduire les ruptures de stock')

    return {
      score_performance: Math.round(score),
      tendance: 'stable', // TODO: calculer en comparant avec période précédente
      points_forts,
      axes_amelioration
    }
  }

  /**
   * Générer des alertes pour l'admin
   */
  private async generateAlerts(boutiques: any[]): Promise<Array<{
    type: 'stock' | 'performance' | 'client'
    boutique_id: string
    message: string
    severity: 'low' | 'medium' | 'high'
  }>> {
    const alertes: any[] = []

    for (const boutique of boutiques) {
      // Alertes stock
      const produitsStats = await productService.getBoutiqueProductStats(boutique.id)
      if (produitsStats.success) {
        const tauxRupture = (produitsStats.data!.produits_rupture / produitsStats.data!.total_produits) * 100
        if (tauxRupture > 30) {
          alertes.push({
            type: 'stock',
            boutique_id: boutique.id,
            message: `${Math.round(tauxRupture)}% des produits en rupture`,
            severity: 'high'
          })
        }
      }

      // Alertes performance
      const conversationsStats = await conversationService.getConversationStats(boutique.id)
      if (conversationsStats.success) {
        const escalations = conversationsStats.data!.escalations_en_attente
        if (escalations > 5) {
          alertes.push({
            type: 'performance',
            boutique_id: boutique.id,
            message: `${escalations} conversations en attente de réponse`,
            severity: 'medium'
          })
        }
      }
    }

    return alertes
  }

  /**
   * Exporter les stats d'une boutique (pour rapports)
   */
  async exportBoutiqueStats(
    boutiqueId: string, 
    dateFrom: Date, 
    dateTo: Date
  ): Promise<ApiResponse<{
    boutique_info: any
    periode: string
    resume_executif: any
    donnees_detaillees: any
  }>> {
    try {
      const boutiqueResult = await boutiqueService.getBoutiqueById(boutiqueId)
      if (!boutiqueResult.success) {
        return boutiqueResult as any
      }

      const statsResult = await this.generateBoutiqueStats(boutiqueId)
      if (!statsResult.success) {
        return statsResult as any
      }

      return {
        success: true,
        data: {
          boutique_info: boutiqueResult.data,
          periode: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
          resume_executif: statsResult.data!.resume,
          donnees_detaillees: {
            produits: statsResult.data!.produits,
            clients: statsResult.data!.clients,
            conversations: statsResult.data!.conversations,
            commandes: statsResult.data!.commandes
          }
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de l'export: ${error.message}`
      }
    }
  }
}

// Instance unique du service
export const statsService = new StatsService()
export default statsService
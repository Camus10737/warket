// lib/services/index.ts - VERSION CORRIGÉE

import authService from './authService'
import boutiqueService from './boutiqueService'
import clientService from './clientService'
import commandeService from './commandeService'
import conversationService from './conversationService'
import productService from './productService'
import statsService from './statsService'
import botService from './botService' // IMPORT par défaut
import { storageService } from './storageService'

// Export des services
export { authService }
export { boutiqueService }
export { productService }
export { clientService }
export { conversationService }
export { commandeService }
export { statsService }
export { storageService }
export { botService } // EXPORT du botService

// Export des types depuis le fichier types
export * from '@/lib/types'

// Helper pour importer tous les services d'un coup
export const services = {
  auth: authService,
  boutique: boutiqueService,
  product: productService,
  client: clientService,
  conversation: conversationService,
  commande: commandeService,
  stats: statsService,
  storage: storageService,
  bot: botService, // AJOUTER le botService ici
} as const

// Types utilitaires pour TypeScript
export type ServiceType = typeof services
export type ServiceKey = keyof ServiceType
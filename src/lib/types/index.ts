// Types principaux — MVP
// Fichier: /frontend/src/lib/types/index.ts

import { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'vendeuse'
export type UserStatus = 'active' | 'inactive'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  created_at: Timestamp
  updated_at?: Timestamp
}

export type BoutiqueStatus = 'active' | 'inactive' | 'suspended'

export interface Boutique {
  id: string
  nom_boutique: string
  nom_vendeuse: string
  prenom_vendeuse: string
  numero_whatsapp: string
  email?: string
  adresse?: string
  numero_depot?: string
  created_by: string
  status: BoutiqueStatus
  created_at: Timestamp
  updated_at?: Timestamp
  total_produits?: number
  total_ventes?: number
  chiffre_affaires?: number
}

export type ProductCategory =
  | 'Vêtements'
  | 'Chaussures'
  | 'Sacs & Accessoires'
  | 'Téléphones & Électronique'
  | 'Cosmétiques & Beauté'
  | 'Bijoux'
  | 'Produits alimentaires'
  | 'Articles ménagers'
  | 'Autre'

export type ProductStatus = 'available' | 'out_of_stock' | 'discontinued'

export interface Product {
  id: string
  boutique_id: string
  nom: string
  description?: string
  category: ProductCategory
  category_custom?: string
  prix_affichage: number
  prix_min: number
  stock_quantity: number
  images: string[]
  status: ProductStatus
  created_at: Timestamp
  updated_at?: Timestamp
  total_ventes?: number
  total_demandes?: number
}

export interface Client {
  id: string
  numero_whatsapp: string
  nom?: string
  created_at: Timestamp
  total_commandes: number
  total_achats: number
}

export interface ClientBoutique {
  id: string
  client_id: string
  boutique_id: string
  nom_client?: string
  historique_achats: number
  dernier_achat?: Timestamp
  created_at: Timestamp
}

export type ConversationStatus = 'bot' | 'escalade' | 'resolu' | 'ferme'
export type EscalationReason = 'remise' | 'livraison' | 'probleme_produit' | 'complexe' | 'autre'

export interface Conversation {
  id: string
  client_boutique_id: string
  status: ConversationStatus
  escalation_reason?: EscalationReason
  derniere_activite: Timestamp
  messages_count: number
  traite_par_bot: boolean
  created_at: Timestamp
  updated_at?: Timestamp
}

export interface Message {
  id: string
  conversation_id: string
  sender: 'client' | 'bot' | 'vendeuse' | 'system'
  content: string
  type: 'text' | 'image' | 'audio' | 'system'
  bot_processed?: boolean
  bot_confidence?: number
  timestamp: Timestamp
}

export type CommandeStatus = 'en_attente' | 'payee' | 'expediee' | 'livree' | 'probleme' | 'annulee'
export type PaymentMethod = 'orange_money' | 'mtn_money' | 'cash'

export interface CommandeProduit {
  product_id: string
  nom_produit: string
  prix_unitaire: number
  quantite: number
  total: number
}

export interface Commande {
  id: string
  client_boutique_id: string
  boutique_id: string
  conversation_id?: string
  produits: CommandeProduit[]
  total_amount: number
  reduction?: number
  final_amount: number
  payment_method?: PaymentMethod
  numero_depot?: string
  reference_paiement?: string
  client_provided_ref?: string
  payment_validation_requested?: boolean
  client_payment_message?: string
  validation_requested_at?: Timestamp
  payment_rejected?: boolean
  payment_rejection_reason?: string
  rejected_by?: string
  rejected_at?: Timestamp
  status: CommandeStatus
  notes_vendeuse?: string
  probleme_description?: string
  adresse_livraison?: string
  date_livraison_prevue?: Timestamp
  date_livraison_reelle?: Timestamp
  created_at: Timestamp
  updated_at?: Timestamp
  validated_at?: Timestamp
  validated_by?: string
}

export interface BoutiqueStats {
  boutique_id: string
  date: string
  messages_recus: number
  messages_traites_bot: number
  messages_escalades: number
  temps_reponse_moyen?: number
  commandes_creees: number
  commandes_payees: number
  chiffre_affaires: number
  produits_demandes: { [product_id: string]: number }
  produits_vendus: { [product_id: string]: number }
  problemes_livraison: number
  problemes_produits: number
  updated_at: Timestamp
}

export interface AdminStats {
  date: string
  total_boutiques_actives: number
  total_messages_traites: number
  total_commandes: number
  total_chiffre_affaires: number
  taux_resolution_bot: number
  temps_reponse_moyen: number
  top_boutiques: { boutique_id: string; chiffre_affaires: number }[]
  top_produits: { product_id: string; nom: string; ventes: number }[]
  updated_at: Timestamp
}

export interface BotConfig {
  boutique_id: string
  message_bienvenue: string
  message_produit_indisponible: string
  message_escalation: string
  auto_escalation_enabled: boolean
  max_prix_negotiation_percent: number
  whatsapp_connected: boolean
  last_connection?: Timestamp
  session_status: 'connected' | 'disconnected' | 'error'
  updated_at: Timestamp
}

export type CreateBoutiqueData = Omit<Boutique, 'id' | 'created_at' | 'updated_at' | 'total_produits' | 'total_ventes' | 'chiffre_affaires'>
export type CreateProductData = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'total_ventes' | 'total_demandes'>
export type UpdateBoutiqueData = Partial<Pick<Boutique, 'nom_boutique' | 'email' | 'adresse' | 'numero_depot' | 'status'>>
export type UpdateProductData = Partial<Pick<Product, 'nom' | 'description' | 'prix_affichage' | 'prix_min' | 'stock_quantity' | 'status' | 'images'>>

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface FilterParams {
  status?: string
  category?: string
  boutique_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// Config minimale (utilisée par authService)
export interface SystemConfig {
  maintenance_mode: boolean
  auto_backup: boolean
  email_notifications: boolean
  max_boutiques: number
  session_timeout: number
  bot_welcome_template: string
  bot_escalation_threshold: number
  bot_auto_response_delay: number
  max_negotiation_percent: number
  max_login_attempts: number
  require_2fa: boolean
  password_min_length: number
}

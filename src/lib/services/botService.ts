// Service Bot WhatsApp - Version simplifiée
// Fichier: /frontend/src/lib/services/botService.ts

import { ApiResponse } from '@/lib/types'

export interface BotStatus {
  status: 'disconnected' | 'connecting' | 'qr' | 'connected'
  qr?: string
  connected_at?: string
  uptime?: number
  message?: string
}

class BotService {
  private readonly BOT_API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001'

  /**
   * Connecter le bot WhatsApp pour une boutique
   */
  async connectBot(boutiqueId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.BOT_API_BASE}/api/bot/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boutiqueId })
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        data,
        message: data.message
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur connexion bot: ${error.message}`
      }
    }
  }

  /**
   * Déconnecter le bot WhatsApp
   */
  async disconnectBot(boutiqueId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.BOT_API_BASE}/api/bot/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boutiqueId })
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        message: data.message
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur déconnexion bot: ${error.message}`
      }
    }
  }

  /**
   * Récupérer le statut du bot
   */
  async getBotStatus(boutiqueId: string): Promise<ApiResponse<BotStatus>> {
    try {
      const response = await fetch(`${this.BOT_API_BASE}/api/bot/status/${boutiqueId}`)

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        data: data
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur récupération statut: ${error.message}`,
        data: {
          status: 'disconnected'
        }
      }
    }
  }

  /**
   * Écouter les événements temps réel du bot (version polling simple)
   */
  subscribeToBot(
    boutiqueId: string,
    callbacks: {
      onQRCode?: (qr: string) => void
      onStatusChange?: (status: string) => void
      onError?: (error: string) => void
      onConnected?: () => void
      onDisconnected?: (reason?: string) => void
    }
  ): () => void {
    let currentStatus = 'disconnected'
    let currentQR: string | null = null
    
    const poll = async () => {
      try {
        const result = await this.getBotStatus(boutiqueId)
        
        if (result.success && result.data) {
          const { status, qr } = result.data
          
          // Nouveau statut
          if (status !== currentStatus) {
            currentStatus = status
            callbacks.onStatusChange?.(status)
            
            if (status === 'connected') {
              callbacks.onConnected?.()
            } else if (status === 'disconnected') {
              callbacks.onDisconnected?.()
            }
          }
          
          // Nouveau QR Code
          if (qr && qr !== currentQR) {
            currentQR = qr
            callbacks.onQRCode?.(qr)
          }
        }
      } catch (error: any) {
        callbacks.onError?.(error.message)
      }
    }
    
    // Poll toutes les 3 secondes
    const interval = setInterval(poll, 3000)
    poll() // Premier appel immédiat
    
    return () => {
      clearInterval(interval)
    }
  }

  /**
   * Formater l'uptime en texte lisible
   */
  formatUptime(uptimeMs: number): string {
    if (uptimeMs < 60000) {
      return 'moins d\'une minute'
    }
    
    const minutes = Math.floor(uptimeMs / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days}j ${hours % 24}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}min`
    } else {
      return `${minutes}min`
    }
  }

  /**
   * Vérifier si le serveur bot est accessible
   */
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BOT_API_BASE}/api/health`, {
        method: 'GET'
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Instance unique du service
export const botService = new BotService()
export default botService
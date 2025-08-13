"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  Smartphone, 
  QrCode,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Phone,
  Camera,
  RefreshCw,
  Bot,
  Clock
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { authService, botService } from '@/lib/services'
import { BotStatus } from '@/lib/services/botService'

export default function BotWhatsApp() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [boutique, setBoutique] = useState<any>(null)
  
  // États WhatsApp Bot
  const [botStatus, setBotStatus] = useState<BotStatus>({ status: 'disconnected' })
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [botError, setBotError] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [serverAvailable, setServerAvailable] = useState(true)
  const [unsubscribeBot, setUnsubscribeBot] = useState<(() => void) | null>(null)

  useEffect(() => {
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'boutique') {
      router.push('/auth/login')
      return
    }
    
    setBoutique(session.boutique)
    initializeBotConnection(session.boutique.id)
  }, [router])

  // Cleanup à la sortie
  useEffect(() => {
    return () => {
      if (unsubscribeBot) {
        unsubscribeBot()
      }
    }
  }, [unsubscribeBot])

  const initializeBotConnection = async (boutiqueId: string) => {
    try {
      setLoading(true)
      setBotError(null)

      // Vérifier si le serveur bot est disponible
      const serverCheck = await botService.isServerAvailable()
      setServerAvailable(serverCheck)

      if (!serverCheck) {
        setBotError('Le serveur WhatsApp est actuellement indisponible.')
        setLoading(false)
        return
      }

      // Récupérer le statut actuel
      const statusResult = await botService.getBotStatus(boutiqueId)
      if (statusResult.success && statusResult.data) {
        setBotStatus(statusResult.data)
        if (statusResult.data.qr) {
          setQrCode(statusResult.data.qr)
        }
      }

      // S'abonner aux événements temps réel
      const unsubscribeFn = botService.subscribeToBot(boutiqueId, {
        onQRCode: (qr) => {
          console.log('🔥 Nouveau QR Code reçu')
          setQrCode(qr)
          setBotStatus((prev: BotStatus) => ({ ...prev, status: 'qr' }))
          setShowQRModal(true)
        },
        onStatusChange: (status) => {
          console.log('📱 Statut changé:', status)
          setBotStatus((prev: BotStatus) => ({ 
            ...prev, 
            status: status as 'disconnected' | 'connecting' | 'qr' | 'connected' 
          }))
          
          if (status === 'connected') {
            setQrCode(null)
            setConnecting(false)
            setShowQRModal(false)
          }
        },
        onConnected: () => {
          console.log('✅ Bot connecté !')
          setConnecting(false)
          setBotError(null)
        },
        onDisconnected: (reason) => {
          console.log('❌ Bot déconnecté:', reason)
          setQrCode(null)
          setConnecting(false)
        },
        onError: (errorMsg) => {
          console.error('🚨 Erreur bot:', errorMsg)
          setBotError(errorMsg)
          setConnecting(false)
        }
      })

      setUnsubscribeBot(() => unsubscribeFn)

    } catch (error: any) {
      setBotError(`Erreur d'initialisation: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!boutique?.id) return

    try {
      setConnecting(true)
      setBotError(null)
      setQrCode(null)

      const result = await botService.connectBot(boutique.id)
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur de connexion')
      }

      console.log('🔄 Connexion initiée:', result.data?.message)

    } catch (error: any) {
      setBotError(error.message)
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!boutique?.id) return

    try {
      const result = await botService.disconnectBot(boutique.id)
      
      if (result.success) {
        setBotStatus({ status: 'disconnected' })
        setQrCode(null)
        setBotError(null)
      }
    } catch (error: any) {
      setBotError(error.message)
    }
  }

  const handleRefresh = () => {
    if (boutique?.id) {
      initializeBotConnection(boutique.id)
    }
  }

  const getBotStatusDisplay = () => {
    switch (botStatus.status) {
      case 'connected':
        return {
          icon: <Wifi className="w-5 h-5 text-green-600" />,
          text: 'WhatsApp Connecté',
          description: 'Votre bot répond automatiquement aux clients',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        }
      case 'qr':
        return {
          icon: <QrCode className="w-5 h-5 text-orange-600" />,
          text: 'Scan du QR Code',
          description: 'Scannez le QR code avec WhatsApp',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200'
        }
      case 'connecting':
        return {
          icon: <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />,
          text: 'Connexion en cours...',
          description: 'Préparation de la connexion WhatsApp',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        }
      default:
        return {
          icon: <WifiOff className="w-5 h-5 text-gray-600" />,
          text: 'Non connecté',
          description: 'Cliquez sur "Connecter" pour démarrer',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de la connexion WhatsApp...</p>
        </div>
      </div>
    )
  }

  const statusDisplay = getBotStatusDisplay()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold">Bot WhatsApp</h1>
                <p className="text-sm text-muted-foreground">
                  {boutique?.nom_boutique || 'Ma Boutique'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusDisplay.bgColor}`}>
                {statusDisplay.icon}
                <span className={`text-sm font-medium ${statusDisplay.color}`}>
                  {statusDisplay.text}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={connecting}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Erreur */}
        {botError && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{botError}</AlertDescription>
          </Alert>
        )}

        {!serverAvailable && (
          <Alert variant="destructive">
            <WifiOff className="w-4 h-4" />
            <AlertDescription>
              Le serveur WhatsApp est temporairement indisponible. 
              Veuillez réessayer plus tard.
            </AlertDescription>
          </Alert>
        )}

        {/* Statut principal */}
        <Card className={`${statusDisplay.borderColor} border-2`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${statusDisplay.bgColor}`}>
                  {statusDisplay.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{statusDisplay.text}</h3>
                  <p className="text-muted-foreground">{statusDisplay.description}</p>
                  {botStatus.status === 'connected' && botStatus.uptime && (
                    <p className="text-sm text-green-600 mt-1">
                      Connecté depuis {botService.formatUptime(botStatus.uptime)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                {botStatus.status === 'disconnected' && (
                  <Button
                    onClick={handleConnect}
                    disabled={connecting || !serverAvailable}
                    size="lg"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-5 h-5 mr-2" />
                        Connecter WhatsApp
                      </>
                    )}
                  </Button>
                )}

                {botStatus.status === 'connected' && (
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    size="lg"
                  >
                    <WifiOff className="w-5 h-5 mr-2" />
                    Déconnecter
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités et Conseils */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Fonctionnalités */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                Fonctionnalités du Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Réponses automatiques 24h/24</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Présentation des produits et prix</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Gestion du stock en temps réel</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Négociation dans vos limites</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Vous notifie si intervention nécessaire</span>
              </div>
            </CardContent>
          </Card>

          {/* Conseils */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Comment ça marche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>1. Connectez votre WhatsApp</strong> en scannant le QR code</p>
              <p><strong>2. Le bot répond automatiquement</strong> aux clients qui vous écrivent</p>
              <p><strong>3. Vous recevez les messages</strong> sur votre WhatsApp comme d'habitude</p>
              <p><strong>4. Intervenez quand nécessaire</strong> pour les demandes spéciales</p>
              <p><strong>5. Gardez votre téléphone connecté</strong> à Internet</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides si connecté */}
        {botStatus.status === 'connected' && (
          <Card>
            <CardHeader>
              <CardTitle>Gérer ma boutique</CardTitle>
              <CardDescription>
                Votre bot est actif ! Gérez vos produits et votre boutique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/produits')}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Gérer les produits
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/parametres')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Paramètres boutique
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              Connecter WhatsApp
            </DialogTitle>
            <DialogDescription>
              Scannez ce QR code avec votre téléphone
            </DialogDescription>
          </DialogHeader>
          
          {qrCode && (
            <div className="text-center space-y-4">
              <div className="bg-white p-6 rounded-lg border-2 border-dashed border-orange-200 inline-block">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-sm">Instructions :</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>1. Ouvrez WhatsApp sur votre téléphone</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Camera className="w-4 h-4 text-primary" />
                    <span>2. Menu → Appareils connectés</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span>3. Scannez ce QR code</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowQRModal(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
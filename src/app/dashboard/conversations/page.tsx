"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock,
  AlertTriangle,
  Send,
  Check,
  User,
  Bot
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { authService, conversationService } from '@/lib/services'
import { Conversation } from '@/lib/types'

export default function VendeuseConversations() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [boutique, setBoutique] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [responseText, setResponseText] = useState('')
  const [sendingResponse, setSendingResponse] = useState(false)

  useEffect(() => {
    // Vérifier l'authentification vendeuse
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'boutique') {
      router.push('/auth/login')
      return
    }
    
    setBoutique(session.boutique)
    loadConversations(session.boutique.id)
  }, [router])

  const loadConversations = async (boutiqueId: string) => {
    try {
      setLoading(true)
      const result = await conversationService.getEscalatedConversations(boutiqueId)
      if (result.success && result.data) {
        setConversations(result.data)
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const result = await conversationService.getConversationMessages(conversationId)
      if (result.success && result.data) {
        setMessages(result.data)
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error)
    }
  }

  const handleSendResponse = async () => {
    if (!selectedConversation || !responseText.trim()) return

    try {
      setSendingResponse(true)
      
      // Envoyer la réponse
      const result = await conversationService.addMessage(
        selectedConversation.id,
        responseText,
        'vendeuse',
        'text'
      )

      if (result.success) {
        // Recharger les messages
        await loadMessages(selectedConversation.id)
        setResponseText('')
      }
    } catch (error) {
      console.error('Erreur envoi réponse:', error)
    } finally {
      setSendingResponse(false)
    }
  }

  const handleResolveConversation = async (conversationId: string) => {
    try {
      const result = await conversationService.resolveConversation(
        conversationId,
        'Résolu par la vendeuse'
      )

      if (result.success && boutique) {
        await loadConversations(boutique.id)
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Erreur résolution conversation:', error)
    }
  }

  const getEscalationReasonBadge = (reason?: string) => {
    switch (reason) {
      case 'remise':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Demande remise</Badge>
      case 'livraison':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Livraison</Badge>
      case 'probleme_produit':
        return <Badge variant="destructive">Problème produit</Badge>
      case 'complexe':
        return <Badge variant="secondary">Question complexe</Badge>
      default:
        return <Badge variant="outline">Autre</Badge>
    }
  }

  const formatTime = (timestamp: any) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins}min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-bold">Messages Clients</h1>
                <p className="text-sm text-muted-foreground">
                  {conversations.length} conversation{conversations.length > 1 ? 's' : ''} en attente
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Liste des conversations */}
        {conversations.length > 0 ? (
          <div className="grid gap-6">
            {conversations.map((conversation) => (
              <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            Conversation #{conversation.id.substring(0, 8)}
                          </h3>
                          {getEscalationReasonBadge(conversation.escalation_reason)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Client</p>
                            <p className="font-medium">Client #{conversation.client_boutique_id.substring(0, 8)}</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Messages</p>
                            <p className="font-medium">{conversation.messages_count || 0} messages</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Dernière activité</p>
                            <p className="font-medium">{formatTime(conversation.derniere_activite)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            En attente de réponse
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedConversation(conversation)
                              loadMessages(conversation.id)
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Répondre
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle className="flex items-center">
                              <MessageSquare className="w-5 h-5 mr-2" />
                              Conversation avec le client
                            </DialogTitle>
                            <DialogDescription>
                              Raison de l'escalation: {conversation.escalation_reason}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {/* Messages */}
                          <div className="flex-1 overflow-y-auto max-h-96 space-y-4 py-4">
                            {messages.map((message, index) => (
                              <div key={index} className={`flex ${message.sender === 'vendeuse' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.sender === 'vendeuse' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : message.sender === 'bot'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  <div className="flex items-center space-x-2 mb-1">
                                    {message.sender === 'client' && <User className="w-3 h-3" />}
                                    {message.sender === 'bot' && <Bot className="w-3 h-3" />}
                                    {message.sender === 'vendeuse' && <span className="text-xs">Vous</span>}
                                    <span className="text-xs opacity-75">
                                      {message.timestamp.toDate().toLocaleTimeString('fr-FR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-sm">{message.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Zone de réponse */}
                          <div className="border-t pt-4 space-y-4">
                            <Textarea
                              placeholder="Tapez votre réponse au client..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              rows={3}
                            />
                          </div>

                          <DialogFooter className="gap-2">
                            <Button 
                              variant="outline"
                              onClick={() => handleResolveConversation(conversation.id)}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Marquer résolu
                            </Button>
                            <Button 
                              onClick={handleSendResponse}
                              disabled={!responseText.trim() || sendingResponse}
                            >
                              {sendingResponse ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  Envoi...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Envoyer
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveConversation(conversation.id)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Résoudre
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucun message en attente</h3>
              <p className="text-muted-foreground mb-6">
                Toutes vos conversations sont gérées automatiquement par le bot. 
                Les messages nécessitant votre attention apparaîtront ici.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>💬 Le bot traite automatiquement les questions simples</p>
                <p>⚡ Les demandes de remise sont escaladées vers vous</p>
                <p>🚚 Les problèmes de livraison nécessitent votre intervention</p>
                <p>❓ Les questions complexes vous sont transmises</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
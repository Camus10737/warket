"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  ShoppingCart, 
  Eye, 
  Check,
  X,
  Truck,
  Package,
  Clock,
  Search,
  Filter
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authService, commandeService } from '@/lib/services'
import { Commande, PaymentMethod } from '@/lib/types'

export default function VendeuseCommandes() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [boutique, setBoutique] = useState<any>(null)
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [filteredCommandes, setFilteredCommandes] = useState<Commande[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null)
  const [validationData, setValidationData] = useState({
    payment_method: 'orange_money' as PaymentMethod,
    reference_paiement: ''
  })

  useEffect(() => {
    // Vérifier l'authentification vendeuse
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'boutique') {
      router.push('/auth/login')
      return
    }
    
    setBoutique(session.boutique)
    loadCommandes(session.boutique.id)
  }, [router])

  useEffect(() => {
    filterCommandes()
  }, [searchTerm, selectedStatus, commandes])

  const loadCommandes = async (boutiqueId: string) => {
    try {
      setLoading(true)
      const result = await commandeService.getCommandesByBoutique(boutiqueId)
      if (result.success && result.data) {
        setCommandes(result.data)
      }
    } catch (error) {
      console.error('Erreur chargement commandes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCommandes = () => {
    let filtered = commandes

    // Filtrer par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus)
    }

    // Filtrer par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.id.toLowerCase().includes(term) ||
        c.produits.some(p => p.nom_produit.toLowerCase().includes(term))
      )
    }

    setFilteredCommandes(filtered)
  }

  const handleValidatePayment = async () => {
    if (!selectedCommande) return

    try {
      const result = await commandeService.validatePayment(
        selectedCommande.id,
        validationData.payment_method,
        validationData.reference_paiement,
        undefined, // clientProvidedRef
        boutique?.id
      )

      if (result.success && boutique) {
        await loadCommandes(boutique.id)
        setSelectedCommande(null)
        setValidationData({ payment_method: 'orange_money', reference_paiement: '' })
      }
    } catch (error) {
      console.error('Erreur validation paiement:', error)
    }
  }

  const handleRejectPayment = async (raison: string) => {
    if (!selectedCommande) return

    try {
      const result = await commandeService.rejectPaymentValidation(
        selectedCommande.id,
        raison,
        boutique?.id
      )

      if (result.success && boutique) {
        await loadCommandes(boutique.id)
        setSelectedCommande(null)
      }
    } catch (error) {
      console.error('Erreur rejet paiement:', error)
    }
  }

  const handleMarkAsShipped = async (commandeId: string) => {
    try {
      const result = await commandeService.markAsShipped(commandeId)
      if (result.success && boutique) {
        await loadCommandes(boutique.id)
      }
    } catch (error) {
      console.error('Erreur expédition:', error)
    }
  }

  const handleMarkAsDelivered = async (commandeId: string) => {
    try {
      const result = await commandeService.markAsDelivered(commandeId)
      if (result.success && boutique) {
        await loadCommandes(boutique.id)
      }
    } catch (error) {
      console.error('Erreur livraison:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_attente':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En attente</Badge>
      case 'payee':
        return <Badge variant="default" className="bg-green-100 text-green-800">Payée</Badge>
      case 'expediee':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Expédiée</Badge>
      case 'livree':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Livrée</Badge>
      case 'probleme':
        return <Badge variant="destructive">Problème</Badge>
      case 'annulee':
        return <Badge variant="outline">Annulée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'en_attente':
        return <Clock className="w-4 h-4" />
      case 'payee':
        return <Check className="w-4 h-4" />
      case 'expediee':
        return <Truck className="w-4 h-4" />
      case 'livree':
        return <Package className="w-4 h-4" />
      default:
        return <ShoppingCart className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des commandes...</p>
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
                <h1 className="text-xl font-bold">Mes Commandes</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredCommandes.length} commande{filteredCommandes.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres et recherche */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par ID commande ou produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('all')}
                >
                  Toutes
                </Button>
                <Button
                  variant={selectedStatus === 'en_attente' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('en_attente')}
                >
                  En attente
                </Button>
                <Button
                  variant={selectedStatus === 'payee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('payee')}
                >
                  Payées
                </Button>
                <Button
                  variant={selectedStatus === 'expediee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('expediee')}
                >
                  Expédiées
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des commandes */}
        {filteredCommandes.length > 0 ? (
          <div className="grid gap-6">
            {filteredCommandes.map((commande) => (
              <Card key={commande.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        {getStatusIcon(commande.status)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            Commande #{commande.id.substring(0, 8)}
                          </h3>
                          {getStatusBadge(commande.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Produits</p>
                            <div className="space-y-1">
                              {commande.produits.map((produit, index) => (
                                <p key={index} className="font-medium">
                                  {produit.quantite}x {produit.nom_produit}
                                </p>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Montant</p>
                            <p className="font-medium">{formatCurrency(commande.final_amount)}</p>
                            {commande.reduction && (
                              <p className="text-sm text-green-600">
                                Remise: {formatCurrency(commande.reduction)}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">
                              {commande.created_at.toDate().toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {commande.created_at.toDate().toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Informations de paiement */}
                        {commande.client_provided_ref && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-4">
                            <p className="text-sm font-medium text-blue-800">
                              Client a fourni la référence: {commande.client_provided_ref}
                            </p>
                          </div>
                        )}

                        {commande.payment_method && (
                          <div className="text-sm text-muted-foreground">
                            <p>
                              Paiement: {commande.payment_method} 
                              {commande.reference_paiement && ` - Réf: ${commande.reference_paiement}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions selon le statut */}
                    <div className="flex flex-col gap-2">
                      {commande.status === 'en_attente' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedCommande(commande)}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Valider Paiement
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Valider le paiement</DialogTitle>
                              <DialogDescription>
                                Commande #{commande.id.substring(0, 8)} - {formatCurrency(commande.final_amount)}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="payment_method">Mode de paiement</Label>
                                <Select 
                                  value={validationData.payment_method} 
                                  onValueChange={(value: PaymentMethod) => 
                                    setValidationData(prev => ({ ...prev, payment_method: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="orange_money">Orange Money</SelectItem>
                                    <SelectItem value="mtn_money">MTN Money</SelectItem>
                                    <SelectItem value="cash">Espèces</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="reference">Référence de transaction (optionnel)</Label>
                                <Input
                                  id="reference"
                                  value={validationData.reference_paiement}
                                  onChange={(e) => setValidationData(prev => ({ 
                                    ...prev, 
                                    reference_paiement: e.target.value 
                                  }))}
                                  placeholder="Référence du paiement"
                                />
                              </div>

                              {commande.client_provided_ref && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                  <p className="text-sm">
                                    <strong>Référence fournie par le client:</strong> {commande.client_provided_ref}
                                  </p>
                                </div>
                              )}
                            </div>

                            <DialogFooter className="gap-2">
                              <Button 
                                variant="outline"
                                onClick={() => handleRejectPayment('Paiement non reçu')}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Pas reçu
                              </Button>
                              <Button onClick={handleValidatePayment}>
                                <Check className="w-4 h-4 mr-2" />
                                J'ai reçu le paiement
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}

                      {commande.status === 'payee' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsShipped(commande.id)}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Marquer expédiée
                        </Button>
                      )}

                      {commande.status === 'expediee' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsDelivered(commande.id)}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Marquer livrée
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/commandes/${commande.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
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
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Aucune commande trouvée'
                  : 'Aucune commande'
                }
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedStatus !== 'all'
                  ? 'Aucune commande ne correspond à vos critères.'
                  : 'Vos commandes apparaîtront ici dès qu\'un client passera commande.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
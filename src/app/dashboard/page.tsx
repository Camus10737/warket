"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign,
  AlertTriangle,
  Plus,
  Eye,
  LogOut,
  Store,
  MessageSquare,
  TrendingUp,
  Settings,
  Menu,
  X // Ajout de l'icône X pour fermer le menu
} from "lucide-react"
import { authService, statsService, productService, commandeService } from '@/lib/services'
import { withAuth } from '@/lib/withAuth'

function VendeuseDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [boutique, setBoutique] = useState<any>(null)
  const [quickStats, setQuickStats] = useState<any>(null)
  const [recentCommandes, setRecentCommandes] = useState<any[]>([])
  const [alertes, setAlertes] = useState<any[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // État pour le menu mobile

  useEffect(() => {
    // Vérifier l'authentification vendeuse
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'boutique') {
      router.push('/auth/login')
      return
    }

    setBoutique(session.boutique)
    loadDashboardData(session.boutique.id)

    // S'abonner aux changements de session
    const unsubscribe = authService.onAuthStateChange((s) => {
      if (s?.type === 'boutique') {
        setBoutique(s.boutique)
      }
    })
    return unsubscribe
  }, [router])

  const loadDashboardData = async (boutiqueId: string) => {
    try {
      setLoading(true)

      // Charger les stats rapides
      const quickStatsResult = await statsService.getBoutiqueQuickStats(boutiqueId)
      if (quickStatsResult.success) {
        setQuickStats(quickStatsResult.data)
      }

      // Charger les commandes récentes
      const commandesResult = await commandeService.getCommandesByBoutique(boutiqueId)
      if (commandesResult.success && commandesResult.data) {
        setRecentCommandes(commandesResult.data.slice(0, 5))
      }

      // Charger les produits en rupture
      const rupturesResult = await productService.getOutOfStockProducts(boutiqueId)
      if (rupturesResult.success && rupturesResult.data) {
        const alertesRupture = rupturesResult.data.map((product: any) => ({
          type: 'stock',
          message: `${product.nom} en rupture de stock`,
          severity: 'high',
          product_id: product.id
        }))
        setAlertes(alertesRupture)
      }

    } catch (error) {
      console.error('Erreur chargement dashboard vendeuse:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    router.push('/auth/login')
  }

  // Fonction pour naviguer et fermer le menu mobile
  const navigateAndCloseMenu = (path: string) => {
    router.push(path)
    setMobileMenuOpen(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const getCommandeStatusBadge = (status: string) => {
    switch (status) {
      case 'en_attente':
        return <Badge variant="secondary">En attente</Badge>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de votre boutique...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et boutique */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{boutique?.nom_boutique}</h1>
                <p className="text-sm text-gray-500">
                  {boutique?.nom_vendeuse} {boutique?.prenom_vendeuse}
                </p>
              </div>
            </div>

            {/* Navigation Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <nav className="flex space-x-1">
                <Button variant="ghost" className="text-primary bg-primary/5">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Accueil
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/dashboard/produits')}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Produits
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/dashboard/commandes')}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Commandes
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/dashboard/conversations')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Bot WhatsApp
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/dashboard/parametres')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Button>
              </nav>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Menu Mobile */}
            <div className="md:hidden flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Menu Mobile Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
              <div className="px-4 py-2 space-y-1">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-primary bg-primary/5"
                  onClick={() => navigateAndCloseMenu('/dashboard')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Accueil
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => navigateAndCloseMenu('/dashboard/produits')}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Produits
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigateAndCloseMenu('/dashboard/commandes')}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Commandes
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigateAndCloseMenu('/dashboard/conversations')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Bot WhatsApp
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigateAndCloseMenu('/dashboard/parametres')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Overlay pour fermer le menu mobile en cliquant à côté */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mes Produits</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats?.total_produits || 0}</div>
              <p className="text-xs text-red-500">
                {quickStats?.produits_rupture || 0} en rupture
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commandes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats?.commandes_en_attente || 0}</div>
              <p className="text-xs text-muted-foreground">
                En attente de validation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nouveaux Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats?.nouveaux_clients_ce_mois || 0}</div>
              <p className="text-xs text-muted-foreground">
                Ce mois
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(quickStats?.chiffre_affaires_ce_mois || 0)}
              </div>
              <p className="text-xs text-green-600">
                Ce mois
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Commandes récentes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Commandes Récentes</CardTitle>
                  <CardDescription>Vos dernières commandes</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/dashboard/commandes')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentCommandes.length > 0 ? (
                recentCommandes.map((commande) => (
                  <div key={commande.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Commande #{commande.id.substring(0, 8)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {commande.produits.length} article{commande.produits.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(commande.final_amount)}</p>
                      <div className="mt-1">
                        {getCommandeStatusBadge(commande.status)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune commande pour le moment</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions rapides et alertes */}
          <div className="space-y-6">
            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/produits/nouveau')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un produit
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/commandes')}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Gérer les commandes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/conversations')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Messages clients
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/parametres')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres boutique
                </Button>
              </CardContent>
            </Card>

            {/* Alertes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                  Alertes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertes.length > 0 ? (
                  <div className="space-y-3">
                    {alertes.slice(0, 5).map((alerte, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Badge variant="destructive" className="mt-0.5">
                          Stock
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{alerte.message}</p>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => router.push('/dashboard/produits')}
                    >
                      Gérer le stock
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune alerte</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance bot */}
            <Card>
              <CardHeader>
                <CardTitle>Bot WhatsApp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Résolution automatique</span>
                  <span className="font-medium">
                    {quickStats?.taux_resolution_bot || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Messages en attente</span>
                  <span className="font-medium">0</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => router.push('/dashboard/conversations')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Voir les messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default withAuth(VendeuseDashboard, "boutique")
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Store, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Plus,
  Settings,
  BarChart3,
  Eye,
  LogOut,
  ShoppingBag,
  DollarSign,

  Package
} from "lucide-react"
import { authService, statsService } from '@/lib/services'
import { withAuth } from '@/lib/withAuth'

function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  const [quickStats, setQuickStats] = useState<any>(null)
  const [adminStats, setAdminStats] = useState<any>(null)
  const [topBoutiques, setTopBoutiques] = useState<any[]>([])
  const [alertes, setAlertes] = useState<any[]>([])
  const [currentAdmin, setCurrentAdmin] = useState<any>(null)

  useEffect(() => {
    // Vérifier l'authentification admin
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'admin') {
      router.push('/auth/login')
      return
    }
    
    setCurrentAdmin(session.user)
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Charger les stats rapides
      const quickStatsResult = await statsService.getAdminQuickStats()
      if (quickStatsResult.success) {
        setQuickStats(quickStatsResult.data)
      }

      // Charger les stats complètes
      const adminStatsResult = await statsService.generateAdminStats()
      if (adminStatsResult.success && adminStatsResult.data) {
        setAdminStats(adminStatsResult.data)
        setTopBoutiques(adminStatsResult.data.top_performers.top_boutiques)
        setAlertes(adminStatsResult.data.alertes)
      }

    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    router.push('/auth/login')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et titre */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Wariket Admin</h1>
                <p className="text-sm text-gray-500">Tableau de bord administrateur</p>
              </div>
            </div>

            {/* Navigation et profil */}
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-1">
                <Button variant="ghost" className="text-primary bg-primary/5">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/admin/boutiques')}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Boutiques
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/admin/stats')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/admin/parametres')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Button>
              </nav>

              {/* Profil admin */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{currentAdmin?.name}</p>
                  <p className="text-xs text-gray-500">Administrateur</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boutiques Actives</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.global.boutiques_actives || 0}</div>
              <p className="text-xs text-muted-foreground">
                Sur {adminStats?.global.total_boutiques || 0} boutiques totales
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
                {adminStats?.global.chiffre_affaires_global 
                  ? formatCurrency(adminStats.global.chiffre_affaires_global)
                  : '0 GNF'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Global toutes boutiques
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commandes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.global.total_commandes || 0}</div>
              <p className="text-xs text-muted-foreground">
                {quickStats?.commandes_en_attente_global || 0} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.global.total_clients || 0}</div>
              <p className="text-xs text-muted-foreground">
                {quickStats?.nouveaux_clients_aujourd_hui || 0} nouveaux aujourd'hui
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Boutiques */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Boutiques</CardTitle>
                  <CardDescription>Classement par chiffre d'affaires</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/admin/boutiques')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topBoutiques.length > 0 ? (
                topBoutiques.map((item, index) => (
                  <div key={item.boutique.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{item.boutique.nom_boutique}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.boutique.nom_vendeuse} {item.boutique.prenom_vendeuse}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(item.stats.commandes?.chiffre_affaires_total || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.stats.commandes?.total_commandes || 0} commandes
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune boutique pour le moment</p>
                  <Button 
                    className="mt-4"
                    onClick={() => router.push('/admin/boutiques/nouvelle')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer la première boutique
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alertes et actions rapides */}
          <div className="space-y-6">
            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start"
                  onClick={() => router.push('/admin/boutiques/nouvelle')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle Boutique
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/admin/stats')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Voir Analytics
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/admin/boutiques')}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Gérer Boutiques
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
                        <Badge 
                          variant={alerte.severity === 'high' ? 'destructive' : 
                                  alerte.severity === 'medium' ? 'default' : 'secondary'}
                          className="mt-0.5"
                        >
                          {alerte.type}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{alerte.message}</p>
                        </div>
                      </div>
                    ))}
                    {alertes.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        Et {alertes.length - 5} autres alertes...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune alerte</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Métriques performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Globale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taux résolution bot</span>
                  <span className="font-medium">
                    {adminStats?.performance.taux_resolution_bot_global || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taux conversion</span>
                  <span className="font-medium">
                    {Math.round(adminStats?.performance.taux_conversion_global || 0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Temps réponse moyen</span>
                  <span className="font-medium">
                    {adminStats?.performance.temps_reponse_moyen || 0} min
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
const ProtectedAdminDashboard = withAuth(AdminDashboard, "admin")
export default ProtectedAdminDashboard

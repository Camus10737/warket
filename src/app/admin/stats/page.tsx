"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Users,
  Store,
  DollarSign,
  Package,
  MessageSquare,
  AlertTriangle,
  Download
} from "lucide-react"
import { authService, statsService } from '@/lib/services'

export default function AdminStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminStats, setAdminStats] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30days')

  useEffect(() => {
    // Vérifier l'authentification admin
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'admin') {
      router.push('/auth/login')
      return
    }
    
    loadStats()
  }, [router, selectedPeriod])

  const loadStats = async () => {
    try {
      setLoading(true)
      const result = await statsService.generateAdminStats()
      if (result.success && result.data) {
        setAdminStats(result.data)
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    } finally {
      setLoading(false)
    }
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
          <p className="text-muted-foreground">Chargement des analytics...</p>
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
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold">Analytics Globales</h1>
                <p className="text-sm text-muted-foreground">
                  Vue d'ensemble des performances
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres de période */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Période :</span>
              {['7days', '30days', '90days', '1year'].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period === '7days' && '7 jours'}
                  {period === '30days' && '30 jours'}
                  {period === '90days' && '3 mois'}
                  {period === '1year' && '1 an'}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boutiques Actives</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.global?.boutiques_actives || 0}</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12% ce mois
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(adminStats?.global?.chiffre_affaires_global || 0)}
              </div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{adminStats?.performance?.croissance_ca_mensuelle || 0}% ce mois
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.global?.total_clients || 0}</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                +8% ce mois
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux Conversion</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(adminStats?.performance?.taux_conversion_global || 0)}%
              </div>
              <div className="flex items-center text-xs text-red-600">
                <TrendingDown className="w-3 h-3 mr-1" />
                -2% ce mois
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="boutiques">Boutiques</TabsTrigger>
            <TabsTrigger value="produits">Produits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Métriques business */}
              <Card>
                <CardHeader>
                  <CardTitle>Métriques Business</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total commandes</span>
                    <span className="font-medium">{adminStats?.global?.total_commandes || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total produits</span>
                    <span className="font-medium">{adminStats?.global?.total_produits || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Panier moyen</span>
                    <span className="font-medium">
                      {adminStats?.global?.total_commandes > 0 
                        ? formatCurrency((adminStats?.global?.chiffre_affaires_global || 0) / adminStats.global.total_commandes)
                        : '0 GNF'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Performance bot */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Bot WhatsApp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taux résolution automatique</span>
                    <span className="font-medium">{adminStats?.performance?.taux_resolution_bot_global || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Temps réponse moyen</span>
                    <span className="font-medium">{adminStats?.performance?.temps_reponse_moyen || 0} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Messages traités aujourd'hui</span>
                    <span className="font-medium">0</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alertes */}
            {adminStats?.alertes && adminStats.alertes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                    Alertes Système
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminStats.alertes.slice(0, 10).map((alerte: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={alerte.severity === 'high' ? 'destructive' : 
                                    alerte.severity === 'medium' ? 'default' : 'secondary'}
                          >
                            {alerte.type}
                          </Badge>
                          <span className="text-sm">{alerte.message}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          Résoudre
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Résolution Bot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {adminStats?.performance?.taux_resolution_bot_global || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Messages résolus automatiquement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Temps de Réponse</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {adminStats?.performance?.temps_reponse_moyen || 0} min
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Temps moyen de réponse
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {Math.round(adminStats?.performance?.taux_conversion_global || 0)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Visiteurs → Clients
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="boutiques">
            <Card>
              <CardHeader>
                <CardTitle>Top Boutiques</CardTitle>
                <CardDescription>Classement par performance</CardDescription>
              </CardHeader>
              <CardContent>
                {adminStats?.top_performers?.top_boutiques?.length > 0 ? (
                  <div className="space-y-4">
                    {adminStats.top_performers.top_boutiques.map((item: any, index: number) => (
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
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune donnée de performance disponible
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="produits">
            <Card>
              <CardHeader>
                <CardTitle>Top Produits</CardTitle>
                <CardDescription>Produits les plus vendus</CardDescription>
              </CardHeader>
              <CardContent>
                {adminStats?.top_performers?.top_produits?.length > 0 ? (
                  <div className="space-y-4">
                    {adminStats.top_performers.top_produits.slice(0, 10).map((item: any, index: number) => (
                      <div key={item.produit.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-700">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{item.produit.nom}</p>
                            <p className="text-sm text-muted-foreground">{item.produit.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.ventes} ventes</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.produit.prix_affichage)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun produit vendu pour le moment
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
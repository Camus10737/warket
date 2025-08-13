"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Store, 
  Eye, 
  Edit, 
  MoreHorizontal,
  Users,
  Package,
  DollarSign,
  ArrowLeft
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authService, boutiqueService, statsService } from '@/lib/services'
import { Boutique } from '@/lib/types'

export default function AdminBoutiquesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [filteredBoutiques, setFilteredBoutiques] = useState<Boutique[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    // Vérifier l'authentification admin
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'admin') {
      router.push('/auth/login')
      return
    }
    
    loadBoutiques()
  }, [router])

  useEffect(() => {
    filterBoutiques()
  }, [searchTerm, selectedStatus, boutiques])

  const loadBoutiques = async () => {
    try {
      setLoading(true)
      const result = await boutiqueService.getAllBoutiques()
      if (result.success && result.data) {
        setBoutiques(result.data)
      }
    } catch (error) {
      console.error('Erreur chargement boutiques:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBoutiques = () => {
    let filtered = boutiques

    // Filtrer par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(b => b.status === selectedStatus)
    }

    // Filtrer par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(b => 
        b.nom_boutique.toLowerCase().includes(term) ||
        b.nom_vendeuse.toLowerCase().includes(term) ||
        b.prenom_vendeuse.toLowerCase().includes(term) ||
        b.numero_whatsapp.includes(term)
      )
    }

    setFilteredBoutiques(filtered)
  }

  const handleStatusChange = async (boutiqueId: string, newStatus: 'active' | 'inactive') => {
    try {
      const result = await boutiqueService.updateBoutiqueStatus(boutiqueId, newStatus)
      if (result.success) {
        await loadBoutiques() // Recharger la liste
      }
    } catch (error) {
      console.error('Erreur changement statut:', error)
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
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactif</Badge>
      case 'suspended':
        return <Badge variant="destructive">Suspendu</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des boutiques...</p>
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
                <h1 className="text-xl font-bold">Gestion des Boutiques</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredBoutiques.length} boutique{filteredBoutiques.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button onClick={() => router.push('/admin/boutiques/nouvelle')}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Boutique
            </Button>
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
                  placeholder="Rechercher par nom, vendeuse, ou numéro..."
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
                  variant={selectedStatus === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('active')}
                >
                  Actives
                </Button>
                <Button
                  variant={selectedStatus === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('inactive')}
                >
                  Inactives
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des boutiques */}
        {filteredBoutiques.length > 0 ? (
          <div className="grid gap-6">
            {filteredBoutiques.map((boutique) => (
              <Card key={boutique.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{boutique.nom_boutique}</h3>
                          {getStatusBadge(boutique.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Vendeuse</p>
                            <p className="font-medium">
                              {boutique.nom_vendeuse} {boutique.prenom_vendeuse}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">WhatsApp</p>
                            <p className="font-medium">{boutique.numero_whatsapp}</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Produits</p>
                            <p className="font-medium flex items-center">
                              <Package className="w-4 h-4 mr-1" />
                              {boutique.total_produits || 0}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Chiffre d'affaires</p>
                            <p className="font-medium flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {formatCurrency(boutique.chiffre_affaires || 0)}
                            </p>
                          </div>
                        </div>

                        {boutique.adresse && (
                          <p className="text-sm text-muted-foreground mt-2">
                            📍 {boutique.adresse}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/boutiques/${boutique.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/boutiques/${boutique.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                            <DropdownMenuItem
      onClick={() => router.push(`/admin/boutiques/${boutique.id}`)}
    >
      <Edit className="w-4 h-4 mr-2" />
      Modifier
    </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(
                              boutique.id, 
                              boutique.status === 'active' ? 'inactive' : 'active'
                            )}
                          >
                            {boutique.status === 'active' ? 'Désactiver' : 'Activer'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucune boutique trouvée</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Aucune boutique ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre première boutique.'
                }
              </p>
              {(!searchTerm && selectedStatus === 'all') && (
                <Button onClick={() => router.push('/admin/boutiques/nouvelle')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer la première boutique
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
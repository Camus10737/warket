"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'  // Ajout de l'import Image
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Package, 
  Edit, 
  MoreHorizontal,
  ArrowLeft,
  Eye,
  AlertTriangle,
  ImageIcon
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authService, productService } from '@/lib/services'
import { Product, ProductCategory } from '@/lib/types'

export default function VendeuseProduits() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [boutique, setBoutique] = useState<any>(null)
  const [produits, setProduits] = useState<Product[]>([])
  const [filteredProduits, setFilteredProduits] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const categories: ProductCategory[] = [
    'Vêtements', 'Chaussures', 'Sacs & Accessoires', 'Téléphones & Électronique',
    'Cosmétiques & Beauté', 'Bijoux', 'Produits alimentaires', 'Articles ménagers', 'Autre'
  ]

  useEffect(() => {
    // Vérifier l'authentification vendeuse
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'boutique') {
      router.push('/auth/login')
      return
    }
    
    setBoutique(session.boutique)
    loadProduits(session.boutique.id)
  }, [router])

  useEffect(() => {
    filterProduits()
  }, [searchTerm, selectedCategory, selectedStatus, produits])

  const loadProduits = async (boutiqueId: string) => {
    try {
      setLoading(true)
      const result = await productService.getProductsByBoutique(boutiqueId)
      if (result.success && result.data) {
        setProduits(result.data)
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProduits = () => {
    let filtered = produits

    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Filtrer par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(p => p.status === selectedStatus)
    }

    // Filtrer par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.nom.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      )
    }

    setFilteredProduits(filtered)
  }

  const handleUpdateStock = async (productId: string, newQuantity: number) => {
    try {
      const product = produits.find(p => p.id === productId)
      if (!product) return

      const change = newQuantity - product.stock_quantity
      const result = await productService.updateStock(productId, change)
      
      if (result.success && boutique) {
        await loadProduits(boutique.id) // Recharger la liste
      }
    } catch (error) {
      console.error('Erreur mise à jour stock:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string, stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Rupture</Badge>
    }
    
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Disponible</Badge>
      case 'out_of_stock':
        return <Badge variant="destructive">Rupture</Badge>
      case 'discontinued':
        return <Badge variant="secondary">Arrêté</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des produits...</p>
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
                <h1 className="text-xl font-bold">Mes Produits</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredProduits.length} produit{filteredProduits.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button onClick={() => router.push('/dashboard/produits/nouveau')}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Produit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres et recherche */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Toutes catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    variant={selectedStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('all')}
                  >
                    Tous
                  </Button>
                  <Button
                    variant={selectedStatus === 'available' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('available')}
                  >
                    Disponibles
                  </Button>
                  <Button
                    variant={selectedStatus === 'out_of_stock' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('out_of_stock')}
                  >
                    Ruptures
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des produits */}
        {filteredProduits.length > 0 ? (
          <div className="grid gap-6">
            {filteredProduits.map((produit) => (
              <Card key={produit.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    {/* Image produit - CORRIGÉE */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                      {produit.images && produit.images.length > 0 ? (
                        <Image 
                          src={produit.images[0]} 
                          alt={produit.nom}
                          fill
                          className="object-cover"
                          sizes="80px"
                          onError={() => console.log('Erreur chargement image')}
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Informations produit */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">{produit.nom}</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Catégorie</p>
                              <p className="font-medium">{produit.category}</p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Prix affiché</p>
                              <p className="font-medium">{formatCurrency(produit.prix_affichage)}</p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Prix minimum</p>
                              <p className="font-medium">{formatCurrency(produit.prix_min)}</p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Stock</p>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{produit.stock_quantity}</span>
                                {produit.stock_quantity <= 5 && produit.stock_quantity > 0 && (
                                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {produit.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {produit.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-4 mt-3">
                            {getStatusBadge(produit.status, produit.stock_quantity)}
                            
                            {produit.total_ventes && produit.total_ventes > 0 && (
                              <span className="text-sm text-green-600">
                                {produit.total_ventes} vente{produit.total_ventes > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/produits/${produit.id}`)}
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
                                onClick={() => router.push(`/dashboard/produits/${produit.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/produits/${produit.id}/modifier`)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const newQuantity = prompt(`Stock actuel: ${produit.stock_quantity}. Nouveau stock:`)
                                  if (newQuantity !== null) {
                                    handleUpdateStock(produit.id, parseInt(newQuantity))
                                  }
                                }}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                Modifier stock
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' 
                  ? 'Aucun produit trouvé'
                  : 'Aucun produit'
                }
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Aucun produit ne correspond à vos critères de recherche.'
                  : 'Commencez par ajouter votre premier produit.'
                }
              </p>
              {(!searchTerm && selectedCategory === 'all' && selectedStatus === 'all') && (
                <Button onClick={() => router.push('/dashboard/produits/nouveau')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter mon premier produit
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
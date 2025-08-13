"use client"

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'  // Ajout de l'import Image
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  AlertTriangle,
  ImageIcon,
  Loader2,
  Save,
  TrendingUp,
  Eye,
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
import { authService, productService } from '@/lib/services'
import { Product } from '@/lib/types'

interface ProduitDetailsPageProps {
  params: Promise<{ id: string }>
}

export default function ProduitDetailsPage({ params }: ProduitDetailsPageProps) {
  const resolvedParams = use(params)
  
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [boutique, setBoutique] = useState<any>(null)
  const [produit, setProduit] = useState<Product | null>(null)
  const [newStock, setNewStock] = useState<number>(0)

  useEffect(() => {
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'boutique') {
      router.push('/auth/login')
      return
    }
    
    setBoutique(session.boutique)
    loadProduit()
  }, [router, resolvedParams.id])

  const loadProduit = async () => {
    try {
      setLoading(true)
      const result = await productService.getProductById(resolvedParams.id)
      if (result.success && result.data) {
        setProduit(result.data)
        setNewStock(result.data.stock_quantity)
      }
    } catch (error) {
      console.error('Erreur chargement produit:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = async () => {
    if (!produit) return

    try {
      setUpdating(true)
      const change = newStock - produit.stock_quantity
      const result = await productService.updateStock(produit.id, change)
      
      if (result.success) {
        await loadProduit()
      }
    } catch (error) {
      console.error('Erreur mise à jour stock:', error)
    } finally {
      setUpdating(false)
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
      return <Badge variant="destructive">Rupture de stock</Badge>
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
          <p className="text-muted-foreground">Chargement du produit...</p>
        </div>
      </div>
    )
  }

  if (!produit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Produit non trouvé</h2>
          <p className="text-muted-foreground mb-4">Ce produit n'existe pas ou a été supprimé.</p>
          <Button onClick={() => router.push('/dashboard/produits')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux produits
          </Button>
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
                onClick={() => router.push('/dashboard/produits')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold">{produit.nom}</h1>
                <p className="text-sm text-muted-foreground">{produit.category}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(produit.status, produit.stock_quantity)}
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images du produit - SECTION CORRIGÉE */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                {produit.images && produit.images.length > 0 ? (
                  <div className="space-y-4">
                    {/* Image principale */}
                    <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden relative">
                      <Image
                        src={produit.images[0]}
                        alt={produit.nom}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority
                        onError={() => console.log('Erreur chargement image principale')}
                      />
                    </div>
                    
                    {/* Images supplémentaires */}
                    {produit.images.length > 1 && (
                      <div className="grid grid-cols-3 gap-2">
                        {produit.images.slice(1, 4).map((image, index) => (
                          <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden relative">
                            <Image 
                              src={image} 
                              alt={`${produit.nom} ${index + 2}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 33vw, 100px"
                              onError={() => console.log(`Erreur image ${index + 2}`)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Détails du produit */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="details" className="space-y-6">
              <TabsList>
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                <TabsTrigger value="stats">Statistiques</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations du produit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Détails de base</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Nom</p>
                            <p className="font-medium">{produit.nom}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Catégorie</p>
                            <p className="font-medium">
                              {produit.category}
                              {produit.category_custom && ` (${produit.category_custom})`}
                            </p>
                          </div>
                          
                          {produit.description && (
                            <div>
                              <p className="text-sm text-muted-foreground">Description</p>
                              <p className="font-medium">{produit.description}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Prix et stock</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Prix affiché</p>
                            <p className="font-medium text-lg">{formatCurrency(produit.prix_affichage)}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Prix minimum</p>
                            <p className="font-medium">{formatCurrency(produit.prix_min)}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Stock actuel</p>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-lg">{produit.stock_quantity}</span>
                              {produit.stock_quantity <= 5 && produit.stock_quantity > 0 && (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground">Marge de négociation</p>
                            <p className="font-medium">{formatCurrency(produit.prix_affichage - produit.prix_min)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stock" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestion du stock</CardTitle>
                    <CardDescription>
                      Ajustez la quantité disponible de ce produit
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Stock actuel</Label>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold">{produit.stock_quantity}</span>
                          <span className="text-muted-foreground">unités</span>
                        </div>
                        {produit.stock_quantity === 0 && (
                          <p className="text-sm text-red-500 mt-1">⚠️ Produit en rupture de stock</p>
                        )}
                        {produit.stock_quantity > 0 && produit.stock_quantity <= 5 && (
                          <p className="text-sm text-orange-500 mt-1">⚠️ Stock faible</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="new_stock">Nouveau stock</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="new_stock"
                            type="number"
                            min="0"
                            value={newStock}
                            onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                            className="flex-1"
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button disabled={newStock === produit.stock_quantity}>
                                <Package className="w-4 h-4 mr-2" />
                                Mettre à jour
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmer la mise à jour du stock</DialogTitle>
                                <DialogDescription>
                                  Voulez-vous vraiment modifier le stock de "{produit.nom}" ?
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <p className="text-sm">
                                  <strong>Stock actuel :</strong> {produit.stock_quantity} unités<br />
                                  <strong>Nouveau stock :</strong> {newStock} unités<br />
                                  <strong>Changement :</strong> {newStock > produit.stock_quantity ? '+' : ''}{newStock - produit.stock_quantity} unités
                                </p>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setNewStock(produit.stock_quantity)}>
                                  Annuler
                                </Button>
                                <Button onClick={handleUpdateStock} disabled={updating}>
                                  {updating ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Mise à jour...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-4 h-4 mr-2" />
                                      Confirmer
                                    </>
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Historique récent</h4>
                      <p className="text-sm text-muted-foreground">
                        Fonctionnalité bientôt disponible : historique des mouvements de stock
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Ventes</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{produit.total_ventes || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        unités vendues
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Demandes</CardTitle>
                      <Eye  className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{produit.total_demandes || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        fois demandé
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency((produit.total_ventes || 0) * produit.prix_affichage)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        estimé
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Taux de conversion</span>
                        <span className="font-medium">
                          {produit.total_demandes ? 
                            `${Math.round(((produit.total_ventes || 0) / produit.total_demandes) * 100)}%` :
                            '0%'
                          }
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Valeur stock restant</span>
                        <span className="font-medium">
                          {formatCurrency(produit.stock_quantity * produit.prix_affichage)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ajouté le</span>
                        <span className="font-medium">
                          {produit.created_at.toDate().toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
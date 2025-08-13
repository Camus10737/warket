"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Package, Save, Loader2, Upload, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authService, productService } from '@/lib/services'
import { CreateProductData, ProductCategory, ProductStatus } from '@/lib/types'
import { storageService } from '@/lib/services/storageService'

export default function NouveauProduit() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [boutique, setBoutique] = useState<any>(null)
  const [formData, setFormData] = useState<CreateProductData>({
    boutique_id: '',
    nom: '',
    description: '',
    category: 'Vêtements',
    category_custom: '',
    prix_affichage: 0,
    prix_min: 0,
    stock_quantity: 0,
    images: [],
    status: 'active' as ProductStatus // Utilisez l'union de type string
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    setFormData(prev => ({ ...prev, boutique_id: session.boutique.id }))
  }, [router])

  const handleInputChange = (field: keyof CreateProductData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Nettoyer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Validation en temps réel pour les prix
    if (field === 'prix_min' || field === 'prix_affichage') {
      const prixAffichage = field === 'prix_affichage' ? value : formData.prix_affichage
      const prixMin = field === 'prix_min' ? value : formData.prix_min
      
      if (prixMin > prixAffichage && prixAffichage > 0) {
        setErrors(prev => ({ 
          ...prev, 
          prix_min: 'Le prix minimum ne peut pas être supérieur au prix d\'affichage' 
        }))
      } else {
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.prix_min
          return newErrors
        })
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom du produit est obligatoire'
    }

    if (formData.prix_affichage <= 0) {
      newErrors.prix_affichage = 'Le prix d\'affichage doit être supérieur à 0'
    }

    if (formData.prix_min <= 0) {
      newErrors.prix_min = 'Le prix minimum doit être supérieur à 0'
    }

    if (formData.prix_min > formData.prix_affichage) {
      newErrors.prix_min = 'Le prix minimum ne peut pas être supérieur au prix d\'affichage'
    }

    if (formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Le stock ne peut pas être négatif'
    }

    if (formData.category === 'Autre' && !formData.category_custom?.trim()) {
      newErrors.category_custom = 'Veuillez spécifier la catégorie'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      
      const result = await productService.createProduct(formData)
      
      if (result.success) {
        router.push('/dashboard/produits')
      } else {
        setErrors({ submit: result.error || 'Erreur lors de la création' })
      }
    } catch (error) {
      setErrors({ submit: 'Erreur inattendue lors de la création' })
    } finally {
      setLoading(false)
    }
  }

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files
  if (!files) return

  setLoading(true)
  
  try {
    const filesArray = Array.from(files)
    const result = await storageService.uploadMultipleImages(filesArray, boutique.id)
    
    if (result.success && result.urls) {
      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, ...(result.urls || [])]
      }))
    }
    
    if (result.errors) {
      console.error('Erreurs upload:', result.errors)
      setErrors(prev => ({ ...prev, images: result.errors?.join(', ') || 'Erreur inconnue' }))
    }
  } catch (error) {
    console.error('Erreur upload images:', error)
    setErrors(prev => ({ ...prev, images: 'Erreur lors de l\'upload des images' }))
  } finally {
    setLoading(false)
  }
}

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount)
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
                Retour aux produits
              </Button>
              <div>
                <h1 className="text-xl font-bold">Nouveau Produit</h1>
                <p className="text-sm text-muted-foreground">
                  Ajouter un produit à votre boutique
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Informations de base */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Informations du produit
                </CardTitle>
                <CardDescription>
                  Détails de base de votre produit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nom">Nom du produit *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    placeholder="ex: Robe en wax"
                    className={errors.nom ? 'border-red-500' : ''}
                  />
                  {errors.nom && (
                    <p className="text-sm text-red-500 mt-1">{errors.nom}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Décrivez votre produit..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Catégorie *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value: ProductCategory) => handleInputChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === 'Autre' && (
                    <div>
                      <Label htmlFor="category_custom">Spécifiez la catégorie *</Label>
                      <Input
                        id="category_custom"
                        value={formData.category_custom || ''}
                        onChange={(e) => handleInputChange('category_custom', e.target.value)}
                        placeholder="ex: Produits pour bébé"
                        className={errors.category_custom ? 'border-red-500' : ''}
                      />
                      {errors.category_custom && (
                        <p className="text-sm text-red-500 mt-1">{errors.category_custom}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Prix et stock */}
            <Card>
              <CardHeader>
                <CardTitle>Prix et Stock</CardTitle>
                <CardDescription>
                  Définissez vos prix de vente et votre stock
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prix_affichage">Prix affiché (GNF) *</Label>
                    <Input
                      id="prix_affichage"
                      type="number"
                      min="0"
                      value={formData.prix_affichage}
                      onChange={(e) => handleInputChange('prix_affichage', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.prix_affichage ? 'border-red-500' : ''}
                    />
                    {errors.prix_affichage && (
                      <p className="text-sm text-red-500 mt-1">{errors.prix_affichage}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Prix que verront vos clients
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="prix_min">Prix minimum (GNF) *</Label>
                    <Input
                      id="prix_min"
                      type="number"
                      min="0"
                      value={formData.prix_min}
                      onChange={(e) => handleInputChange('prix_min', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.prix_min ? 'border-red-500' : ''}
                    />
                    {errors.prix_min && (
                      <p className="text-sm text-red-500 mt-1">{errors.prix_min}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Prix minimum pour les négociations
                    </p>
                  </div>
                </div>

                {formData.prix_affichage > 0 && formData.prix_min > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Aperçu des prix :</strong><br />
                      • Prix affiché : {formatCurrency(formData.prix_affichage)}<br />
                      • Prix minimum : {formatCurrency(formData.prix_min)}<br />
                      • Marge de négociation : {formatCurrency(formData.prix_affichage - formData.prix_min)}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="stock_quantity">Quantité en stock *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className={errors.stock_quantity ? 'border-red-500' : ''}
                  />
                  {errors.stock_quantity && (
                    <p className="text-sm text-red-500 mt-1">{errors.stock_quantity}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Images du produit</CardTitle>
                <CardDescription>
                  Ajoutez des photos de votre produit (optionnel)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="images">Ajouter des images</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Cliquez pour ajouter des images</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG jusqu'à 10MB</p>
                    </div>
                    <Input
                      id="images"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => document.getElementById('images')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choisir des images
                    </Button>
                  </div>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Produit ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                {errors.submit && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {errors.submit}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/produits')}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Ajouter le produit
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Store, Save, Loader2 } from "lucide-react"
import { authService, boutiqueService } from '@/lib/services'
import { CreateBoutiqueData } from '@/lib/types'

export default function NouvelleBoutiquePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<any>(null)
  const [formData, setFormData] = useState<CreateBoutiqueData>({
    nom_boutique: '',
    nom_vendeuse: '',
    prenom_vendeuse: '',
    numero_whatsapp: '',
    email: '',
    adresse: '',
    numero_depot: '',
    created_by: '',
    status: 'active'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Vérifier l'authentification admin
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'admin') {
      router.push('/auth/login')
      return
    }
    
    setCurrentAdmin(session.user)
    setFormData(prev => ({ ...prev, created_by: session.user.id }))
  }, [router])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nom_boutique.trim()) {
      newErrors.nom_boutique = 'Le nom de la boutique est obligatoire'
    }

    if (!formData.nom_vendeuse.trim()) {
      newErrors.nom_vendeuse = 'Le nom de la vendeuse est obligatoire'
    }

    if (!formData.prenom_vendeuse.trim()) {
      newErrors.prenom_vendeuse = 'Le prénom de la vendeuse est obligatoire'
    }

    if (!formData.numero_whatsapp.trim()) {
      newErrors.numero_whatsapp = 'Le numéro WhatsApp est obligatoire'
    } else {
      // Validation basique du numéro (commencer par +224 ou 224)
      const numero = formData.numero_whatsapp.replace(/[\s\-]/g, '')
      if (!numero.match(/^(\+?224|224)?[0-9]{8,9}$/)) {
        newErrors.numero_whatsapp = 'Format de numéro WhatsApp invalide (ex: +224 622 123 456)'
      }
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Format d\'email invalide'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof CreateBoutiqueData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Nettoyer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Auto-formater le numéro WhatsApp
    if (field === 'numero_whatsapp') {
      let cleaned = value.replace(/[^\d+]/g, '')
      if (cleaned.startsWith('224') && !cleaned.startsWith('+224')) {
        cleaned = '+' + cleaned
      } else if (!cleaned.startsWith('+') && !cleaned.startsWith('224')) {
        cleaned = '+224' + cleaned
      }
      setFormData(prev => ({ ...prev, numero_whatsapp: cleaned }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      
      const result = await boutiqueService.createBoutique(formData, currentAdmin.id)
      
      if (result.success) {
        router.push('/admin/boutiques')
      } else {
        setErrors({ submit: result.error || 'Erreur lors de la création' })
      }
    } catch (error) {
      setErrors({ submit: 'Erreur inattendue lors de la création' })
    } finally {
      setLoading(false)
    }
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
                onClick={() => router.push('/admin/boutiques')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux boutiques
              </Button>
              <div>
                <h1 className="text-xl font-bold">Nouvelle Boutique</h1>
                <p className="text-sm text-muted-foreground">
                  Créer un nouveau compte vendeuse
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Informations boutique */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="w-5 h-5 mr-2" />
                  Informations de la boutique
                </CardTitle>
                <CardDescription>
                  Informations de base sur la boutique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nom_boutique">Nom de la boutique *</Label>
                  <Input
                    id="nom_boutique"
                    value={formData.nom_boutique}
                    onChange={(e) => handleInputChange('nom_boutique', e.target.value)}
                    placeholder="ex: Boutique Fatou"
                    className={errors.nom_boutique ? 'border-red-500' : ''}
                  />
                  {errors.nom_boutique && (
                    <p className="text-sm text-red-500 mt-1">{errors.nom_boutique}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="adresse">Adresse (optionnel)</Label>
                  <Textarea
                    id="adresse"
                    value={formData.adresse || ''}
                    onChange={(e) => handleInputChange('adresse', e.target.value)}
                    placeholder="ex: Marché Madina, Conakry"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Informations vendeuse */}
            <Card>
              <CardHeader>
                <CardTitle>Informations de la vendeuse</CardTitle>
                <CardDescription>
                  Coordonnées de la personne qui gère la boutique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom_vendeuse">Nom *</Label>
                    <Input
                      id="nom_vendeuse"
                      value={formData.nom_vendeuse}
                      onChange={(e) => handleInputChange('nom_vendeuse', e.target.value)}
                      placeholder="ex: Diallo"
                      className={errors.nom_vendeuse ? 'border-red-500' : ''}
                    />
                    {errors.nom_vendeuse && (
                      <p className="text-sm text-red-500 mt-1">{errors.nom_vendeuse}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="prenom_vendeuse">Prénom *</Label>
                    <Input
                      id="prenom_vendeuse"
                      value={formData.prenom_vendeuse}
                      onChange={(e) => handleInputChange('prenom_vendeuse', e.target.value)}
                      placeholder="ex: Fatou"
                      className={errors.prenom_vendeuse ? 'border-red-500' : ''}
                    />
                    {errors.prenom_vendeuse && (
                      <p className="text-sm text-red-500 mt-1">{errors.prenom_vendeuse}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="numero_whatsapp">Numéro WhatsApp *</Label>
                  <Input
                    id="numero_whatsapp"
                    value={formData.numero_whatsapp}
                    onChange={(e) => handleInputChange('numero_whatsapp', e.target.value)}
                    placeholder="+224 622 123 456"
                    className={errors.numero_whatsapp ? 'border-red-500' : ''}
                  />
                  {errors.numero_whatsapp && (
                    <p className="text-sm text-red-500 mt-1">{errors.numero_whatsapp}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Ce numéro servira pour la connexion de la vendeuse
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="fatou@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="numero_depot">Numéro de dépôt (optionnel)</Label>
                  <Input
                    id="numero_depot"
                    value={formData.numero_depot || ''}
                    onChange={(e) => handleInputChange('numero_depot', e.target.value)}
                    placeholder="Numéro Orange Money ou MTN Money"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Pour recevoir les paiements des clients
                  </p>
                </div>
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
                    onClick={() => router.push('/admin/boutiques')}
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
                        Créer la boutique
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
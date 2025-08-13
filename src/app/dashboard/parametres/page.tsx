"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Store, 
  User, 
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Save,
  Loader2
} from "lucide-react"
import { authService, boutiqueService } from '@/lib/services'
import { UpdateBoutiqueData } from '@/lib/types'

export default function VendeuseParametres() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [boutique, setBoutique] = useState<any>(null)
  const [formData, setFormData] = useState<UpdateBoutiqueData>({
    nom_boutique: '',
    email: '',
    adresse: '',
    numero_depot: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Vérifier l'authentification vendeuse
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'boutique') {
      router.push('/auth/login')
      return
    }
    
    setBoutique(session.boutique)
    setFormData({
      nom_boutique: session.boutique.nom_boutique || '',
      email: session.boutique.email || '',
      adresse: session.boutique.adresse || '',
      numero_depot: session.boutique.numero_depot || ''
    })
  }, [router])

  const handleInputChange = (field: keyof UpdateBoutiqueData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Nettoyer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nom_boutique?.trim()) {
      newErrors.nom_boutique = 'Le nom de la boutique est obligatoire'
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Format d\'email invalide'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

 const handleSaveBoutique = async () => {
  if (!validateForm() || !boutique) return

  try {
    setLoading(true)

    // Optionnel: éviter d’envoyer des champs vides
    const payload = Object.fromEntries(
      Object.entries(formData).filter(([, v]) => `${v ?? ''}`.trim() !== '')
    ) as Partial<UpdateBoutiqueData>

    const result = await boutiqueService.updateBoutique(boutique.id, payload)

    if (result.success) {
      // 1) mettre à jour l’état local
      const merged = { ...boutique, ...payload }
      setBoutique(merged)
      setFormData({
        nom_boutique: merged.nom_boutique || '',
        email: merged.email || '',
        adresse: merged.adresse || '',
        numero_depot: merged.numero_depot || ''
      })

      // 2) mettre à jour la session + localStorage.boutiqueSession
      authService.updateBoutiqueInSession(payload as any)

      console.log('Boutique mise à jour avec succès')
    } else {
      setErrors({ submit: result.error || 'Erreur lors de la mise à jour' })
    }
  } catch (error) {
    setErrors({ submit: 'Erreur inattendue lors de la mise à jour' })
  } finally {
    setLoading(false)
  }
}

  

  if (!boutique) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des paramètres...</p>
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
                <h1 className="text-xl font-bold">Paramètres</h1>
                <p className="text-sm text-muted-foreground">
                  Configuration de votre boutique
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="boutique" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="boutique" className="flex items-center">
              <Store className="w-4 h-4 mr-2" />
              Ma Boutique
            </TabsTrigger>
            <TabsTrigger value="profil" className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              Mon Profil
            </TabsTrigger>
          </TabsList>

          {/* Onglet Boutique */}
          <TabsContent value="boutique" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations de la boutique</CardTitle>
                <CardDescription>
                  Gérez les informations de votre boutique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nom_boutique">Nom de la boutique</Label>
                  <Input
                    id="nom_boutique"
                    value={formData.nom_boutique || ''}
                    onChange={(e) => handleInputChange('nom_boutique', e.target.value)}
                    placeholder="Nom de votre boutique"
                    className={errors.nom_boutique ? 'border-red-500' : ''}
                  />
                  {errors.nom_boutique && (
                    <p className="text-sm text-red-500 mt-1">{errors.nom_boutique}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="votre@email.com"
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="adresse">Adresse (optionnel)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <Textarea
                      id="adresse"
                      value={formData.adresse || ''}
                      onChange={(e) => handleInputChange('adresse', e.target.value)}
                      placeholder="Adresse de votre boutique"
                      className="pl-10"
                      rows={2}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="numero_depot">Numéro de dépôt</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="numero_depot"
                      value={formData.numero_depot || ''}
                      onChange={(e) => handleInputChange('numero_depot', e.target.value)}
                      placeholder="Numéro Orange Money ou MTN Money"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les clients pourront envoyer leurs paiements sur ce numéro
                  </p>
                </div>

                <div className="pt-4 border-t">
                  {errors.submit && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.submit}
                    </div>
                  )}

                  <Button onClick={handleSaveBoutique} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Sauvegarder les modifications
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Profil */}
          <TabsContent value="profil" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Vos informations de vendeuse (non modifiables)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom</Label>
                    <Input
                      value={boutique.nom_vendeuse}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <Label>Prénom</Label>
                    <Input
                      value={boutique.prenom_vendeuse}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <Label>Numéro WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={boutique.numero_whatsapp}
                      disabled
                      className="pl-10 bg-gray-50"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ce numéro est utilisé pour vous connecter et ne peut pas être modifié
                  </p>
                </div>

                <div>
                  <Label>Membre depuis</Label>
                  <Input
                    value={new Date(boutique.created_at.seconds * 1000).toLocaleDateString('fr-FR')}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Pour modifier vos informations personnelles, contactez l'administrateur.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle>Mes statistiques</CardTitle>
                <CardDescription>
                  Aperçu de votre activité
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {boutique.total_produits || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Produits</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {boutique.total_ventes || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Ventes</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat('fr-GN', {
                        style: 'currency',
                        currency: 'GNF',
                        minimumFractionDigits: 0
                      }).format(boutique.chiffre_affaires || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
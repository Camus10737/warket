// Fichier: app/admin/boutiques/[id]/page.tsx - Modifications à ajouter

"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner' // ✅ Import Sonner
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X } from "lucide-react"


import { 
  ArrowLeft, 
  Store, 
  Edit, 
  Users, 
  Package, 
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2
} from "lucide-react"
import { authService, boutiqueService, statsService } from '@/lib/services'
import { Boutique, UpdateBoutiqueData } from '@/lib/types'

export default function BoutiqueDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const boutiqueId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [boutique, setBoutique] = useState<Boutique | null>(null)
  const [stats, setStats] = useState<any>(null)
  
  // ✅ États pour le modal d'édition
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editData, setEditData] = useState<UpdateBoutiqueData>({
    nom_boutique: '',
    email: '',
    adresse: '',
    numero_depot: ''
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Vérifier l'authentification admin
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'admin') {
      router.push('/auth/login')
      return
    }
    
    if (boutiqueId) {
      loadBoutiqueData()
    }
  }, [router, boutiqueId])

  // ✅ Effet pour pré-remplir le formulaire d'édition
  useEffect(() => {
    if (boutique) {
      setEditData({
        nom_boutique: boutique.nom_boutique,
        email: boutique.email || '',
        adresse: boutique.adresse || '',
        numero_depot: boutique.numero_depot || ''
      })
    }
  }, [boutique])

  const loadBoutiqueData = async () => {
    try {
      setLoading(true)
      
      console.log('🔍 Chargement boutique ID:', boutiqueId)

      const boutiqueResult = await boutiqueService.getBoutiqueById(boutiqueId)
      console.log('📄 Résultat boutique:', boutiqueResult)
      
      if (boutiqueResult.success && boutiqueResult.data) {
        setBoutique(boutiqueResult.data)
      } else {
        console.error('❌ Erreur récupération boutique:', boutiqueResult.error)
        toast.error('Erreur lors du chargement de la boutique')
      }

      const statsResult = await statsService.generateBoutiqueStats(boutiqueId)
      console.log('📊 Résultat stats:', statsResult)
      
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      } else {
        console.error('❌ Erreur récupération stats:', statsResult.error)
      }

    } catch (error) {
      console.error('❌ Erreur chargement boutique:', error)
      toast.error('Erreur inattendue lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    if (!boutique) return
    
    try {
      const result = await boutiqueService.updateBoutiqueStatus(boutique.id, newStatus)
      if (result.success) {
        setBoutique(prev => prev ? { ...prev, status: newStatus } : null)
        toast.success(`Boutique ${newStatus === 'active' ? 'activée' : 'désactivée'} avec succès`)
      } else {
        console.error('❌ Erreur changement statut:', result.error)
        toast.error(result.error || 'Erreur lors du changement de statut')
      }
    } catch (error) {
      console.error('❌ Erreur changement statut:', error)
      toast.error('Erreur inattendue lors du changement de statut')
    }
  }

  // ✅ Validation du formulaire d'édition
  const validateEditForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!editData.nom_boutique?.trim()) {
      newErrors.nom_boutique = 'Le nom de la boutique est obligatoire'
    }

    if (editData.email && !editData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Format d\'email invalide'
    }

    setEditErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ✅ Gestion des changements dans le formulaire
  const handleEditInputChange = (field: keyof UpdateBoutiqueData, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }))
    
    // Nettoyer l'erreur du champ modifié
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // ✅ Sauvegarde des modifications
  const handleSaveEdit = async () => {
    if (!validateEditForm() || !boutique) {
      return
    }

    try {
      setEditLoading(true)
      
      const result = await boutiqueService.updateBoutique(boutique.id, editData)
      
      if (result.success && result.data) {
        setBoutique(result.data)
        setShowEditModal(false)
        toast.success('Boutique modifiée avec succès ✅')
      } else {
        toast.error(result.error || 'Erreur lors de la modification')
        setEditErrors({ submit: result.error || 'Erreur lors de la modification' })
      }
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error)
      toast.error('Erreur inattendue lors de la sauvegarde')
      setEditErrors({ submit: 'Erreur inattendue lors de la sauvegarde' })
    } finally {
      setEditLoading(false)
    }
  }

  // ✅ Réinitialiser le modal
  const handleOpenEditModal = () => {
    setEditErrors({})
    setShowEditModal(true)
    // Re-remplir avec les données actuelles
    if (boutique) {
      setEditData({
        nom_boutique: boutique.nom_boutique,
        email: boutique.email || '',
        adresse: boutique.adresse || '',
        numero_depot: boutique.numero_depot || ''
      })
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

  // Gestion des cas d'erreur et de chargement (identique à avant)
  if (!boutiqueId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">ID boutique manquant</h2>
          <p className="text-muted-foreground mb-4">L'identifiant de la boutique n'est pas valide.</p>
          <Button onClick={() => router.push('/admin/boutiques')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux boutiques
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des détails...</p>
        </div>
      </div>
    )
  }

  if (!boutique) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Boutique non trouvée</h2>
          <p className="text-muted-foreground mb-4">
            Cette boutique n'existe pas ou a été supprimée. (ID: {boutiqueId})
          </p>
          <Button onClick={() => router.push('/admin/boutiques')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux boutiques
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
                onClick={() => router.push('/admin/boutiques')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold">{boutique.nom_boutique}</h1>
                <p className="text-sm text-muted-foreground">
                  {boutique.nom_vendeuse} {boutique.prenom_vendeuse}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(boutique.status)}
              {/* ✅ NOUVEAU: Modal custom simple */}
<>
  {/* Bouton Modifier */}
  <Button variant="outline" size="sm" onClick={handleOpenEditModal}>
    <Edit className="w-4 h-4 mr-2" />
    Modifier
  </Button>

  {/* Modal Overlay */}
  {showEditModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowEditModal(false)}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Modifier la boutique</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Modifiez les informations de la boutique. Les champs avec * sont obligatoires.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEditModal(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Form Content */}
        <div className="p-6 space-y-4">
          <div>
            <Label htmlFor="edit_nom_boutique">Nom de la boutique *</Label>
            <Input
              id="edit_nom_boutique"
              value={editData.nom_boutique || ''}
              onChange={(e) => handleEditInputChange('nom_boutique', e.target.value)}
              placeholder="Nom de la boutique"
              className={editErrors.nom_boutique ? 'border-red-500' : ''}
            />
            {editErrors.nom_boutique && (
              <p className="text-sm text-red-500 mt-1">{editErrors.nom_boutique}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit_email">Email (optionnel)</Label>
            <Input
              id="edit_email"
              type="email"
              value={editData.email || ''}
              onChange={(e) => handleEditInputChange('email', e.target.value)}
              placeholder="email@exemple.com"
              className={editErrors.email ? 'border-red-500' : ''}
            />
            {editErrors.email && (
              <p className="text-sm text-red-500 mt-1">{editErrors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit_adresse">Adresse (optionnel)</Label>
            <Textarea
              id="edit_adresse"
              value={editData.adresse || ''}
              onChange={(e) => handleEditInputChange('adresse', e.target.value)}
              placeholder="Adresse de la boutique"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="edit_numero_depot">Numéro de dépôt (optionnel)</Label>
            <Input
              id="edit_numero_depot"
              value={editData.numero_depot || ''}
              onChange={(e) => handleEditInputChange('numero_depot', e.target.value)}
              placeholder="Orange Money ou MTN Money"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Pour recevoir les paiements des clients
            </p>
          </div>

          {/* Informations non modifiables */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Informations non modifiables :</p>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Vendeuse :</span>
                <span className="ml-2 font-medium">
                  {boutique.nom_vendeuse} {boutique.prenom_vendeuse}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">WhatsApp :</span>
                <span className="ml-2 font-medium">{boutique.numero_whatsapp}</span>
              </div>
            </div>
          </div>

          {editErrors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {editErrors.submit}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => setShowEditModal(false)}
            disabled={editLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleSaveEdit} disabled={editLoading}>
            {editLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )}
</>
              
              <Button 
                variant={boutique.status === 'active' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => handleStatusChange(
                  boutique.status === 'active' ? 'inactive' : 'active'
                )}
              >
                {boutique.status === 'active' ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Le reste du composant reste identique - stats, onglets, etc. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produits</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.produits?.total_produits || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.produits?.produits_rupture || 0} en rupture
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.clients?.total_clients || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.clients?.clients_actifs || 0} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commandes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.commandes?.total_commandes || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.commandes?.commandes_en_attente || 0} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.commandes?.chiffre_affaires_total || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ce mois : {formatCurrency(stats?.commandes?.chiffre_affaires_ce_mois || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

    

        {/* Onglets détaillés */}
        <Tabs defaultValue="apercu" className="space-y-6">
          <TabsList>
            <TabsTrigger value="apercu">Aperçu</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="produits">Produits</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="apercu" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informations boutique */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="w-5 h-5 mr-2" />
                    Informations boutique
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nom de la boutique</p>
                    <p className="font-medium">{boutique.nom_boutique}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Vendeuse</p>
                    <p className="font-medium">{boutique.nom_vendeuse} {boutique.prenom_vendeuse}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">WhatsApp</p>
                    <p className="font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {boutique.numero_whatsapp}
                    </p>
                  </div>
                  
                  {boutique.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        {boutique.email}
                      </p>
                    </div>
                  )}
                  
                  {boutique.adresse && (
                    <div>
                      <p className="text-sm text-muted-foreground">Adresse</p>
                      <p className="font-medium flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {boutique.adresse}
                      </p>
                    </div>
                  )}
                  
                  {boutique.numero_depot && (
                    <div>
                      <p className="text-sm text-muted-foreground">Numéro de dépôt</p>
                      <p className="font-medium">{boutique.numero_depot}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Créée le</p>
                    <p className="font-medium">{boutique.created_at.toDate().toLocaleDateString('fr-FR')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Score de performance */}
              {stats?.resume && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Score de performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {stats.resume.score_performance}/100
                      </div>
                      <Badge variant={
                        stats.resume.score_performance >= 80 ? 'default' :
                        stats.resume.score_performance >= 60 ? 'secondary' : 'destructive'
                      }>
                        {stats.resume.score_performance >= 80 ? 'Excellent' :
                         stats.resume.score_performance >= 60 ? 'Bon' : 'À améliorer'}
                      </Badge>
                    </div>

                    {stats.resume.points_forts.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-2">Points forts :</p>
                        <ul className="text-sm space-y-1">
                          {stats.resume.points_forts.map((point: string, index: number) => (
                            <li key={index} className="flex items-center text-green-600">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {stats.resume.axes_amelioration.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-orange-700 mb-2">À améliorer :</p>
                        <ul className="text-sm space-y-1">
                          {stats.resume.axes_amelioration.map((axe: string, index: number) => (
                            <li key={index} className="flex items-center text-orange-600">
                              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2" />
                              {axe}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Métriques de performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {stats?.conversations?.taux_resolution_bot || 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Taux résolution bot</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {stats?.commandes?.panier_moyen ? formatCurrency(stats.commandes.panier_moyen) : '0 GNF'}
                    </div>
                    <p className="text-sm text-muted-foreground">Panier moyen</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {stats?.conversations?.escalations_en_attente || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Escalations en attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="produits">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu des produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.produits?.total_produits || 0}</div>
                    <p className="text-sm text-muted-foreground">Total produits</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.produits?.produits_disponibles || 0}</div>
                    <p className="text-sm text-muted-foreground">Disponibles</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{stats?.produits?.produits_rupture || 0}</div>
                    <p className="text-sm text-muted-foreground">En rupture</p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/admin/boutiques/${boutique.id}/produits`)}
                  >
                    Voir tous les produits
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu des clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.clients?.total_clients || 0}</div>
                    <p className="text-sm text-muted-foreground">Total clients</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.clients?.clients_actifs || 0}</div>
                    <p className="text-sm text-muted-foreground">Clients actifs</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.clients?.nouveaux_ce_mois || 0}</div>
                    <p className="text-sm text-muted-foreground">Nouveaux ce mois</p>
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
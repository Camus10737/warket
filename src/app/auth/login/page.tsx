"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { authService } from "@/lib/services"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Store, Users, TrendingUp, UserCheck, Building, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("boutique")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // États pour les formulaires
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: ""
  })
  
  const [boutiqueForm, setBoutiqueForm] = useState({
    whatsapp: ""
  })

  // S'assurer que le composant est monté côté client
  useEffect(() => {
    setMounted(true)
    // Forcer l'initialisation du service auth côté client
    authService.ensureClientInitialization()

    // Vérifier si déjà connecté
    const currentSession = authService.getCurrentSession()
    if (currentSession) {
      if (currentSession.type === 'admin') {
        router.push('/admin')
      } else if (currentSession.type === 'boutique') {
        router.push('/dashboard')
      }
    }
  }, [router])

  // Ne pas rendre tant que le composant n'est pas monté côté client
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Connexion Admin avec le service authService
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await authService.loginAdmin(adminForm.email, adminForm.password)
      
      if (result.success) {
        router.push("/admin")
      } else {
        setError(result.error || "Erreur de connexion")
      }
    } catch (error: any) {
      setError("Erreur de connexion. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  // Connexion Boutique avec le service authService
  const handleBoutiqueLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await authService.loginBoutique(boutiqueForm.whatsapp)
      
      if (result.success) {
        router.push("/dashboard")
      } else {
        setError(result.error || "Numéro WhatsApp non trouvé")
      }
    } catch (error: any) {
      setError("Erreur de connexion. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Wariket</h1>
              <p className="text-sm text-muted-foreground">Assistant de vente WhatsApp</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            🇬🇳 Guinée
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Gérez vos ventes 
                <span className="text-primary"> WhatsApp</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Assistant automatique pour vendeuses en Guinée. Réponses clients, gestion stock, commandes 24h/24.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Réponses automatiques</h3>
                  <p className="text-muted-foreground">
                    L'assistant répond à vos clients même quand vous n'êtes pas disponible.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Gestion du stock</h3>
                  <p className="text-muted-foreground">
                    Suivez vos produits, prix et quantités en temps réel.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Plus de ventes</h3>
                  <p className="text-muted-foreground">
                    Ne ratez plus jamais une vente, même la nuit ou le weekend.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Connexion</CardTitle>
                <CardDescription>
                  Accédez à votre espace Wariket
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="boutique" className="flex items-center space-x-2">
                      <Store className="w-4 h-4" />
                      <span>Boutique</span>
                    </TabsTrigger>
                    <TabsTrigger value="admin" className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4" />
                      <span>Admin</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Connexion Boutique */}
                  <TabsContent value="boutique" className="space-y-4 mt-6">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-foreground">Connexion Vendeuse</h3>
                      <p className="text-sm text-muted-foreground">Entrez votre numéro WhatsApp</p>
                    </div>
                    
                    {error && activeTab === "boutique" && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleBoutiqueLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">Numéro WhatsApp</Label>
                        <Input 
                          id="whatsapp" 
                          type="tel" 
                          placeholder="+224 622 123 456"
                          className="h-12"
                          value={boutiqueForm.whatsapp}
                          onChange={(e) => setBoutiqueForm({...boutiqueForm, whatsapp: e.target.value})}
                          required
                        />
                      </div>

                      <Button 
                        type="submit"
                        className="w-full h-12 text-base" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connexion...
                          </>
                        ) : (
                          "Accéder à ma boutique"
                        )}
                      </Button>
                    </form>

                    <div className="text-center pt-2">
                      <p className="text-xs text-muted-foreground">
                        Votre numéro doit être enregistré par l'administrateur
                      </p>
                    </div>
                  </TabsContent>

                  {/* Connexion Admin */}
                  <TabsContent value="admin" className="space-y-4 mt-6">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-foreground">Espace Administrateur</h3>
                      <p className="text-sm text-muted-foreground">Gérez toutes les boutiques</p>
                    </div>

                    {error && activeTab === "admin" && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Email</Label>
                        <Input 
                          id="admin-email" 
                          type="email" 
                          placeholder="admin@wariket.com"
                          className="h-12"
                          value={adminForm.email}
                          onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="admin-password">Mot de passe</Label>
                        <Input 
                          id="admin-password" 
                          type="password" 
                          placeholder="••••••••"
                          className="h-12"
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                          required
                        />
                      </div>

                      <Button 
                        type="submit"
                        className="w-full h-12 text-base"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connexion...
                          </>
                        ) : (
                          "Connexion Admin"
                        )}
                      </Button>
                    </form>

                    <div className="text-center pt-2">
                      <a href="#" className="text-xs text-primary hover:underline">
                        Mot de passe oublié ?
                      </a>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="container mx-auto px-4 py-8 border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-primary mb-2">MVP</div>
            <div className="text-muted-foreground">Projet en développement</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary mb-2">Test</div>
            <div className="text-muted-foreground">Phase d'expérimentation</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary mb-2">Guinée</div>
            <div className="text-muted-foreground">Conçu pour le marché local</div>
          </div>
        </div>
      </div>
    </div>
  )
}
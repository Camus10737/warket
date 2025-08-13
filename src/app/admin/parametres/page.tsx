"use client"

// Fichier: /frontend/src/app/admin/parametres/page.tsx (exemple de chemin)

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Loader2, User, Bot } from "lucide-react"
import { authService } from '@/lib/services/authService'

export default function AdminParametresPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<any>(null)

  // Profil
  const [profileData, setProfileData] = useState({ name: '', email: '' })
  const [passwords, setPasswords] = useState({ current: '', next: '' })

  // Bot
  const [botWelcome, setBotWelcome] = useState("Bonjour ! Je suis votre assistant Wariket. Comment puis-je vous aider ?")

  useEffect(() => {
    authService.ensureClientInitialization()
    const session = authService.getCurrentSession()
    if (!session || session.type !== 'admin') {
      router.push('/auth/login')
      return
    }
    setCurrentAdmin(session.user)
    setProfileData({ name: session.user.name, email: session.user.email })

    ;(async () => {
      const cfg = await authService.getSystemConfig()
      if (cfg.success && cfg.data?.bot_welcome_template) {
        setBotWelcome(cfg.data.bot_welcome_template)
      }
    })()
  }, [router])

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      if (!profileData.name.trim()) return toast.error('Le nom est obligatoire')
      const res = await authService.updateProfile(profileData.name, profileData.email)
      res.success ? toast.success('✅ Profil mis à jour') : toast.error(res.error || 'Erreur')
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`)
return
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      if (!passwords.next) return toast.error('Nouveau mot de passe requis')
      setLoading(true)
      const res = await authService.changePassword(passwords.next, passwords.current || undefined)
      if (res.success) {
        toast.success('🔐 Mot de passe modifié')
        setPasswords({ current: '', next: '' })
      } else {
        toast.error(res.error || 'Erreur')
      }
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBotWelcome = async () => {
    try {
      setLoading(true)
      const res = await authService.saveBotWelcomeTemplate(botWelcome)
      res.success ? toast.success('🤖 Message de bienvenue sauvegardé') : toast.error(res.error || 'Erreur')
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
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
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold">Paramètres</h1>
                <p className="text-sm text-muted-foreground">Configuration du système Wariket (MVP)</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Connecté en tant que: <span className="font-medium">{currentAdmin.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="w-4 h-4 mr-2" /> Profil
            </TabsTrigger>
            <TabsTrigger value="bot" className="flex items-center">
              <Bot className="w-4 h-4 mr-2" /> Bot
            </TabsTrigger>
          </TabsList>

          {/* PROFIL */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du profil</CardTitle>
                <CardDescription>Gérez vos informations d’administrateur</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom complet *</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Votre nom complet"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))}
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</> : <><Save className="w-4 h-4 mr-2" />Sauvegarder le profil</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Changer le mot de passe</CardTitle>
                <CardDescription>Réauthentification incluse si vous entrez votre mot de passe actuel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="current">Mot de passe actuel (optionnel)</Label>
                    <Input
                      id="current"
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label htmlFor="next">Nouveau mot de passe *</Label>
                    <Input
                      id="next"
                      type="password"
                      value={passwords.next}
                      onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changement...</> : <><Save className="w-4 h-4 mr-2" />Changer le mot de passe</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOT */}
          <TabsContent value="bot" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Message d’accueil du bot</CardTitle>
                <CardDescription>Le message envoyé automatiquement au premier contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="welcome">Message</Label>
                  <Textarea
                    id="welcome"
                    value={botWelcome}
                    onChange={(e) => setBotWelcome(e.target.value)}
                    rows={3}
                    placeholder="Bonjour ! Je suis votre assistant Wariket. Comment puis-je vous aider ?"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveBotWelcome} disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</> : <><Save className="w-4 h-4 mr-2" />Sauvegarder</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

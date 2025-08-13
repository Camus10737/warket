"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/services'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Vérifier s'il y a une session active
    const session = authService.getCurrentSession()
    
    if (session) {
      // Si connecté, rediriger vers le dashboard approprié
      if (session.type === 'admin') {
        router.push('/admin/dashboard')
      } else if (session.type === 'boutique') {
        router.push('/dashboard')
      }
    } else {
      // Si pas connecté, rediriger vers login
      router.push('/auth/login')
    }
  }, [router])

  // Affichage pendant la redirection
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Wariket</h2>
        <p className="text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  )
}
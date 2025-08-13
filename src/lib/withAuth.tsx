// Remplacez TOUT le contenu de src/lib/withAuth.tsx par ceci :

"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/services"

type Role = "admin" | "boutique"

export function withAuth(WrappedComponent: React.ComponentType<any>, requiredRole: Role) {
  return function ComponentWithAuth(props: any) {
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
      const session = authService.getCurrentSession()
      if (!session || session.type !== requiredRole) {
        router.replace("/auth/login")
        return
      }
      setLoading(false)
    }, [router])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
}
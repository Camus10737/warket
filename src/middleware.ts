// /frontend/src/middleware.ts - VERSION CORRIGÉE
import { NextResponse, NextRequest } from 'next/server'

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api') ||
    /\.[\w]+$/.test(pathname)
  )
}

function redirectWithNext(req: NextRequest, to: string) {
  const url = req.nextUrl.clone()
  url.pathname = to
  url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isAssetPath(pathname)) {
    return NextResponse.next()
  }

  const wAuth = req.cookies.get('w_auth')?.value
  const wRole = req.cookies.get('w_role')?.value as 'admin' | 'boutique' | undefined
  const isAuthed = wAuth === '1'

  // Zones protégées
  const isAdminZone = pathname.startsWith('/admin')
  const isBoutiqueZone = pathname.startsWith('/dashboard')
  const isLogin = pathname.startsWith('/auth/login')

  // 🔧 FIX: Ne rediriger QUE si on protège une zone
  // Ne PAS rediriger depuis /auth/login automatiquement
  
  // 1) Protéger les zones admin/boutique
  if (isAdminZone && (!isAuthed || wRole !== 'admin')) {
    return redirectWithNext(req, '/auth/login')
  }
  if (isBoutiqueZone && (!isAuthed || wRole !== 'boutique')) {
    return redirectWithNext(req, '/auth/login')
  }

  // 2) Laisser /auth/login accessible même si connecté
  // (pour permettre de se déconnecter/reconnecter)
  
  // 3) Optionnel : rediriger SEULEMENT la racine "/"
  if (pathname === '/' && isAuthed) {
    const url = req.nextUrl.clone()
    url.pathname = wRole === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  const res = NextResponse.next()
  if (isAdminZone || isBoutiqueZone) {
    res.headers.set('Cache-Control', 'no-store')
  }
  return res
}

export const config = {
  matcher: [
    '/',
    '/auth/login',
    '/admin/:path*',
    '/dashboard/:path*',
  ],
}
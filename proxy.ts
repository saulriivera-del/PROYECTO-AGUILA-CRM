import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] || ''
  const pathname = request.nextUrl.pathname

  // =====================================================
  // PORTAL CORPORATIVO - empresas.visamaster.com.mx
  // =====================================================
  if (host === 'empresas.visamaster.com.mx') {
    // No tocar assets, API ni rutas internas ya resueltas
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/empresas')
    ) {
      return NextResponse.next()
    }

    const url = request.nextUrl.clone()

    // empresas.visamaster.com.mx
    if (pathname === '/') {
      url.pathname = '/empresas'
      return NextResponse.rewrite(url)
    }

    // URL limpia:
    // /login      -> /empresas/login
    // /tramites   -> /empresas/tramites
    // /actividad  -> /empresas/actividad
    // etc.
    url.pathname = `/empresas${pathname}`

    return NextResponse.rewrite(url)
  }

  // =====================================================
  // PROYECTO ÁGUILA / CRM INTERNO
  // Conserva la lógica actual de Supabase
  // =====================================================
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
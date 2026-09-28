import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] || ''
  const pathname = request.nextUrl.pathname

  if (host === 'empresas.visamaster.com.mx') {
    // Evita tocar assets, API y rutas ya internas del módulo.
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/empresas')
    ) {
      return NextResponse.next()
    }

    const url = request.nextUrl.clone()

    if (pathname === '/') {
      url.pathname = '/empresas'
      return NextResponse.rewrite(url)
    }

    // Permite URLs limpias del subdominio:
    // /login -> /empresas/login, /tramites -> /empresas/tramites, etc.
    url.pathname = `/empresas${pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}

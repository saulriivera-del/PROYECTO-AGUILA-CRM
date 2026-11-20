import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next') ?? '/admin'
  const nextUrl = new URL(requestedNext, requestUrl.origin)
  const safeNext = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    && !requestedNext.includes('\\\\') && nextUrl.origin === requestUrl.origin
    ? nextUrl : new URL('/admin', requestUrl.origin)

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(safeNext)
}

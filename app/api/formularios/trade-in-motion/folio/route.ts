import { NextResponse } from 'next/server'
import { isValidFolio } from '@/lib/candidate-folio'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CANDIDATE_COOKIE, SESSION_SECONDS, newSessionToken, tokenHash, verifyCandidateKey,
  resolveFolioSession, sameOrigin,
} from '@/lib/trade-in-motion-folio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const respond = (data: object, status = 200) => NextResponse.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
})
const invalid = () => respond({ error: 'Folio o clave incorrectos, vencidos o temporalmente bloqueados.' }, 401)

export async function GET() {
  try {
    const candidate = await resolveFolioSession()
    if (!candidate) return respond({ error: 'Inicia sesión con tu folio y clave.' }, 401)
    const { data: draft, error } = await candidate.admin.from('vm_trade_in_motion_drafts')
      .select('answers,people,status,updated_at,submitted_at,consent_at')
      .eq('access_id', candidate.access.id).eq('organization_id', candidate.access.organization_id).maybeSingle()
    if (error) throw error
    return respond({ name: candidate.access.applicant_name, folio: candidate.access.folio, draft: draft || null })
  } catch {
    return respond({ error: 'No pudimos recuperar el expediente.' }, 503)
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return respond({ error: 'Origen no autorizado.' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return respond({ error: 'Solicitud inválida.' }, 415)
  let folio = '', key = ''
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 4096) return respond({ error: 'Solicitud demasiado extensa.' }, 413)
    const body = JSON.parse(raw)
    folio = typeof body.folio === 'string' ? body.folio.trim().toUpperCase() : ''
    key = typeof body.key === 'string' ? body.key.trim() : ''
  } catch { return invalid() }
  if (!isValidFolio(folio) || !/^[a-fA-F0-9\s-]{24,40}$/.test(key)) return invalid()
  try {
    const admin = createAdminClient()
    const { data: access, error } = await admin.from('vm_trade_in_motion_access')
      .select('id,applicant_name,key_hash,is_active,failed_attempts,locked_until')
      .eq('folio',folio).maybeSingle()
    if (error || !access?.is_active || (access.locked_until && new Date(access.locked_until).getTime() > Date.now())) return invalid()
    if (!verifyCandidateKey(key, access.key_hash)) {
      const attempts = (access.failed_attempts || 0) + 1
      await admin.from('vm_trade_in_motion_access').update({
        failed_attempts: attempts >= 5 ? 0 : attempts,
        locked_until: attempts >= 5 ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null,
      }).eq('id',access.id)
      return invalid()
    }
    const token = newSessionToken()
    const { error: sessionError } = await admin.from('vm_trade_in_motion_sessions').insert({
      access_id: access.id, token_hash: tokenHash(token),
      expires_at: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
    })
    if (sessionError) throw sessionError
    await admin.from('vm_trade_in_motion_access').update({ failed_attempts: 0, locked_until: null })
      .eq('id',access.id)
    const response = respond({ authenticated: true, name: access.applicant_name })
    response.cookies.set(CANDIDATE_COOKIE,token,{
      httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'lax',
      path:'/', maxAge:SESSION_SECONDS,
    })
    return response
  } catch { return respond({ error: 'No pudimos abrir la sesión. Intenta de nuevo.' }, 503) }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return respond({ error: 'Origen no autorizado.' }, 403)
  try {
    const candidate = await resolveFolioSession()
    if (candidate) await candidate.admin.from('vm_trade_in_motion_sessions')
      .update({ revoked_at: new Date().toISOString() }).eq('id',candidate.sessionId)
  } catch { /* Eliminar siempre la cookie local. */ }
  const response = respond({ signedOut: true })
  response.cookies.set(CANDIDATE_COOKIE,'',{ path:'/',maxAge:0,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV === 'production' })
  return response
}

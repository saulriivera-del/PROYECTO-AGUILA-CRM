import 'server-only'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const CANDIDATE_COOKIE = 'vm_tn_candidate_session'
export const SESSION_SECONDS = 7 * 24 * 60 * 60

export function newFolio() { return 'VM-' + randomBytes(6).toString('hex').toUpperCase() }
export function newCandidateKey() {
  return randomBytes(12).toString('hex').toUpperCase().match(/.{1,6}/g)!.join('-')
}
export function normalizeCandidateKey(value: string) {
  return value.toUpperCase().replace(/[\s-]/g, '')
}
export function hashCandidateKey(value: string) {
  const salt = randomBytes(16).toString('hex')
  const digest = scryptSync(normalizeCandidateKey(value), Buffer.from(salt, 'hex'), 32).toString('hex')
  return `scrypt:${salt}:${digest}`
}
export function verifyCandidateKey(value: string, encoded: string) {
  const parts = /^scrypt:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(encoded)
  if (!parts) return false
  const actual = scryptSync(normalizeCandidateKey(value), Buffer.from(parts[1], 'hex'), 32)
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex'))
}
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }
export function newSessionToken() { return randomBytes(32).toString('hex') }
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}
export async function resolveFolioSession() {
  const raw = (await cookies()).get(CANDIDATE_COOKIE)?.value || ''
  if (!/^[a-f0-9]{64}$/.test(raw)) return null
  const admin = createAdminClient()
  const { data: session, error: sessionError } = await admin.from('vm_trade_in_motion_sessions')
    .select('id,access_id,expires_at,revoked_at').eq('token_hash', tokenHash(raw)).maybeSingle()
  if (sessionError || !session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null
  const { data: access, error: accessError } = await admin.from('vm_trade_in_motion_access')
    .select('id,organization_id,company_id,applicant_name,folio,is_active')
    .eq('id',session.access_id).maybeSingle()
  if (accessError || !access?.is_active) return null
  return { admin, access, sessionId: session.id }
}

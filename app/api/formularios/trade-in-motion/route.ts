import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanAnswers, cleanPeople, validateSubmission } from '@/lib/trade-in-motion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const respond = (data: object, status = 200) => NextResponse.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
})
async function resolveCandidate() {
  const supabase = await createClient()
  // Supabase verifica la sesión en el servidor, no se confía en un email del navegador.
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email || !user.email_confirmed_at) return null
  return { id: user.id, email: user.email.trim().toLowerCase() }
}
async function databaseContext() {
  const admin = createAdminClient()
  const [{ data: organization }, { data: company }] = await Promise.all([
    admin.from('organizations').select('id').eq('name', 'Visa Master').maybeSingle(),
    admin.from('companies').select('id').eq('slug', 'trade-in-motion').eq('is_active', true).maybeSingle(),
  ])
  if (!organization || !company) throw new Error('Configuración de empresa no encontrada')
  return { admin, organizationId: organization.id as string, companyId: company.id as string }
}
async function isInvited(
  admin: ReturnType<typeof createAdminClient>, candidateEmail: string, organizationId: string, companyId: string,
) {
  const { data, error } = await admin.from('vm_trade_in_motion_invites')
    .select('id').eq('organization_id', organizationId).eq('company_id', companyId)
    .eq('applicant_email', candidateEmail).eq('is_active', true).maybeSingle()
  if (error) throw error
  return Boolean(data)
}
export async function GET() {
  const candidate = await resolveCandidate()
  if (!candidate) return respond({ error: 'Verifica tu correo para continuar.' }, 401)
  try {
    const { admin, organizationId, companyId } = await databaseContext()
    if (!await isInvited(admin, candidate.email, organizationId, companyId)) {
      return respond({ error: 'Tu correo todavía no está autorizado. Pide a Visa Master que lo registre antes de comenzar.' }, 403)
    }
    const { data, error } = await admin.from('vm_trade_in_motion_drafts')
      .select('answers, people, status, updated_at, submitted_at, consent_at')
      .eq('auth_user_id', candidate.id).eq('company_id', companyId).maybeSingle()
    if (error) throw error
    return respond({ email: candidate.email, draft: data ?? null })
  } catch {
    return respond({ error: 'No se pudieron consultar tus respuestas.' }, 503)
  }
}

export async function POST(request: Request) {
  const candidate = await resolveCandidate()
  if (!candidate) return respond({ error: 'Tu sesión venció. Verifica nuevamente el correo.' }, 401)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return respond({ error: 'Formato de solicitud inválido.' }, 415)
  }
  let payload: { action?: unknown; answers?: unknown; people?: unknown; consent?: unknown }
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > 131072) return respond({ error: 'Formulario demasiado extenso.' }, 413)
    payload = JSON.parse(raw)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid JSON')
  } catch {
    return respond({ error: 'No pudimos interpretar las respuestas.' }, 400)
  }
  const action = payload.action
  if (action !== 'save' && action !== 'submit') return respond({ error: 'Acción inválida.' }, 400)
  const answers = cleanAnswers(payload.answers)
  const people = cleanPeople(payload.people)
  answers.email = candidate.email
  if (answers.travel_with_someone !== 'Sí') people.companions = []
  if (answers.family_us !== 'Sí') people.relatives = []
  if (payload.consent !== true) return respond({ error: 'Acepta el aviso de privacidad antes de guardar tus respuestas.' }, 422)
  if (action === 'submit') {
    const missing = validateSubmission(answers, people)
    if (missing.length) return respond({ error: 'Completa las respuestas marcadas.', fields: missing.slice(0, 20) }, 422)
  }

  try {
    const { admin, organizationId, companyId } = await databaseContext()
    if (!await isInvited(admin, candidate.email, organizationId, companyId)) {
      return respond({ error: 'Tu correo no está autorizado para este formulario.' }, 403)
    }
    const { data: previous, error: prevError } = await admin.from('vm_trade_in_motion_drafts')
      .select('id,status,submission_id,consent_at')
      .eq('company_id', companyId).eq('auth_user_id', candidate.id).maybeSingle()
    if (prevError) throw prevError
    if (previous?.status === 'Enviado') return respond({ saved: true, submitted: true })

    let draftId: string
    let submissionId: string
    if (previous) {
      const { error } = await admin.from('vm_trade_in_motion_drafts')
        .update({ answers, people, updated_at: new Date().toISOString(), consent_at: previous.consent_at || new Date().toISOString(), consent_version: 'aviso-privacidad-2026-11' })
        .eq('id', previous.id).eq('auth_user_id', candidate.id).eq('status','Borrador')
      if (error) throw error
      draftId = previous.id
      submissionId = previous.submission_id
    } else {
      const { data: created, error } = await admin.from('vm_trade_in_motion_drafts')
        .insert({ organization_id: organizationId, company_id: companyId,
          auth_user_id: candidate.id, applicant_email: candidate.email, answers, people, status: 'Borrador',
          consent_at: new Date().toISOString(), consent_version: 'aviso-privacidad-2026-11' })
        .select('id,submission_id').single()
      if (error || !created) throw error || new Error('Draft not created')
      draftId = created.id
      submissionId = created.submission_id
    }
    if (action === 'save') return respond({ saved: true, submitted: false })

    // Ya se validó Auth real, no un verifiedAt suministrado por el solicitante.
    // La función existente es idempotente y crea/vincula un único expediente TN.
    const { data: createdCase, error: caseError } = await admin.rpc('create_vm_trade_in_motion_case', {
      p_submission_id: submissionId,
      p_answers: { ...answers, companions: people.companions, relatives: people.relatives },
      p_verified_email: candidate.email,
      p_verified_at: new Date().toISOString(),
    })
    if (caseError) {
      console.error('DS-160 intake RPC failed:', caseError.code)
      return respond({ error: 'Se guardaron las respuestas, pero no se pudo concluir el envío. Inténtalo de nuevo.' }, 503)
    }
    const { error: finalizedError } = await admin.from('vm_trade_in_motion_drafts').update({
      status: 'Enviado', submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), consent_at: new Date().toISOString(),
      consent_version: 'aviso-privacidad-2026-11',
    }).eq('id', draftId).eq('auth_user_id', candidate.id)
    if (finalizedError) {
      console.error('DS-160 final draft status failed:', finalizedError.code)
      return respond({ error: 'La solicitud fue recibida, pero la confirmación está pendiente. Contacta a Visa Master.' }, 503)
    }
    return respond({ saved: true, submitted: true, processId: (createdCase as { processId?: string } | null)?.processId })
  } catch {
    return respond({ error: 'Servicio temporalmente no disponible. Tus respuestas no se confirmaron como guardadas.' }, 503)
  }
}

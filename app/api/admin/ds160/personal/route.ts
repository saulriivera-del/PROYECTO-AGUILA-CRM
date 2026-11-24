import { NextResponse } from 'next/server'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { personalAnswers, personalDigest, personalProblems, PERSONAL_TRANSFER_SCHEMA } from '@/lib/ds160-personal-transfer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function reply(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  } })
}

/**
 * Solo se llama desde la página autenticada de revisión de Águila.
 * La extensión abre la pestaña de Águila del operador, ejecuta un GET
 * same-origin y utiliza el resultado en memoria; jamás lee service-role.
 */
export async function GET(request: Request) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') return reply({ error: 'Acceso restringido' }, 403)

  const url = new URL(request.url)
  const id = url.searchParams.get('draft_id') || ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return reply({ error: 'Expediente inválido' }, 400)

  const admin = createAdminClient()
  const { data: draft, error } = await admin.from('vm_trade_in_motion_drafts')
    .select('id,organization_id,status,consent_at,answers,updated_at,ds160_personal_approved_at,ds160_personal_approved_by,ds160_personal_approved_digest')
    .eq('id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (error) return reply({ error: 'No se pudo verificar el expediente' }, 503)
  if (!draft) return reply({ error: 'Expediente no localizado' }, 404)
  const { data: correction, error: correctionError } = await admin.from('vm_ds160_corrections')
    .select('answers, updated_at').eq('draft_id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (correctionError) return reply({ error: 'No se pudo comprobar la versión corregida' }, 503)
  const effectiveAnswers = correction?.answers ?? draft.answers
  if (draft.status !== 'Enviado' || !draft.consent_at ||
      !draft.ds160_personal_approved_at || !draft.ds160_personal_approved_by ||
      !draft.ds160_personal_approved_digest)
    return reply({ error: 'Datos personales pendientes de autorización' }, 409)
  if (Math.max(new Date(draft.updated_at).getTime(), correction?.updated_at ? new Date(correction.updated_at).getTime() : 0) > new Date(draft.ds160_personal_approved_at).getTime() ||
      draft.ds160_personal_approved_digest !== personalDigest(effectiveAnswers))
    return reply({ error: 'Las respuestas cambiaron; se necesita una nueva aprobación' }, 409)

  if (personalProblems(effectiveAnswers).length)
    return reply({ error: 'Los datos personales están incompletos o tienen errores' }, 409)

  return reply({
    schema: PERSONAL_TRANSFER_SCHEMA,
    scope: 'personal',
    draftId: draft.id,
    answers: personalAnswers(effectiveAnswers),
    // No incluir nombres, correos, claves, cookies ni identificadores extra
    // fuera de las propias respuestas de esta sección.
  })
}

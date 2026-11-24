import { NextResponse } from 'next/server'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const APPLICATION_ID = /^AA[A-Z0-9]{8}$/
const SCHEMA = 'vm-ds160-application-link-v1'

function reply(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

async function authorizedDraft(id: string, organizationId: string) {
  const db = createAdminClient()
  const { data, error } = await db.from('vm_trade_in_motion_drafts')
    .select('id,status,consent_at,answers')
    .eq('id', id).eq('organization_id', organizationId).maybeSingle()
  return { draft: data, error: Boolean(error) }
}

// GET solo permite leer identificadores del expediente seleccionado en Águila.
export async function GET(request: Request) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception')
    return reply({ error: 'Acceso restringido' }, 403)
  const id = new URL(request.url).searchParams.get('draft_id') || ''
  if (!UUID.test(id)) return reply({ error: 'Expediente inválido' }, 400)
  const { draft, error } = await authorizedDraft(id, context.organizationId)
  if (error) return reply({ error: 'No fue posible consultar el expediente' }, 503)
  if (!draft) return reply({ error: 'Expediente no localizado' }, 404)
  if (draft.status !== 'Enviado' || !draft.consent_at)
    return reply({ error: 'Primero se necesita un formulario recibido con consentimiento' }, 409)

  const db = createAdminClient()
  const { data: links, error: linkError } = await db.from('vm_ds160_application_links')
    .select('application_id,status,linked_at').eq('organization_id', context.organizationId)
    .eq('draft_id', id).order('linked_at', { ascending: false }).limit(10)
  if (linkError) return reply({ error: 'El registro de Application IDs no está disponible' }, 503)
  const { data: correction, error: correctionError } = await db.from('vm_ds160_corrections')
    .select('answers').eq('draft_id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (correctionError) return reply({ error: 'No fue posible revisar el nombre corregido' }, 503)
  const effective = correction?.answers ?? draft.answers
  const name = typeof effective?.full_name === 'string' ? effective.full_name.trim() : ''
  return reply({
    schema: SCHEMA, draftId: draft.id,
    applicantName: name.slice(0, 120) || 'Expediente sin nombre',
    latestApplicationId: links?.[0]?.application_id ?? null,
    applications: links ?? [],
  })
}

// POST se ejecuta dentro de la pestaña oficial del CRM; nunca desde CEAC.
export async function POST(request: Request) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception')
    return reply({ error: 'Acceso restringido' }, 403)
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return reply({ error: 'Origen de solicitud inválido' }, 403)
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json'))
    return reply({ error: 'Formato de solicitud inválido' }, 415)
  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return reply({ error: 'Solicitud inválida' }, 400) }
  const id = typeof body.draftId === 'string' ? body.draftId : ''
  const applicationId = typeof body.applicationId === 'string' ? body.applicationId.trim().toUpperCase() : ''
  if (body.schema !== SCHEMA || body.confirmed !== true || !UUID.test(id) || !APPLICATION_ID.test(applicationId))
    return reply({ error: 'Confirma un Application ID y expediente válidos' }, 400)

  const { draft, error } = await authorizedDraft(id, context.organizationId)
  if (error) return reply({ error: 'No fue posible validar el expediente' }, 503)
  if (!draft) return reply({ error: 'Expediente no localizado' }, 404)
  if (draft.status !== 'Enviado' || !draft.consent_at)
    return reply({ error: 'El formulario necesita haberse recibido con consentimiento' }, 409)

  const db = createAdminClient()
  const { data: existing, error: existingError } = await db.from('vm_ds160_application_links')
    .select('draft_id,organization_id').eq('application_id', applicationId).maybeSingle()
  if (existingError) return reply({ error: 'No se pudo verificar el identificador' }, 503)
  if (existing) {
    if (existing.draft_id !== id || existing.organization_id !== context.organizationId)
      return reply({ error: 'El Application ID ya está vinculado a otro expediente' }, 409)
    return reply({ schema: SCHEMA, saved: true, alreadyLinked: true, draftId: id, applicationId })
  }
  const { error: insertError } = await db.from('vm_ds160_application_links').insert({
    draft_id: id, organization_id: context.organizationId,
    application_id: applicationId, status: 'En elaboración', linked_by: context.userId,
  })
  if (insertError) {
    if (insertError.code === '23505') return reply({ error: 'El identificador ya fue registrado; actualiza la ficha' }, 409)
    return reply({ error: 'No se pudo vincular el Application ID en el CRM' }, 503)
  }
  return reply({ schema: SCHEMA, saved: true, alreadyLinked: false, draftId: id, applicationId }, 201)
}

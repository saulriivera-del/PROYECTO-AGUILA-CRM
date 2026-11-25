import { NextResponse } from 'next/server'
import { resolveFolioSession, sameOrigin } from '@/lib/trade-in-motion-folio'
import { cleanAnswers, cleanPeople, validateSubmission } from '@/lib/trade-in-motion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const respond = (data: object, status = 200) => NextResponse.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
})

export async function POST(request: Request) {
  if (!sameOrigin(request)) return respond({ error: 'Origen no autorizado.' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return respond({ error: 'Solicitud inválida.' }, 415)
  const candidate = await resolveFolioSession()
  if (!candidate) return respond({ error: 'Tu sesión terminó. Ingresa nuevamente con el folio y clave.' }, 401)
  let payload: { action?: unknown; answers?: unknown; people?: unknown; consent?: unknown }
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 131072) return respond({ error: 'Formulario demasiado grande.' }, 413)
    payload = JSON.parse(raw)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('Invalid')
  } catch { return respond({ error: 'No pudimos leer tus respuestas.' },400) }
  if (payload.action !== 'save' && payload.action !== 'submit') return respond({error:'Acción inválida.'},400)
  if (payload.consent !== true) return respond({error:'Acepta el aviso de privacidad antes de guardar.'},422)
  const answers = cleanAnswers(payload.answers)
  const people = cleanPeople(payload.people)
  if (answers.travel_with_someone !== 'Sí' || answers.travel_companions_group !== 'No') people.companions = []
  if (answers.family_us !== 'Sí') people.relatives = []
  if (payload.action === 'submit') {
    const missing = validateSubmission(answers,people)
    if (missing.length) return respond({ error:'Revisa las preguntas obligatorias.', fields:missing.slice(0,20) },422)
  }
  try {
    const { admin, access } = candidate
    const { data: previous, error: prevError } = await admin.from('vm_trade_in_motion_drafts')
      .select('id,status,consent_at').eq('access_id', access.id)
      .eq('organization_id',access.organization_id).maybeSingle()
    if (prevError) throw prevError
    if (previous?.status === 'Enviado') return respond({saved:true,submitted:true})
    const now = new Date().toISOString()
    const update = {
      answers,people,applicant_email: answers.email || '', updated_at:now,
      consent_at: previous?.consent_at || now,consent_version:'aviso-privacidad-2026-11',
      status: payload.action === 'submit' ? 'Enviado' : 'Borrador',
      submitted_at: payload.action === 'submit' ? now : null,
    }
    if (previous) {
      const { error } = await admin.from('vm_trade_in_motion_drafts').update(update)
        .eq('id',previous.id).eq('access_id',access.id).eq('status','Borrador')
      if (error) throw error
    } else {
      const { error } = await admin.from('vm_trade_in_motion_drafts').insert({
        ...update, organization_id:access.organization_id, company_id:access.company_id,
        access_id:access.id, auth_user_id:null,
      })
      if (error) throw error
    }
    // La captura por folio es interna: NO crea ni envía una solicitud DS-160 oficial.
    // Recepción verificará identidad y documentos antes de convertirla en trámite.
    return respond({ saved:true, submitted:payload.action === 'submit' })
  } catch {
    return respond({error:'No se confirmó el guardado. Conserva esta página y vuelve a intentar.'},503)
  }
}

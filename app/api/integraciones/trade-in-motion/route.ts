import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// API exclusivamente servidor-a-servidor. El formulario público NO envía datos aquí.
// El origen debe verificar el correo antes de firmar cada solicitud.
export const runtime = 'nodejs'

const MAX_BYTES = 131072
const SIGNATURE_WINDOW_MS = 5 * 60 * 1000

function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const secret = process.env.VM_TRADE_IN_MOTION_WEBHOOK_SECRET?.trim()
  if (!secret || secret.length < 32) {
    return reply({ error: 'Integración todavía no habilitada' }, 503)
  }

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return reply({ error: 'Formato inválido' }, 415)
  }

  const bodyLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(bodyLength) && bodyLength > MAX_BYTES) {
    return reply({ error: 'Solicitud demasiado extensa' }, 413)
  }

  let raw: string
  try {
    raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
      return reply({ error: 'Solicitud demasiado extensa' }, 413)
    }
  } catch {
    return reply({ error: 'No se pudo leer la solicitud' }, 400)
  }

  const timestamp = request.headers.get('x-vm-timestamp') ?? ''
  const signature = request.headers.get('x-vm-signature') ?? ''
  const sentAt = Number(timestamp)
  if (!/^\d{10}$/.test(timestamp) || !Number.isFinite(sentAt)
      || Math.abs(Date.now() - sentAt * 1000) > SIGNATURE_WINDOW_MS
      || !/^sha256=[a-f0-9]{64}$/.test(signature)) {
    return reply({ error: 'Firma inválida' }, 401)
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${raw}`)
    .digest('hex')
  const supplied = signature.slice(7)
  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'))) {
    return reply({ error: 'Firma inválida' }, 401)
  }

  let input: unknown
  try { input = JSON.parse(raw) } catch { return reply({ error: 'JSON inválido' }, 400) }
  if (!input || Array.isArray(input) || typeof input !== 'object') {
    return reply({ error: 'Datos inválidos' }, 400)
  }

  const payload = input as Record<string, unknown>
  const submissionId = String(payload.submissionId ?? '')
  const verifiedEmail = String(payload.verifiedEmail ?? '').trim().toLowerCase()
  const verifiedAt = String(payload.verifiedAt ?? '')
  const answers = payload.answers
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)
      || !verifiedEmail.includes('@')
      || !verifiedAt || Number.isNaN(Date.parse(verifiedAt))
      || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return reply({ error: 'Datos de envío incompletos' }, 422)
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('create_vm_trade_in_motion_case', {
      p_submission_id: submissionId,
      p_answers: answers,
      p_verified_email: verifiedEmail,
      p_verified_at: verifiedAt,
    })
    if (error) {
      // No exponer errores internos ni datos personales al remitente.
      console.error('Trade in Motion: error en recepción', error.code)
      return reply({ error: 'No fue posible registrar el expediente' }, 422)
    }
    return reply({ ok: true, ...(data as Record<string, unknown>) }, 200)
  } catch {
    return reply({ error: 'Servicio no disponible' }, 503)
  }
}
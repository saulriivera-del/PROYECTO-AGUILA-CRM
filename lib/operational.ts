export type OperationalState =
  | 'Atender hoy' | 'Esperando al cliente' | 'Esperando cita'
  | 'Esperando pago' | 'Seguimiento pendiente' | 'Sin movimiento' | 'En orden'

const FINAL_WORDS = ['concluido', 'cancelado', 'aprobada', 'aprobado', 'rechazada', 'rechazado']
const DAY = 86400000

function normalized(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function firstRelation(value: any) { return Array.isArray(value) ? value[0] : value }

export function inactivityAlert(process: any, now = new Date()) {
  const status = normalized(process.status)
  const stage = normalized(process.current_stage)
  const service = normalized(process.service_name)
  if (FINAL_WORDS.some((word) => status.includes(word) || stage.includes(word))) return null

  const cas = process.cas_appointment_at ? new Date(process.cas_appointment_at) : null
  const consulate = process.consulate_appointment_at ? new Date(process.consulate_appointment_at) : null
  const government = process.government_appointment_at ? new Date(process.government_appointment_at) : null

  // Mientras exista una cita futura, la siguiente acción es esperar.
  const futureAppointments = [cas, consulate, government].filter((date): date is Date => Boolean(date && date > now))
  if (futureAppointments.length) return null
  if (stage.includes('espera de cita') || normalized(process.operational_status).includes('esperando cita')) return null

  let base = new Date(process.last_movement_at || process.created_at || now)
  let reason = 'sin movimiento interno'

  // CAS nunca activa esta alerta. Renovaciones y Visa H conservan sus automatizaciones propias.
  if (cas && cas <= now && !consulate && !service.includes('pasaporte')) return null

  // Después de Consulado sí se supervisa.
  if (consulate && consulate <= now) {
    if (consulate > base) base = consulate
    reason = 'después de la cita consular'
  }

  // Pasaporte: después de Relaciones Exteriores sí se supervisa.
  if (service.includes('pasaporte') && government && government <= now) {
    if (government > base) base = government
    reason = 'después de la cita en Relaciones Exteriores'
  }

  const days = Math.max(0, Math.floor((now.getTime() - base.getTime()) / DAY))
  if (days < 3) return null
  const level = days >= 10 ? 'Crítico' : days >= 5 ? 'Atención' : 'Advertencia'
  return { days, level, reason }
}

export function processOperationalState(process: any, now = new Date()): OperationalState {
  const explicit = String(process.operational_status || '').trim()
  if (explicit && explicit !== 'Automático') return explicit as OperationalState
  const priorityAt = process.priority_attention_at ? new Date(process.priority_attention_at) : null
  if (priorityAt && priorityAt.getTime() <= now.getTime() + DAY) return 'Atender hoy'
  const charge = firstRelation(process.process_charges)
  const commitment = charge?.payment_commitment_date
  const agreed = Number(charge?.agreed_amount ?? 0)
  const paid = Number(process.paid_amount ?? 0)
  if (commitment && new Date(`${commitment}T23:59:59`).getTime() < now.getTime() && paid < agreed) return 'Esperando pago'
  const stage = normalized(process.current_stage)
  if (stage.includes('espera de cita') || stage.includes('adelanto')) return 'Esperando cita'
  if (stage.includes('seguimiento') || stage.includes('verificar')) return 'Seguimiento pendiente'
  if (inactivityAlert(process, now)) return 'Sin movimiento'
  return 'En orden'
}

export function inactivityLevel(process: any, now = new Date()) {
  return inactivityAlert(process, now) ?? { days: 0, level: 'Reciente' as const, reason: '' }
}

export function agendaCategory(event: any) {
  const type = normalized(event.event_type); const title = normalized(event.title)
  if (type.includes('cita') || title.includes('cita')) return 'CITA'
  if (type.includes('pago') || title.includes('pago') || title.includes('cobranza')) return 'COBRANZA'
  if (type.includes('seguimiento') || title.includes('verificar') || title.includes('seguimiento')) return 'SEGUIMIENTO'
  return 'TAREA'
}

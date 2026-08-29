import {
  addDaysKey,
  daysBetweenKeys,
  hermosilloDateKey,
  hermosilloTodayKey,
} from '@/lib/hermosillo'

export type OperationalState =
  | 'Atender hoy' | 'Esperando al cliente' | 'Esperando cita'
  | 'Esperando pago' | 'Seguimiento pendiente' | 'Sin movimiento' | 'En orden'

const FINAL_WORDS = ['concluido', 'cancelado', 'aprobada', 'aprobado', 'rechazada', 'rechazado']

function normalized(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function firstRelation(value: any) { return Array.isArray(value) ? value[0] : value }

export function isFinalProcess(process: any) {
  const status = normalized(process.status)
  const stage = normalized(process.current_stage)
  return FINAL_WORDS.some((word) => status.includes(word) || stage.includes(word))
}


export function nextFutureAppointmentKey(process: any, now = new Date()) {
  const todayKey = hermosilloDateKey(now)
  const keys = [
    process.cas_appointment_at,
    process.consulate_appointment_at,
    process.government_appointment_at,
  ]
    .filter(Boolean)
    .map((value) => hermosilloDateKey(value))
    .filter((key) => key >= todayKey)
    .sort()
  return keys[0] ?? null
}

/**
 * Regla de visibilidad del Control rápido / Bandeja operativa:
 * - nunca mostrar trámites finalizados;
 * - si existe una cita futura, mostrar el trámite sólo cuando la cita
 *   esté dentro de los próximos 7 días naturales (incluyendo hoy);
 * - los trámites activos sin cita futura siguen visibles para permitir
 *   supervisión por estado e inactividad.
 */
export function shouldShowProcessInOperationalBoard(process: any, now = new Date()) {
  if (isFinalProcess(process)) return false
  const todayKey = hermosilloDateKey(now)
  const nextAppointmentKey = nextFutureAppointmentKey(process, now)
  if (!nextAppointmentKey) return true
  return nextAppointmentKey <= addDaysKey(todayKey, 7)
}

export function inactivityAlert(process: any, now = new Date()) {
  if (isFinalProcess(process)) return null

  const todayKey = hermosilloDateKey(now)
  const service = normalized(process.service_name)
  const stage = normalized(process.current_stage)
  const operationalStatus = normalized(process.operational_status)

  const casKey = process.cas_appointment_at ? hermosilloDateKey(process.cas_appointment_at) : null
  const consulateKey = process.consulate_appointment_at ? hermosilloDateKey(process.consulate_appointment_at) : null
  const governmentKey = process.government_appointment_at ? hermosilloDateKey(process.government_appointment_at) : null

  // Si existe una cita futura, el expediente está correctamente esperando esa fecha.
  if ([casKey, consulateKey, governmentKey].some((key) => key && key > todayKey)) return null
  if (stage.includes('espera de cita') || operationalStatus.includes('esperando cita')) return null

  let baseKey = hermosilloDateKey(process.last_movement_at || process.created_at || now)
  let reason = 'sin movimiento interno'

  // Una cita CAS por sí sola NO activa alerta posterior. Renovaciones y Visa H
  // mantienen sus automatizaciones específicas de 20/40 y 2/10 días.
  if (casKey && casKey <= todayKey && !consulateKey && !service.includes('pasaporte')) return null

  // Después de una cita consular sí debe supervisarse el expediente.
  if (consulateKey && consulateKey <= todayKey && consulateKey > baseKey) {
    baseKey = consulateKey
    reason = 'después de la cita consular'
  }

  // Pasaporte: Relaciones Exteriores sí puede activar supervisión posterior.
  if (service.includes('pasaporte') && governmentKey && governmentKey <= todayKey && governmentKey > baseKey) {
    baseKey = governmentKey
    reason = 'después de la cita en Relaciones Exteriores'
  }

  const days = daysBetweenKeys(baseKey, todayKey)
  if (days < 4) return null
  const level = days >= 10 ? 'Crítico' : days >= 7 ? 'Atención' : 'Advertencia'
  return { days, level, reason }
}

export function processOperationalState(process: any, now = new Date()): OperationalState {
  const explicit = String(process.operational_status || '').trim()
  if (explicit && explicit !== 'Automático') return explicit as OperationalState

  const todayKey = hermosilloDateKey(now)
  const priorityKey = process.priority_attention_at ? hermosilloDateKey(process.priority_attention_at) : null
  if (priorityKey && priorityKey <= todayKey) return 'Atender hoy'

  const charge = firstRelation(process.process_charges)
  const commitment = charge?.payment_commitment_date
  const agreed = Number(charge?.agreed_amount ?? 0)
  const paid = Number(process.paid_amount ?? 0)
  if (commitment && commitment < todayKey && paid < agreed) return 'Esperando pago'

  const stage = normalized(process.current_stage)
  if (stage.includes('espera de cita')) return 'Esperando cita'
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

export function todayKey() {
  return hermosilloTodayKey()
}

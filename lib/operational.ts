import {
  daysBetweenKeys,
  hermosilloDateKey,
  hermosilloTodayKey,
} from '@/lib/hermosillo'

export type OperationalState =
  | 'Atender hoy' | 'Esperando al cliente' | 'Esperando cita'
  | 'Esperando pago' | 'Seguimiento pendiente' | 'Sin movimiento' | 'En orden'

const FINAL_STATUSES = ['concluido', 'cancelado', 'rechazada', 'rechazado']

function normalized(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function firstRelation(value: any) { return Array.isArray(value) ? value[0] : value }

export function isFinalProcess(process: any) {
  const status = normalized(process.status)
  const stage = normalized(process.current_stage)
  if (FINAL_STATUSES.includes(status)) return true
  // "Aprobada o rechazada" is a pending step, not a result.
  // Legacy approved records with a recorded closure remain closed unless
  // explicitly awaiting delivery.
  return ['aprobada', 'aprobado'].includes(status) && Boolean(process.closed_at)
    && !/pendiente de recoleccion|pendiente recoger|esperar entrega|pendiente de entrega/.test(stage)
}

export function isAwaitingVisaPickup(process: any) {
  if (isFinalProcess(process)) return false
  const status = normalized(process.status)
  const result = normalized(process.result_status)
  return ['aprobada', 'aprobado'].includes(status) || ['aprobada', 'aprobado'].includes(result)
}

export function isPendingAgendaEvent(event: any) {
  if (event.status && event.status !== 'Pendiente') return false
  const process = firstRelation(event.processes)
  if (!process || !isFinalProcess(process)) return true
  const key = String(event.automation_key || '').split(':').pop()
  // Preserve commercial, collection/payment and independent manual followups.
  return !['consulate-status', 'consulate-reminder', 'cas-reminder', 'interview-preparation',
    'renewal-status-20', 'renewal-visa-arrival-20', 'visa-pickup-pending', 'h-status-2',
    'h-status-10', 'passport-reminder', 'eta-followup', 'assigned-priority'].includes(key || '')
}

export function inactivityAlert(process: any, now = new Date()) {
  if (isFinalProcess(process) || isAwaitingVisaPickup(process)) return null

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
  if (isFinalProcess(process)) return 'En orden'
  if (isAwaitingVisaPickup(process)) return 'Seguimiento pendiente'
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

import {
  daysBetweenKeys,
  hermosilloDateKey,
  hermosilloTodayKey,
} from '@/lib/hermosillo'

export type OperationalState =
  | 'Atender hoy' | 'Esperando al cliente' | 'Esperando cita'
  | 'Esperando pago' | 'Seguimiento pendiente' | 'Sin movimiento' | 'En orden'

import { isFinalProcess, isAwaitingVisaPickup } from '@/lib/process-lifecycle'
export { isFinalProcess, isAwaitingVisaPickup, isPendingAgendaEvent } from '@/lib/process-lifecycle'
import { isPendingAgendaEvent } from '@/lib/process-lifecycle'
import { hasFutureAppointment, isLegacyRenewalFollowup, isObsoleteReminder, legacyPriorityDue, needsSyntheticTask } from '@/lib/daily-work-rules'

function normalized(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
function firstRelation(value: any) { return Array.isArray(value) ? value[0] : value }

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

const day = (value: any) => value ? hermosilloDateKey(value) : null
export function agendaProcess(event: any) { return firstRelation(event.processes) }
export function agendaProcessId(event: any) { return event.process_id || agendaProcess(event)?.id || null }
export function isActionableAgendaEvent(event: any, now = new Date()) {
  if (!isPendingAgendaEvent(event)) return false
  const process = agendaProcess(event)
  if (!process) return true
  return !isObsoleteReminder(String(event.automation_key || '').split(':').pop() || '', hermosilloDateKey(now), day(process.cas_appointment_at), day(process.consulate_appointment_at), day(process.government_appointment_at))
}

export function processOperationalState(process: any, now = new Date()): OperationalState {
  if (isFinalProcess(process)) return 'En orden'
  if (isAwaitingVisaPickup(process) || isLegacyRenewalFollowup(process.service_name, process.current_stage)) return 'Seguimiento pendiente'
  const explicit = String(process.operational_status || '').trim()
  const todayKey = hermosilloDateKey(now)
  const stage = normalized(process.current_stage)
  if (explicit === 'Atender hoy') return 'Atender hoy'
  if (stage.includes('esperando reflejo de pago')) return 'Esperando pago'
  if (explicit && explicit !== 'Automático' && explicit !== 'En orden') return explicit as OperationalState
  const charge = firstRelation(process.process_charges)
  const commitment = charge?.payment_commitment_date
  const agreed = Number(charge?.agreed_amount ?? 0)
  const paid = Number(process.paid_amount ?? 0)
  if (commitment && commitment < todayKey && paid < agreed) return 'Esperando pago'

  if (hasFutureAppointment([day(process.cas_appointment_at), day(process.consulate_appointment_at), day(process.government_appointment_at)], todayKey) || stage.includes('espera de cita') || stage.includes('esperando cita')) return 'Esperando cita'
  if (legacyPriorityDue(day(process.priority_attention_at), day(process.last_movement_at), todayKey, false)) return 'Atender hoy'
  if (stage.includes('pago')) return 'Esperando pago'
  if (stage.includes('seguimiento') || stage.includes('verificar')) return 'Seguimiento pendiente'
  if (explicit === 'En orden') return 'En orden'
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

export function buildOperationalWork(processes: any[], events: any[], now = new Date(), userId = '') {
  const today = hermosilloDateKey(now)
  const queue = events.filter(e => isActionableAgendaEvent(e, now) && day(e.starts_at)! <= today).sort((a,b) => {
    const ap = a.assigned_to === userId ? 0 : 1, bp = b.assigned_to === userId ? 0 : 1
    const au = a.priority === 'Urgente' || a.event_type === 'Tarea prioritaria' ? 0 : 1
    const bu = b.priority === 'Urgente' || b.event_type === 'Tarea prioritaria' ? 0 : 1
    return ap-bp || au-bu || new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()
  })
  const dueIds = new Set(queue.map(agendaProcessId).filter(Boolean))
  const states = processes.filter(p => !isFinalProcess(p)).map(process => {
    const state = processOperationalState(process, now)
    const inactive = inactivityLevel(process, now)
    return { process, state, inactive }
  })
  const workItems: any[] = queue.map(event => ({ kind:'agenda', id:'agenda:'+event.id, rank:String(event.automation_key || '').endsWith(':consulate-status') ? 0 : 3, event }))
  for (const item of states) {
    const {process,state,inactive} = item
    const reflection = normalized(process.current_stage).includes('esperando reflejo de pago')
    if (!needsSyntheticTask(dueIds.has(process.id), state, reflection)) continue
    const kind = reflection ? 'payment-reflection' : state === 'Sin movimiento' ? 'stalled' : 'priority'
    workItems.push({ ...item, kind, id:kind+':'+process.id, rank:reflection ? -1 : kind === 'priority' ? 1 : inactive.days >= 7 ? 1 : 2 })
  }
  workItems.sort((a,b) => a.rank-b.rank)
  const actionableProcessIds = new Set(workItems.map(item => item.kind === 'agenda' ? agendaProcessId(item.event) : item.process.id).filter(Boolean))
  return {queue, states, workItems, actionableProcessIds}
}

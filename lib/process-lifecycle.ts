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


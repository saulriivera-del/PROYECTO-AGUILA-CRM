export type OperationalState =
  | 'Atender hoy'
  | 'Esperando al cliente'
  | 'Esperando cita'
  | 'Esperando pago'
  | 'Seguimiento pendiente'
  | 'Sin movimiento'
  | 'En orden'

export function processOperationalState(process: any, now = new Date()): OperationalState {
  const explicit = String(process.operational_status || '').trim()
  if (explicit && explicit !== 'Automático') return explicit as OperationalState

  const priorityAt = process.priority_attention_at
    ? new Date(process.priority_attention_at)
    : null
  if (priorityAt && priorityAt.getTime() <= now.getTime() + 24 * 60 * 60 * 1000) {
    return 'Atender hoy'
  }

  const commitment = process.process_charges?.[0]?.payment_commitment_date
    ?? process.process_charges?.payment_commitment_date
  const agreed = Number(process.process_charges?.[0]?.agreed_amount
    ?? process.process_charges?.agreed_amount ?? 0)
  const paid = Number(process.paid_amount ?? 0)
  if (commitment && new Date(`${commitment}T23:59:59`).getTime() < now.getTime() && paid < agreed) {
    return 'Esperando pago'
  }

  const stage = String(process.current_stage || '').toLowerCase()
  if (stage.includes('espera de cita') || stage.includes('adelanto')) return 'Esperando cita'
  if (stage.includes('seguimiento') || stage.includes('verificar')) return 'Seguimiento pendiente'

  const movement = new Date(process.last_movement_at || process.created_at || now)
  const inactiveDays = Math.floor((now.getTime() - movement.getTime()) / 86400000)
  if (inactiveDays >= 5) return 'Sin movimiento'

  return 'En orden'
}

export function inactivityLevel(process: any, now = new Date()) {
  const movement = new Date(process.last_movement_at || process.created_at || now)
  const days = Math.max(0, Math.floor((now.getTime() - movement.getTime()) / 86400000))
  if (days >= 10) return { days, level: 'Crítico' as const }
  if (days >= 5) return { days, level: 'Atención' as const }
  if (days >= 3) return { days, level: 'Advertencia' as const }
  return { days, level: 'Reciente' as const }
}

export function agendaCategory(event: any) {
  const type = String(event.event_type || '').toLowerCase()
  const title = String(event.title || '').toLowerCase()
  if (type.includes('cita') || title.includes('cita')) return 'CITA'
  if (type.includes('pago') || title.includes('pago') || title.includes('cobranza')) return 'COBRANZA'
  if (type.includes('seguimiento') || title.includes('verificar') || title.includes('seguimiento')) return 'SEGUIMIENTO'
  return 'TAREA'
}

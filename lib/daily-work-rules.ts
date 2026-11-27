// Pure rules shared by the CRM daily queue and process classification.
export function normalizeOperational(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}
export function hasFutureAppointment(keys: (string | null)[], today: string) {
  return keys.some(k => Boolean(k && k >= today))
}
export function isLegacyRenewalFollowup(service: unknown, stage: unknown) {
  return normalizeOperational(service).includes('renovacion') && ['tramite concluido','concluido'].includes(normalizeOperational(stage))
}
export function isObsoleteReminder(key: string, today: string, cas: string | null, consulate: string | null, government: string | null) {
  const date = key === 'cas-reminder' ? cas : ['consulate-reminder','interview-preparation'].includes(key) ? consulate : key === 'passport-reminder' ? (government || cas) : null
  return Boolean(date && date < today)
}
export function legacyPriorityDue(priority: string | null, movement: string | null, today: string, waiting: boolean) {
  return Boolean(!waiting && priority && priority <= today && (!movement || movement <= priority))
}
export function needsSyntheticTask(hasDueEvent: boolean, state: string, paymentReflection: boolean) {
  return paymentReflection || (!hasDueEvent && (state === 'Atender hoy' || state === 'Sin movimiento'))
}

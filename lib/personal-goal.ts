import { bonusForRevenue } from '@/lib/insights'
import { addDaysKey, daysBetweenKeys, hermosilloDateTime, hermosilloTodayKey, startOfWeekKey } from '@/lib/hermosillo'

type SupabaseClient = any

export type PersonalGoalData = {
  hasRule: boolean
  ruleName: string
  threshold: number
  baseBonus: number
  stepAmount: number
  stepBonus: number
  collected: number
  bonus: number
  progress: number
  remaining: number
  nextTarget: number | null
  nextBonus: number | null
  daysRemaining: number
  paymentCount: number
  ticketAverage: number
  clientsThisWeek: number
  processesThisWeek: number
  message: string
}

export async function getPersonalGoalData(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<PersonalGoalData> {
  const now = new Date()
  const todayKey = hermosilloTodayKey()
  const weekStartKey = startOfWeekKey(todayKey)
  const weekEndKey = addDaysKey(weekStartKey, 7)
  const weekStart = hermosilloDateTime(weekStartKey, 0)
  const weekEnd = hermosilloDateTime(weekEndKey, 0)

  const [ruleResult, paymentsResult, clientsResult, processesResult] = await Promise.all([
    supabase
      .from('bonus_rules')
      .select('id, name, threshold_amount, base_bonus, step_amount, step_bonus')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('payments')
      .select('id, amount, process_id, payment_date')
      .eq('organization_id', organizationId)
      .gte('payment_date', weekStart.toISOString())
      .lt('payment_date', weekEnd.toISOString()),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('assigned_to', userId)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString()),
    supabase
      .from('processes')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('assigned_to', userId)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString()),
  ])

  const rule = ruleResult.data
  const payments = paymentsResult.data ?? []
  const collected = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0)
  const uniqueProcesses = new Set(payments.map((payment: any) => payment.process_id).filter(Boolean)).size
  const ticketAverage = uniqueProcesses ? collected / uniqueProcesses : 0

  if (!rule) {
    return {
      hasRule: false,
      ruleName: '',
      threshold: 0,
      baseBonus: 0,
      stepAmount: 0,
      stepBonus: 0,
      collected,
      bonus: 0,
      progress: 0,
      remaining: 0,
      nextTarget: null,
      nextBonus: null,
      daysRemaining: Math.max(0, 6 - daysBetweenKeys(weekStartKey, todayKey)),
      paymentCount: payments.length,
      ticketAverage,
      clientsThisWeek: clientsResult.count ?? 0,
      processesThisWeek: processesResult.count ?? 0,
      message: 'Tu administrador todavía no ha configurado una meta semanal.',
    }
  }

  const threshold = Number(rule.threshold_amount ?? 0)
  const baseBonus = Number(rule.base_bonus ?? 0)
  const stepAmount = Number(rule.step_amount ?? 0)
  const stepBonus = Number(rule.step_bonus ?? 0)
  const bonus = bonusForRevenue(collected, threshold, baseBonus, stepAmount, stepBonus)
  const progress = threshold > 0 ? Math.round((collected / threshold) * 100) : 100
  const remaining = Math.max(0, threshold - collected)

  let nextTarget: number | null = threshold
  let nextBonus: number | null = baseBonus
  if (collected >= threshold) {
    if (stepAmount > 0) {
      const completedSteps = Math.floor((collected - threshold) / stepAmount)
      nextTarget = threshold + (completedSteps + 1) * stepAmount
      nextBonus = baseBonus + (completedSteps + 1) * stepBonus
    } else {
      nextTarget = null
      nextBonus = null
    }
  }

  let message = `Te faltan $${remaining.toLocaleString('es-MX')} para activar tu bono.`
  if (progress >= 100) message = stepAmount > 0
    ? `¡Meta alcanzada! Cada $${stepAmount.toLocaleString('es-MX')} adicionales aumentan tu bono en $${stepBonus.toLocaleString('es-MX')}.`
    : '¡Meta alcanzada! Excelente trabajo esta semana.'
  else if (progress >= 90) message = 'Estás muy cerca. Un último impulso puede activar tu bono.'
  else if (progress >= 70) message = 'Excelente ritmo. Ya recorriste la mayor parte del camino.'
  else if (progress >= 30) message = 'Vas avanzando. Da seguimiento a los saldos pendientes para acercarte a la meta.'
  else message = 'La semana está comenzando. Cada cobro del equipo suma al avance de Visa Master.'

  return {
    hasRule: true,
    ruleName: rule.name ?? 'Meta semanal',
    threshold,
    baseBonus,
    stepAmount,
    stepBonus,
    collected,
    bonus,
    progress,
    remaining,
    nextTarget,
    nextBonus,
    daysRemaining: Math.max(0, 6 - daysBetweenKeys(weekStartKey, todayKey)),
    paymentCount: payments.length,
    ticketAverage,
    clientsThisWeek: clientsResult.count ?? 0,
    processesThisWeek: processesResult.count ?? 0,
    message,
  }
}

type SupabaseClient = any

export function startOfWeek(date = new Date()) {
  const result = new Date(date)
  const day = result.getDay()
  const distance = day === 0 ? 6 : day - 1
  result.setDate(result.getDate() - distance)
  result.setHours(0, 0, 0, 0)
  return result
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1)
}

export function bonusForRevenue(revenue: number, threshold: number, base: number, stepAmount: number, stepBonus: number) {
  if (revenue < threshold) return 0
  const extra = Math.max(0, revenue - threshold)
  const steps = stepAmount > 0 ? Math.floor(extra / stepAmount) : 0
  return base + steps * stepBonus
}

export async function getInsightsData(supabase: SupabaseClient, organizationId: string) {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)
  const yearStart = startOfYear(now)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

  const [paymentsResult, prospectsResult, clientsResult, processesResult, goalsResult, rulesResult, profilesResult] = await Promise.all([
    supabase.from('payments').select('id, amount, payment_date, process_id, recorded_by, processes(service_name)').eq('organization_id', organizationId).gte('payment_date', yearStart.toISOString()).order('payment_date'),
    supabase.from('prospects').select('id, status, created_at').eq('organization_id', organizationId).gte('created_at', previousMonthStart.toISOString()),
    supabase.from('clients').select('id, created_at').eq('organization_id', organizationId).gte('created_at', previousMonthStart.toISOString()),
    supabase.from('processes').select('id, status, service_name, created_at, assigned_to, operational_status, last_movement_at').eq('organization_id', organizationId),
    supabase.from('insight_goals').select('*').eq('organization_id', organizationId).eq('is_active', true).order('created_at'),
    supabase.from('bonus_rules').select('*, profiles(full_name)').eq('organization_id', organizationId).eq('is_active', true).order('created_at'),
    supabase.from('profiles').select('id, full_name, role').eq('organization_id', organizationId).eq('is_active', true).order('full_name'),
  ])

  const payments = paymentsResult.data ?? []
  const amountBetween = (from: Date, to?: Date) => payments
    .filter((payment: any) => {
      const date = new Date(payment.payment_date)
      return date >= from && (!to || date < to)
    })
    .reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0)

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1)
  const weekRevenue = amountBetween(weekStart)
  const monthRevenue = amountBetween(monthStart)
  const yearRevenue = amountBetween(yearStart)
  const todayRevenue = amountBetween(todayStart, tomorrow)
  const previousMonthRevenue = amountBetween(previousMonthStart, previousMonthEnd)

  const processes = processesResult.data ?? []
  const activeProcesses = processes.filter((p: any) => !['Concluido', 'Cancelado'].includes(p.status)).length
  const finishedProcesses = processes.filter((p: any) => p.status === 'Concluido').length
  const stalledProcesses = processes.filter((p: any) => {
    if (['Concluido', 'Cancelado'].includes(p.status)) return false
    const last = new Date(p.last_movement_at ?? p.created_at)
    return now.getTime() - last.getTime() >= 5 * 86400000
  }).length

  const prospects = prospectsResult.data ?? []
  const clients = clientsResult.data ?? []
  const monthProspects = prospects.filter((p: any) => new Date(p.created_at) >= monthStart).length
  const monthClients = clients.filter((c: any) => new Date(c.created_at) >= monthStart).length
  const conversion = monthProspects ? Math.round((monthClients / monthProspects) * 100) : 0

  const byService = new Map<string, number>()
  for (const payment of payments.filter((p: any) => new Date(p.payment_date) >= monthStart)) {
    const relation = Array.isArray(payment.processes) ? payment.processes[0] : payment.processes
    const service = relation?.service_name ?? 'Sin servicio'
    byService.set(service, (byService.get(service) ?? 0) + Number(payment.amount ?? 0))
  }

  return {
    errors: [paymentsResult.error, prospectsResult.error, clientsResult.error, processesResult.error, goalsResult.error, rulesResult.error, profilesResult.error].filter(Boolean).map((e: any) => e.message),
    payments,
    goals: goalsResult.data ?? [],
    bonusRules: rulesResult.data ?? [],
    profiles: profilesResult.data ?? [],
    todayRevenue,
    weekRevenue,
    monthRevenue,
    previousMonthRevenue,
    yearRevenue,
    activeProcesses,
    finishedProcesses,
    stalledProcesses,
    monthProspects,
    monthClients,
    conversion,
    ticketAverage: monthClients ? monthRevenue / monthClients : 0,
    serviceRevenue: [...byService.entries()].sort((a, b) => b[1] - a[1]),
    weekStart,
  }
}

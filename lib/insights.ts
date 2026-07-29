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

function inRange(value: string, from: Date, to?: Date) {
  const date = new Date(value)
  return date >= from && (!to || date < to)
}

function processRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

export async function getInsightsData(supabase: SupabaseClient, organizationId: string) {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1)
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)
  const yearStart = startOfYear(now)
  const previousWeekStart = new Date(weekStart); previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

  const [paymentsResult, prospectsResult, clientsResult, processesResult, goalsResult, rulesResult, historyResult, profilesResult] = await Promise.all([
    supabase.from('payments').select('id, amount, payment_date, payment_method, reference, notes, process_id, recorded_by, processes(id, service_name, client_id, clients(full_name))').eq('organization_id', organizationId).gte('payment_date', previousMonthStart.toISOString()).order('payment_date'),
    supabase.from('prospects').select('id, status, created_at, assigned_to').eq('organization_id', organizationId).gte('created_at', previousMonthStart.toISOString()),
    supabase.from('clients').select('id, created_at, assigned_to').eq('organization_id', organizationId).gte('created_at', previousMonthStart.toISOString()),
    supabase.from('processes').select('id, status, service_name, created_at, assigned_to, operational_status, last_movement_at').eq('organization_id', organizationId),
    supabase.from('insight_goals').select('*, assigned_profile:profiles!insight_goals_assigned_to_fkey(full_name)').eq('organization_id', organizationId).eq('is_active', true).order('created_at'),
    supabase.from('bonus_rules').select('*, user_profile:profiles!bonus_rules_user_id_fkey(full_name)').eq('organization_id', organizationId).eq('is_active', true).order('created_at'),
    supabase.from('bonus_history').select('*, user_profile:profiles!bonus_history_user_id_fkey(full_name), rule:bonus_rules!bonus_history_bonus_rule_id_fkey(name)').eq('organization_id', organizationId).order('period_start', { ascending: false }).limit(52),
    supabase.from('profiles').select('id, full_name, role').eq('organization_id', organizationId).eq('is_active', true).order('full_name'),
  ])

  const payments = paymentsResult.data ?? []
  const amountBetween = (from: Date, to?: Date) => payments
    .filter((payment: any) => inRange(payment.payment_date, from, to))
    .reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0)

  const todayRevenue = amountBetween(todayStart, tomorrow)
  const weekRevenue = amountBetween(weekStart)
  const previousWeekRevenue = amountBetween(previousWeekStart, weekStart)
  const monthRevenue = amountBetween(monthStart)
  const previousMonthRevenue = amountBetween(previousMonthStart, previousMonthEnd)
  const yearRevenue = amountBetween(yearStart)

  const processes = processesResult.data ?? []
  const activeProcesses = processes.filter((p: any) => !['Concluido', 'Cancelado'].includes(p.status)).length
  const finishedProcesses = processes.filter((p: any) => p.status === 'Concluido').length
  const monthFinishedProcesses = processes.filter((p: any) => p.status === 'Concluido' && new Date(p.last_movement_at ?? p.created_at) >= monthStart).length
  const weekFinishedProcesses = processes.filter((p: any) => p.status === 'Concluido' && new Date(p.last_movement_at ?? p.created_at) >= weekStart).length
  const stalledProcesses = processes.filter((p: any) => {
    if (['Concluido', 'Cancelado'].includes(p.status)) return false
    const last = new Date(p.last_movement_at ?? p.created_at)
    return now.getTime() - last.getTime() >= 5 * 86400000
  }).length

  const prospects = prospectsResult.data ?? []
  const clients = clientsResult.data ?? []
  const monthProspects = prospects.filter((p: any) => new Date(p.created_at) >= monthStart).length
  const weekProspects = prospects.filter((p: any) => new Date(p.created_at) >= weekStart).length
  const previousWeekProspects = prospects.filter((p: any) => inRange(p.created_at, previousWeekStart, weekStart)).length
  const monthClients = clients.filter((c: any) => new Date(c.created_at) >= monthStart).length
  const weekClients = clients.filter((c: any) => new Date(c.created_at) >= weekStart).length
  const previousWeekClients = clients.filter((c: any) => inRange(c.created_at, previousWeekStart, weekStart)).length
  const conversion = monthProspects ? Math.round((monthClients / monthProspects) * 100) : 0
  const weekConversion = weekProspects ? Math.round((weekClients / weekProspects) * 100) : 0

  const byService = new Map<string, number>()
  const byMethod = new Map<string, number>()
  for (const payment of payments.filter((p: any) => new Date(p.payment_date) >= monthStart)) {
    const relation = processRelation(payment.processes)
    const service = relation?.service_name ?? 'Sin servicio'
    const method = payment.payment_method || 'Sin método'
    byService.set(service, (byService.get(service) ?? 0) + Number(payment.amount ?? 0))
    byMethod.set(method, (byMethod.get(method) ?? 0) + Number(payment.amount ?? 0))
  }

  const dailyRevenue = Array.from({length: 14}, (_, index) => {
    const day = new Date(todayStart)
    day.setDate(day.getDate() - (13 - index))
    const next = new Date(day); next.setDate(next.getDate() + 1)
    return {date: day, amount: amountBetween(day, next)}
  })
  const maxDailyRevenue = Math.max(1, ...dailyRevenue.map((item) => item.amount))

  const paymentCountMonth = payments.filter((p: any) => new Date(p.payment_date) >= monthStart).length
  const averagePayment = paymentCountMonth ? monthRevenue / paymentCountMonth : 0
  const bestService = [...byService.entries()].sort((a, b) => b[1] - a[1])[0] ?? null
  const bestDay = [...dailyRevenue].sort((a, b) => b.amount - a.amount)[0] ?? null

  return {
    errors: [paymentsResult.error, prospectsResult.error, clientsResult.error, processesResult.error, goalsResult.error, rulesResult.error, historyResult.error, profilesResult.error].filter(Boolean).map((e: any) => e.message),
    payments,
    goals: goalsResult.data ?? [],
    bonusRules: rulesResult.data ?? [],
    bonusHistory: historyResult.data ?? [],
    profiles: profilesResult.data ?? [],
    todayRevenue,
    weekRevenue,
    previousWeekRevenue,
    monthRevenue,
    previousMonthRevenue,
    yearRevenue,
    activeProcesses,
    finishedProcesses,
    monthFinishedProcesses,
    weekFinishedProcesses,
    stalledProcesses,
    monthProspects,
    weekProspects,
    previousWeekProspects,
    monthClients,
    weekClients,
    previousWeekClients,
    conversion,
    weekConversion,
    ticketAverage: monthClients ? monthRevenue / monthClients : 0,
    averagePayment,
    paymentCountMonth,
    serviceRevenue: [...byService.entries()].sort((a, b) => b[1] - a[1]),
    paymentMethods: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
    dailyRevenue,
    maxDailyRevenue,
    bestService,
    bestDay,
    weekStart,
  }
}

export function goalCurrentValue(goal: any, data: any) {
  const period = String(goal.period || 'Mensual')
  const metric = String(goal.metric || '')
  const weekly = period === 'Semanal'
  if (metric === 'Ingresos') return weekly ? data.weekRevenue : period === 'Anual' ? data.yearRevenue : data.monthRevenue
  if (metric === 'Prospectos') return weekly ? data.weekProspects : data.monthProspects
  if (metric === 'Clientes') return weekly ? data.weekClients : data.monthClients
  if (metric === 'Conversión') return weekly ? data.weekConversion : data.conversion
  if (metric === 'Trámites concluidos') return weekly ? data.weekFinishedProcesses : data.monthFinishedProcesses
  return 0
}

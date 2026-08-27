import { hermosilloTodayKey } from '@/lib/hermosillo'

type SupabaseClient = any

export type FinancialProcessRow = {
  id: string
  service_name: string
  status: string
  clients: any
  process_charges: any
  agreed: number
  paid: number
  balance: number
  commitment: string | null
  overdue: boolean
}

export async function getFinancialSummary(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data: processes, error: processError } = await supabase
    .from('processes')
    .select(
      'id, service_name, status, clients(full_name, phone), process_charges(agreed_amount, payment_commitment_date)',
    )
    .eq('organization_id', organizationId)
    .neq('status', 'Cancelado')
    .order('created_at', { ascending: false })

  if (processError) {
    return {
      rows: [] as FinancialProcessRow[],
      payments: [] as any[],
      totalAgreed: 0,
      totalPaid: 0,
      totalBalance: 0,
      overdueBalance: 0,
      error: processError.message,
    }
  }

  const processIds = (processes ?? []).map((process: any) => process.id)

  let payments: any[] = []
  if (processIds.length) {
    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, payment_date, payment_method, reference, process_id')
      .eq('organization_id', organizationId)
      .in('process_id', processIds)
      .order('payment_date', { ascending: false })

    if (error) {
      return {
        rows: [] as FinancialProcessRow[],
        payments: [] as any[],
        totalAgreed: 0,
        totalPaid: 0,
        totalBalance: 0,
        overdueBalance: 0,
        error: error.message,
      }
    }

    payments = data ?? []
  }

  const paidByProcess = new Map<string, number>()
  for (const payment of payments) {
    paidByProcess.set(
      payment.process_id,
      (paidByProcess.get(payment.process_id) ?? 0) + Number(payment.amount),
    )
  }

  const todayKey = hermosilloTodayKey()
  const rows: FinancialProcessRow[] = (processes ?? []).map((process: any) => {
    const charge = Array.isArray(process.process_charges)
      ? process.process_charges[0]
      : process.process_charges

    const agreed = Number(charge?.agreed_amount ?? 0)
    const paid = paidByProcess.get(process.id) ?? 0
    const balance = Math.max(0, agreed - paid)
    const commitment = charge?.payment_commitment_date ?? null
    const overdue = Boolean(
      commitment &&
        balance > 0 &&
        commitment < todayKey,
    )

    return {
      ...process,
      agreed,
      paid,
      balance,
      commitment,
      overdue,
    }
  })

  return {
    rows,
    payments,
    totalAgreed: rows.reduce((sum, row) => sum + row.agreed, 0),
    totalPaid: rows.reduce((sum, row) => sum + row.paid, 0),
    totalBalance: rows.reduce((sum, row) => sum + row.balance, 0),
    overdueBalance: rows
      .filter((row) => row.overdue)
      .reduce((sum, row) => sum + row.balance, 0),
    error: null as string | null,
  }
}

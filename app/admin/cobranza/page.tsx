import { requireAuthContext } from '@/lib/auth-context'
import { dateOnly, dateTime, money } from '@/lib/format'
import { getFinancialSummary } from '@/lib/financial-summary'
import { isAdministrator } from '@/lib/admin-access'
import PaymentForm from '@/components/payment-form'
import {
  addDaysKey,
  hermosilloDateKey,
  hermosilloDateTime,
  hermosilloTodayKey,
  startOfWeekKey,
} from '@/lib/hermosillo'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

export default async function CobranzaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()
  const administrator = isAdministrator(context.role)
  const financial = await getFinancialSummary(context.supabase, context.organizationId)

  const todayKey = hermosilloTodayKey()
  const weekStartKey = startOfWeekKey(todayKey)
  const previousWeekStartKey = addDaysKey(weekStartKey, -7)
  const elapsedDays = Math.max(0, Math.round((new Date(`${todayKey}T12:00:00Z`).getTime() - new Date(`${weekStartKey}T12:00:00Z`).getTime()) / 86400000))
  const previousComparableEndKey = addDaysKey(previousWeekStartKey, elapsedDays)

  const customFrom = typeof params.from === 'string' ? params.from : weekStartKey
  const customTo = typeof params.to === 'string' ? params.to : todayKey

  let currentWeekPayments: any[] = []
  let previousWeekPayments: any[] = []
  let periodPayments: any[] = []

  if (administrator) {
    const currentStart = hermosilloDateTime(weekStartKey, 0).toISOString()
    const currentEnd = hermosilloDateTime(addDaysKey(todayKey, 1), 0).toISOString()
    const previousStart = hermosilloDateTime(previousWeekStartKey, 0).toISOString()
    const previousEnd = hermosilloDateTime(addDaysKey(previousWeekStartKey, 7), 0).toISOString()
    const rangeStart = hermosilloDateTime(customFrom, 0).toISOString()
    const rangeEnd = hermosilloDateTime(addDaysKey(customTo, 1), 0).toISOString()

    const [currentResult, previousResult, rangeResult] = await Promise.all([
      context.supabase.from('payments').select('id, amount, payment_date, payment_method, reference, processes(service_name, clients(full_name))').eq('organization_id', context.organizationId).gte('payment_date', currentStart).lt('payment_date', currentEnd).order('payment_date'),
      context.supabase.from('payments').select('id, amount, payment_date, payment_method, reference, processes(service_name, clients(full_name))').eq('organization_id', context.organizationId).gte('payment_date', previousStart).lt('payment_date', previousEnd).order('payment_date'),
      context.supabase.from('payments').select('id, amount, payment_date, payment_method, reference, processes(service_name, clients(full_name))').eq('organization_id', context.organizationId).gte('payment_date', rangeStart).lt('payment_date', rangeEnd).order('payment_date', { ascending: false }),
    ])
    currentWeekPayments = currentResult.data ?? []
    previousWeekPayments = previousResult.data ?? []
    periodPayments = rangeResult.data ?? []
  }

  const sum = (items: any[]) => items.reduce((total, item) => total + Number(item.amount ?? 0), 0)
  const currentToDate = sum(currentWeekPayments)
  const previousToDate = sum(previousWeekPayments.filter((p) => hermosilloDateKey(p.payment_date) <= previousComparableEndKey))
  const comparison = percentChange(currentToDate, previousToDate)

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const dailyRows = Array.from({ length: 7 }, (_, index) => {
    const currentKey = addDaysKey(weekStartKey, index)
    const previousKey = addDaysKey(previousWeekStartKey, index)
    const current = currentWeekPayments.filter((p) => hermosilloDateKey(p.payment_date) === currentKey).reduce((s, p) => s + Number(p.amount), 0)
    const previous = previousWeekPayments.filter((p) => hermosilloDateKey(p.payment_date) === previousKey).reduce((s, p) => s + Number(p.amount), 0)
    return { label: weekdays[index], currentKey, current, previous }
  })

  const periodTotal = sum(periodPayments)
  const periodAverage = periodPayments.length ? periodTotal / periodPayments.length : 0
  const methods = new Map<string, number>()
  periodPayments.forEach((p) => methods.set(p.payment_method || 'Otro', (methods.get(p.payment_method || 'Otro') ?? 0) + Number(p.amount)))

  return <>
    <header className="page-header"><div><span className="eyebrow">Control financiero</span><h1>Cobranza</h1><p>Semana operativa de lunes a domingo, siempre con horario de Hermosillo.</p></div></header>
    {params.created ? <div className="notice success receipt-success"><span>Pago registrado correctamente.</span>{typeof params.payment==='string'?<a className="primary-button mini-button" href={`/admin/cobranza/recibo/${params.payment}`}>Generar recibo PDF</a>:null}</div> : null}
    {params.error ? <div className="notice error">{String(params.error)}</div> : null}

    {administrator ? <>
      <section className="panel-card weekly-revenue-panel">
        <div className="panel-heading"><div><span className="eyebrow">Solo administrador</span><h3>Semana actual · {dateOnly(`${weekStartKey}T12:00:00-07:00`)} a {dateOnly(`${addDaysKey(weekStartKey, 6)}T12:00:00-07:00`)}</h3></div></div>
        <div className="client-kpis">
          <article><span>Cobrado hasta hoy</span><strong>{money(currentToDate)}</strong></article>
          <article><span>Mismo punto semana anterior</span><strong>{money(previousToDate)}</strong></article>
          <article><span>Variación</span><strong className={comparison === null ? '' : comparison >= 0 ? 'positive-number' : 'negative-number'}>{comparison === null ? 'Sin base' : `${comparison >= 0 ? '+' : ''}${comparison.toFixed(1)}%`}</strong></article>
          <article><span>Día operativo</span><strong>{weekdays[Math.min(6, elapsedDays)]}</strong></article>
        </div>
        <div className="weekly-comparison-table">
          <div className="weekly-row weekly-head"><span>Día</span><span>Esta semana</span><span>Semana anterior</span></div>
          {dailyRows.map((row, index) => <div className={`weekly-row ${index > elapsedDays ? 'future-row' : ''}`} key={row.currentKey}><span>{row.label}</span><strong>{index <= elapsedDays ? money(row.current) : '—'}</strong><span>{money(row.previous)}</span></div>)}
        </div>
      </section>

      <section className="panel-card executive-range-panel">
        <div className="panel-heading"><div><span className="eyebrow">Consulta histórica</span><h3>Ingresos por intervalo</h3></div></div>
        <form className="date-range-form" method="get"><label>Desde<input type="date" name="from" defaultValue={customFrom}/></label><label>Hasta<input type="date" name="to" defaultValue={customTo}/></label><button className="primary-button" type="submit">Consultar</button></form>
        <div className="client-kpis"><article><span>Cobrado</span><strong>{money(periodTotal)}</strong></article><article><span>Pagos</span><strong>{periodPayments.length}</strong></article><article><span>Ticket promedio</span><strong>{money(periodAverage)}</strong></article><article><span>Periodo</span><strong className="small-kpi">{dateOnly(`${customFrom}T12:00:00-07:00`)}–{dateOnly(`${customTo}T12:00:00-07:00`)}</strong></article></div>
        <div className="payment-method-summary">{[...methods.entries()].map(([method,total]) => <div key={method}><span>{method}</span><strong>{money(total)}</strong></div>)}</div>
        <div className="activity-list compact">{periodPayments.slice(0,50).map((p:any) => { const process=Array.isArray(p.processes)?p.processes[0]:p.processes; const client=Array.isArray(process?.clients)?process.clients[0]:process?.clients; return <div key={p.id} className="payment-history-row"><div><strong>{money(p.amount)} · {client?.full_name||'Cliente'}</strong><small>{dateTime(p.payment_date)} · {process?.service_name||'Sin trámite'} · {p.payment_method}</small></div><a className="secondary-button mini-button" href={`/admin/cobranza/recibo/${p.id}`}>Recibo PDF</a></div> })}{!periodPayments.length ? <div className="empty-state">Sin ingresos en el periodo seleccionado.</div> : null}</div>
      </section>
    </> : null}

    <section className="client-kpis"><article><span>Total acordado</span><strong>{money(financial.totalAgreed)}</strong></article><article><span>Cobrado histórico</span><strong>{money(financial.totalPaid)}</strong></article><article><span>Por cobrar</span><strong>{money(financial.totalBalance)}</strong></article><article><span>Vencido</span><strong>{money(financial.overdueBalance)}</strong></article></section>
    <section className="collections-layout"><PaymentForm processes={financial.rows.filter(r=>r.balance>0).map(r=>{const c=Array.isArray(r.clients)?r.clients[0]:r.clients;return{id:r.id,service_name:r.service_name,client_name:c?.full_name||'Cliente',balance:r.balance}})}/><section className="table-card"><div className="panel-heading"><div><span className="eyebrow">Cuentas</span><h3>Estado de cobranza</h3></div><strong>{financial.rows.length}</strong></div><div className="collection-cards">{financial.rows.map(row=>{const c=Array.isArray(row.clients)?row.clients[0]:row.clients;return <article className={row.overdue?'collection-card overdue':'collection-card'} key={row.id}><div className="collection-card-head"><div><strong>{c?.full_name||'Cliente'}</strong><small>{row.service_name} · {c?.phone||''}</small></div><span className={row.balance<=0?'payment-status paid':row.paid>0?'payment-status partial':'payment-status pending'}>{row.balance<=0?'Pagado':row.paid>0?'Parcial':'Pendiente'}</span></div><div className="collection-amounts"><div><span>Total</span><strong>{money(row.agreed)}</strong></div><div><span>Pagado</span><strong>{money(row.paid)}</strong></div><div><span>Saldo</span><strong>{money(row.balance)}</strong></div></div><small>Compromiso: {row.commitment||'Sin fecha'}{row.overdue?' · VENCIDO':''}</small></article>})}</div></section></section>
  </>
}

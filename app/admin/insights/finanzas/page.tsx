import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData } from '@/lib/insights'
import { money, dateTime } from '@/lib/format'

function variation(current:number, previous:number) {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

export default async function FinanceInsightsPage() {
  const context = await requireAuthContext(); requireAdministrator(context)
  const data = await getInsightsData(context.supabase, context.organizationId)
  const weekVariation = variation(data.weekRevenue, data.previousWeekRevenue)
  const monthVariation = variation(data.monthRevenue, data.previousMonthRevenue)

  return <>
    <header className="insights-hero compact">
      <div><span className="eyebrow">Águila Insights · Fase 5.2.2</span><h1>Centro Financiero</h1><p>Lectura ejecutiva basada únicamente en dinero efectivamente cobrado.</p></div>
    </header>
    {data.errors.length ? <div className="notice error">No fue posible consultar todos los indicadores. {data.errors[0]}</div> : null}

    <section className="executive-kpis">
      <article><span>Hoy</span><strong>{money(data.todayRevenue)}</strong><small>Ingreso cobrado</small></article>
      <article><span>Semana</span><strong>{money(data.weekRevenue)}</strong><small>{weekVariation === null ? 'Sin comparativo' : `${weekVariation >= 0 ? '+' : ''}${weekVariation}% vs. semana anterior`}</small></article>
      <article><span>Mes</span><strong>{money(data.monthRevenue)}</strong><small>{monthVariation === null ? 'Sin comparativo' : `${monthVariation >= 0 ? '+' : ''}${monthVariation}% vs. mes anterior`}</small></article>
      <article><span>Pago promedio</span><strong>{money(data.averagePayment)}</strong><small>{data.paymentCountMonth} movimientos este mes</small></article>
    </section>

    <section className="panel-card finance-chart-card">
      <div className="panel-heading"><div><span className="eyebrow">Flujo de caja</span><h3>Ingresos cobrados · últimos 14 días</h3></div><strong>{money(data.dailyRevenue.reduce((sum:number,item:any)=>sum+item.amount,0))}</strong></div>
      <div className="revenue-bars">
        {data.dailyRevenue.map((item:any) => <div className="revenue-bar-item" key={item.date.toISOString()} title={`${item.date.toLocaleDateString('es-MX')}: ${money(item.amount)}`}>
          <strong>{item.amount ? money(item.amount) : ''}</strong>
          <div className="revenue-bar-track"><span style={{height: `${Math.max(item.amount ? 8 : 2, (item.amount / data.maxDailyRevenue) * 100)}%`}} /></div>
          <small>{item.date.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</small>
        </div>)}
      </div>
    </section>

    <section className="insights-grid">
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Rentabilidad comercial</span><h3>Servicios del mes</h3></div><strong>{data.bestService ? money(data.bestService[1]) : money(0)}</strong></div><div className="ranking-list">{data.serviceRevenue.map(([name, amount]:[string,number], index:number) => <div key={name}><span>{index+1}. {name}</span><strong>{money(amount)}</strong></div>)}{!data.serviceRevenue.length?<div className="empty-state">Todavía no hay pagos registrados este mes.</div>:null}</div></article>
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Formas de pago</span><h3>Distribución del mes</h3></div></div><div className="ranking-list">{data.paymentMethods.map(([name, amount]:[string,number]) => {const pct=data.monthRevenue?Math.round(amount/data.monthRevenue*100):0; return <div key={name}><span>{name}<small>{pct}% del ingreso</small></span><strong>{money(amount)}</strong></div>})}{!data.paymentMethods.length?<div className="empty-state">Sin movimientos para clasificar.</div>:null}</div></article>
    </section>

    <section className="insights-grid">
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Lectura rápida</span><h3>Indicadores financieros</h3></div></div><div className="executive-summary"><p>El mejor servicio del mes es <strong>{data.bestService?.[0] ?? '—'}</strong>{data.bestService ? <> con <strong>{money(data.bestService[1])}</strong>.</> : '.'}</p><p>El mejor día de los últimos 14 días fue <strong>{data.bestDay?.date.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</strong> con <strong>{money(data.bestDay?.amount ?? 0)}</strong>.</p><p>El ticket promedio por cliente creado este mes es de <strong>{money(data.ticketAverage)}</strong>.</p><p>El acumulado anual cobrado es de <strong>{money(data.yearRevenue)}</strong>.</p></div></article>
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Movimientos</span><h3>Últimos pagos</h3></div><strong>{data.payments.length}</strong></div><div className="payment-ledger">{[...data.payments].reverse().slice(0,20).map((payment:any)=>{const process=Array.isArray(payment.processes)?payment.processes[0]:payment.processes; const clientRelation=process?.clients; const client=Array.isArray(clientRelation)?clientRelation[0]:clientRelation; return <div key={payment.id}><span><strong>{client?.full_name ?? process?.service_name ?? 'Pago registrado'}</strong><small>{process?.service_name ?? 'Sin servicio'} · {payment.payment_method || 'Sin método'} · {dateTime(payment.payment_date)}</small></span><strong>{money(Number(payment.amount))}</strong></div>})}{!data.payments.length?<div className="empty-state">No hay pagos registrados.</div>:null}</div></article>
    </section>
  </>
}

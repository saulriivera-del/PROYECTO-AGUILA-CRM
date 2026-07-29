import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData } from '@/lib/insights'
import { money, dateTime } from '@/lib/format'

export default async function FinanceInsightsPage() {
  const context = await requireAuthContext(); requireAdministrator(context)
  const data = await getInsightsData(context.supabase, context.organizationId)
  return <><header className="page-header"><div><span className="eyebrow">Águila Insights</span><h1>Centro Financiero</h1><p>Todos los indicadores se calculan con dinero efectivamente cobrado.</p></div></header>
  <section className="executive-kpis"><article><span>Hoy</span><strong>{money(data.todayRevenue)}</strong></article><article><span>Semana</span><strong>{money(data.weekRevenue)}</strong></article><article><span>Mes</span><strong>{money(data.monthRevenue)}</strong></article><article><span>Año</span><strong>{money(data.yearRevenue)}</strong></article></section>
  <section className="insights-grid"><article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Ranking</span><h3>Servicios del mes</h3></div></div><div className="ranking-list">{data.serviceRevenue.map(([name, amount]) => <div key={name}><span>{name}</span><strong>{money(amount)}</strong></div>)}</div></article><article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Movimientos</span><h3>Últimos pagos</h3></div></div><div className="activity-list">{[...data.payments].reverse().slice(0, 20).map((payment: any) => <div key={payment.id}><strong>{money(Number(payment.amount))}</strong><small>{dateTime(payment.payment_date)}</small></div>)}</div></article></section></>
}

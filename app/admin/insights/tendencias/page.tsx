import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData } from '@/lib/insights'
import { money } from '@/lib/format'

function variation(current:number, previous:number) {
  if (!previous) return null
  return Math.round(((current-previous)/previous)*100)
}
function Trend({label,current,previous,format=(n:number)=>String(n)}:{label:string,current:number,previous:number,format?:(n:number)=>string}) {
  const change=variation(current,previous)
  return <article className="panel-card trend-card"><span>{label}</span><strong>{format(current)}</strong><small>{change===null?'Sin periodo comparable':`${change>=0?'▲':'▼'} ${Math.abs(change)}% vs. periodo anterior`}</small></article>
}
export default async function TrendsPage(){
  const context=await requireAuthContext(); requireAdministrator(context)
  const data=await getInsightsData(context.supabase,context.organizationId)
  return <>
    <header className="insights-hero compact"><div><span className="eyebrow">Águila Insights · Fase 5.2.4</span><h1>Tendencias del negocio</h1><p>Compara el desempeño reciente e identifica cambios que requieren atención.</p></div><Link className="secondary-button" href="/admin/insights">Volver a Insights</Link></header>
    {data.errors.length?<div className="notice error">No fue posible consultar todos los datos. {data.errors[0]}</div>:null}
    <section className="executive-kpis">
      <Trend label="Ingresos semana" current={data.weekRevenue} previous={data.previousWeekRevenue} format={money}/>
      <Trend label="Ingresos mes" current={data.monthRevenue} previous={data.previousMonthRevenue} format={money}/>
      <Trend label="Prospectos semana" current={data.weekProspects} previous={data.previousWeekProspects}/>
      <Trend label="Clientes semana" current={data.weekClients} previous={data.previousWeekClients}/>
    </section>
    <section className="insights-grid">
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Últimos 14 días</span><h3>Comportamiento de ingresos</h3></div></div><div className="daily-bars">{data.dailyRevenue.map((d:any)=><div key={d.date.toISOString()} title={money(d.amount)}><span style={{height:`${Math.max(4,Math.round(d.amount/data.maxDailyRevenue*100))}%`}}/><small>{d.date.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</small></div>)}</div></article>
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Lectura rápida</span><h3>Señales principales</h3></div></div><div className="executive-summary">
        <p>{data.weekRevenue>=data.previousWeekRevenue?'Los ingresos semanales mantienen una dirección positiva.':'Los ingresos semanales están por debajo de la semana anterior; conviene reforzar seguimientos y cobranza.'}</p>
        <p>{data.conversion>=70?'La conversión mensual se encuentra en un nivel sólido.':'La conversión mensual tiene espacio de mejora; revisa prospectos sin seguimiento.'}</p>
        <p>{data.stalledProcesses===0?'No existen trámites con más de cinco días sin movimiento.':`${data.stalledProcesses} trámites llevan al menos cinco días sin movimiento.`}</p>
        <p>{data.bestService?`${data.bestService[0]} es el servicio con mayor ingreso del periodo: ${money(data.bestService[1])}.`:'Aún no hay pagos suficientes para identificar el servicio líder.'}</p>
      </div></article>
    </section>
  </>
}

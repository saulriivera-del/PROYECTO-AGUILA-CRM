import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData, bonusForRevenue } from '@/lib/insights'
import { money } from '@/lib/format'

export default async function DirectorPage(){
 const context=await requireAuthContext(); requireAdministrator(context)
 const data=await getInsightsData(context.supabase,context.organizationId)
 const alerts:string[]=[]; const opportunities:string[]=[]; const wins:string[]=[]
 if(data.stalledProcesses) alerts.push(`${data.stalledProcesses} trámites requieren atención por inactividad.`)
 if(data.weekRevenue<data.previousWeekRevenue) alerts.push(`El ingreso semanal está ${money(data.previousWeekRevenue-data.weekRevenue)} por debajo de la semana anterior.`)
 if(data.conversion<60) alerts.push(`La conversión mensual es de ${data.conversion}%; revisa prospectos que todavía no se convirtieron en clientes.`)
 if(data.bestService) opportunities.push(`${data.bestService[0]} lidera los ingresos del mes con ${money(data.bestService[1])}; puede ser buen candidato para una campaña.`)
 if(data.monthProspects>data.monthClients) opportunities.push(`${data.monthProspects-data.monthClients} prospectos del mes aún no se reflejan como clientes.`)
 if(data.weekRevenue>=data.previousWeekRevenue) wins.push(`La semana está igual o por encima de la anterior con ${money(data.weekRevenue)} cobrados.`)
 if(data.stalledProcesses===0) wins.push('La operación está al día, sin trámites detenidos por más de cinco días.')
 for(const rule of data.bonusRules){const p=Array.isArray(rule.user_profile)?rule.user_profile[0]:rule.user_profile;const b=bonusForRevenue(data.weekRevenue,Number(rule.threshold_amount),Number(rule.base_bonus),Number(rule.step_amount),Number(rule.step_bonus)); if(b>0) wins.push(`${p?.full_name??'El equipo'} ya activó un bono estimado de ${money(b)}.`)}
 return <>
  <header className="insights-hero compact"><div><span className="eyebrow">Director Águila · Fase 5.2.4</span><h1>Buenos días, {context.fullName.split(' ')[0]}.</h1><p>Resumen ejecutivo generado con reglas transparentes a partir de los datos actuales.</p></div><Link className="secondary-button" href="/admin/insights">Volver a Insights</Link></header>
  <section className="director-grid">
   <article className="panel-card director-card urgent"><div className="panel-heading"><div><span className="eyebrow">Atención</span><h3>Decisiones prioritarias</h3></div></div>{alerts.length?<ul>{alerts.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>No se detectaron alertas críticas en este momento.</p>}</article>
   <article className="panel-card director-card"><div className="panel-heading"><div><span className="eyebrow">Oportunidades</span><h3>Dónde actuar</h3></div></div>{opportunities.length?<ul>{opportunities.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>Registra más movimientos para generar recomendaciones comerciales.</p>}</article>
   <article className="panel-card director-card success"><div className="panel-heading"><div><span className="eyebrow">Avances</span><h3>Qué está funcionando</h3></div></div>{wins.length?<ul>{wins.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>Aún no hay avances destacados para este periodo.</p>}</article>
  </section>
  <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Indicadores base</span><h3>Fotografía actual</h3></div></div><div className="bonus-detail-grid"><div><span>Ingreso semanal</span><strong>{money(data.weekRevenue)}</strong></div><div><span>Conversión mensual</span><strong>{data.conversion}%</strong></div><div><span>Trámites activos</span><strong>{data.activeProcesses}</strong></div><div><span>Ticket promedio</span><strong>{money(data.ticketAverage)}</strong></div></div></article>
 </>
}

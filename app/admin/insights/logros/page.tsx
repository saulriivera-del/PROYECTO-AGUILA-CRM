import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData, bonusForRevenue } from '@/lib/insights'

export default async function AchievementsPage(){
 const context=await requireAuthContext(); requireAdministrator(context)
 const data=await getInsightsData(context.supabase,context.organizationId)
 const achievements:any[]=[]
 for(const rule of data.bonusRules){
   const profile=Array.isArray(rule.user_profile)?rule.user_profile[0]:rule.user_profile
   const bonus=bonusForRevenue(data.weekRevenue,Number(rule.threshold_amount),Number(rule.base_bonus),Number(rule.step_amount),Number(rule.step_bonus))
   if(bonus>0) achievements.push({icon:'🎯',title:'Meta semanal alcanzada',person:profile?.full_name??'Usuario',detail:`Activó un bono estimado de $${bonus.toLocaleString('es-MX')}.`})
 }
 if(data.stalledProcesses===0) achievements.push({icon:'⚡',title:'Operación al día',person:'Equipo Visa Master',detail:'No hay trámites con más de cinco días sin movimiento.'})
 if(data.weekFinishedProcesses>=5) achievements.push({icon:'🏁',title:'Semana productiva',person:'Equipo Visa Master',detail:`Se concluyeron ${data.weekFinishedProcesses} trámites esta semana.`})
 if(data.weekConversion>=80) achievements.push({icon:'⭐',title:'Conversión sobresaliente',person:'Equipo Visa Master',detail:`Conversión semanal estimada de ${data.weekConversion}%.`})
 return <>
  <header className="insights-hero compact"><div><span className="eyebrow">Águila Insights · Fase 5.2.4</span><h1>Logros del equipo</h1><p>Reconocimientos automáticos basados en resultados reales del CRM.</p></div><Link className="secondary-button" href="/admin/insights">Volver a Insights</Link></header>
  <section className="achievement-grid">{achievements.map((a,i)=><article className="panel-card achievement-card" key={i}><span className="achievement-icon">{a.icon}</span><div><span className="eyebrow">{a.person}</span><h3>{a.title}</h3><p>{a.detail}</p></div></article>)}{!achievements.length?<article className="panel-card empty-state">Los logros aparecerán automáticamente cuando el equipo alcance metas, mantenga la operación al día o supere indicadores.</article>:null}</section>
  <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Próximos reconocimientos</span><h3>Qué puede desbloquear el equipo</h3></div></div><div className="ranking-list"><div><span>🏅 Semana perfecta</span><strong>Sin actividades vencidas</strong></div><div><span>🚀 Récord semanal</span><strong>Mayor ingreso histórico</strong></div><div><span>🤝 Seguimiento impecable</span><strong>100% de seguimientos completados</strong></div><div><span>🥇 Constancia</span><strong>4 semanas consecutivas con meta</strong></div></div></article>
 </>
}

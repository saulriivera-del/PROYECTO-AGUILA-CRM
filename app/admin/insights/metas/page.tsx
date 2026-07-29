import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData } from '@/lib/insights'
import { money } from '@/lib/format'
import { saveGoal } from '../actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
export default async function GoalsPage({searchParams}:{searchParams:SearchParams}) {
 const params=await searchParams; const context=await requireAuthContext(); requireAdministrator(context); const data=await getInsightsData(context.supabase,context.organizationId)
 return <><header className="page-header"><div><span className="eyebrow">Águila Insights</span><h1>Centro de Metas</h1><p>Crea objetivos para la empresa o para integrantes del equipo.</p></div></header>{params.saved?<div className="notice success">Meta guardada.</div>:null}{params.error?<div className="notice error">{String(params.error)}</div>:null}
 <section className="insights-grid"><form action={saveGoal} className="panel-card insight-form"><div className="panel-heading"><div><span className="eyebrow">Nueva meta</span><h3>Configuración</h3></div></div><label>Nombre<input name="name" placeholder="Meta de ingresos mensual" required/></label><div className="form-grid"><label>Indicador<select name="metric"><option>Ingresos</option><option>Prospectos</option><option>Clientes</option><option>Conversión</option><option>Trámites concluidos</option></select></label><label>Periodo<select name="period"><option>Mensual</option><option>Semanal</option><option>Anual</option></select></label></div><label>Objetivo<input name="target_value" type="number" min="1" step="0.01" required/></label><label>Responsable<select name="assigned_to"><option value="">Toda la empresa</option>{data.profiles.map((p:any)=><option value={p.id} key={p.id}>{p.full_name}</option>)}</select></label><button className="primary-button">Guardar meta</button></form>
 <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Activas</span><h3>Metas configuradas</h3></div><strong>{data.goals.length}</strong></div><div className="goal-list">{data.goals.map((g:any)=><div key={g.id}><span><strong>{g.name}</strong><small>{g.metric} · {g.period}</small></span><strong>{g.metric==='Ingresos'?money(Number(g.target_value)):Number(g.target_value).toLocaleString('es-MX')}</strong></div>)}{!data.goals.length?<div className="empty-state">Todavía no hay metas.</div>:null}</div></article></section></>
}

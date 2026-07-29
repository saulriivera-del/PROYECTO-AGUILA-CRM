import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData, goalCurrentValue } from '@/lib/insights'
import { money } from '@/lib/format'
import { saveGoal, toggleGoal } from '../actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
const metricValue = (metric:string, value:number) => metric === 'Ingresos' ? money(value) : metric === 'Conversión' ? `${Math.round(value)}%` : value.toLocaleString('es-MX')

export default async function GoalsPage({searchParams}:{searchParams:SearchParams}) {
  const params=await searchParams
  const context=await requireAuthContext(); requireAdministrator(context)
  const data=await getInsightsData(context.supabase,context.organizationId)
  const editingId=String(params.edit ?? '')
  const editing=data.goals.find((goal:any)=>goal.id===editingId)

  return <>
    <header className="insights-hero compact"><div><span className="eyebrow">Águila Insights · Fase 5.2.3</span><h1>Centro de Metas</h1><p>Define objetivos medibles para Visa Master y para cada integrante del equipo.</p></div></header>
    {params.saved?<div className="notice success">Meta guardada correctamente.</div>:null}{params.disabled?<div className="notice success">Meta archivada.</div>:null}{params.error?<div className="notice error">{String(params.error)}</div>:null}

    <section className="goals-overview">
      {data.goals.map((goal:any)=>{const current=goalCurrentValue(goal,data); const target=Number(goal.target_value); const progress=target?Math.min(100,Math.round(current/target*100)):0; const relation=Array.isArray(goal.assigned_profile)?goal.assigned_profile[0]:goal.assigned_profile; return <article className="goal-progress-card" key={goal.id}><div><span className="goal-status-label">{goal.period} · {relation?.full_name ?? 'Toda la empresa'}</span><h3>{goal.name}</h3></div><div className="goal-progress-number">{progress}%</div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><div className="goal-numbers"><span>{metricValue(goal.metric,current)} actuales</span><strong>{metricValue(goal.metric,target)}</strong></div><div className="goal-card-actions"><Link className="text-link" href={`/admin/insights/metas?edit=${goal.id}`}>Editar</Link><form action={toggleGoal}><input type="hidden" name="id" value={goal.id}/><button className="text-button danger">Archivar</button></form></div></article>})}
      {!data.goals.length?<div className="panel-card empty-state">Todavía no hay metas. Crea la primera para comenzar a medir el avance.</div>:null}
    </section>

    <section className="insights-grid goals-config-grid">
      <form action={saveGoal} className="panel-card insight-form">
        <div className="panel-heading"><div><span className="eyebrow">{editing?'Editar meta':'Nueva meta'}</span><h3>Configuración</h3></div>{editing?<Link className="text-link" href="/admin/insights/metas">Cancelar</Link>:null}</div>
        {editing?<input type="hidden" name="id" value={editing.id}/>:null}
        <label>Nombre<input name="name" defaultValue={editing?.name ?? ''} placeholder="Meta de ingresos mensual" required/></label>
        <div className="form-grid"><label>Indicador<select name="metric" defaultValue={editing?.metric ?? 'Ingresos'}><option>Ingresos</option><option>Prospectos</option><option>Clientes</option><option>Conversión</option><option>Trámites concluidos</option></select></label><label>Periodo<select name="period" defaultValue={editing?.period ?? 'Mensual'}><option>Semanal</option><option>Mensual</option><option>Anual</option></select></label></div>
        <label>Objetivo<input name="target_value" type="number" min="1" step="0.01" defaultValue={editing?.target_value ?? ''} required/></label>
        <label>Responsable<select name="assigned_to" defaultValue={editing?.assigned_to ?? ''}><option value="">Toda la empresa</option>{data.profiles.map((p:any)=><option value={p.id} key={p.id}>{p.full_name}</option>)}</select></label>
        <button className="primary-button">{editing?'Actualizar meta':'Guardar meta'}</button>
      </form>
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Guía</span><h3>Metas recomendadas</h3></div></div><div className="executive-summary"><p><strong>Ingresos semanales:</strong> controla el ritmo de cobranza real.</p><p><strong>Ingresos mensuales:</strong> mide el objetivo principal de la agencia.</p><p><strong>Conversión:</strong> compara clientes creados contra prospectos nuevos.</p><p><strong>Trámites concluidos:</strong> mide capacidad operativa, no solo ventas.</p><p>Las metas asignadas a una persona identifican al responsable; en esta entrega el avance financiero sigue tomando el ingreso total de la agencia.</p></div></article>
    </section>
  </>
}

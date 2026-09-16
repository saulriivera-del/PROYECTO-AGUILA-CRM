import { requireAuthContext } from '@/lib/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateOpportunityStatus } from './actions'

type Opportunity = {
  client_id: number
  full_name: string
  visa_type: string | null
  client_status: string
  priority: number
  previous_appointment_date: string | null
  current_consulate: string | null
  opportunity_consulate: string
  opportunity_date: string
  improvement_days: number | null
  days_notice: number | null
  detection_count: number
  first_detected_at: string
  last_detected_at: string
  minutes_since_last_detection: number | null
  operational_status: string
}

const dateFmt = new Intl.DateTimeFormat('es-MX', { day:'2-digit', month:'short', year:'numeric', timeZone:'America/Hermosillo' })
const timeFmt = new Intl.DateTimeFormat('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Hermosillo' })
function dateOnly(value?: string | null){ return value ? dateFmt.format(new Date(`${value}T12:00:00-07:00`)) : 'Sin cita' }
function dateTime(value?: string | null){ return value ? timeFmt.format(new Date(value)) : '—' }
function label(status:string){ return ({NEW:'Nueva',REVIEWING:'En revisión',NOTIFIED:'Notificada',COMPLETED:'Utilizada',EXPIRED:'Expirada',CLOSED:'Cerrada'} as Record<string,string>)[status] ?? status }

export default async function OpportunitiesPage(){
  await requireAuthContext()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vm_opportunity_center_consolidated')
    .select('*')
    .order('priority', { ascending: true })
    .order('improvement_days', { ascending: false })
    .order('last_detected_at', { ascending: false })

  const opportunities = (data ?? []) as Opportunity[]
  const counts = {
    NEW: opportunities.filter(o=>o.operational_status==='NEW').length,
    REVIEWING: opportunities.filter(o=>o.operational_status==='REVIEWING').length,
    NOTIFIED: opportunities.filter(o=>o.operational_status==='NOTIFIED').length,
    COMPLETED: opportunities.filter(o=>o.operational_status==='COMPLETED').length,
  }

  return <>
    <header className="page-header">
      <div><span className="eyebrow">Motor de citas · Visa Master</span><h1>Centro de Oportunidades</h1><p>Aperturas que cumplen las reglas de búsqueda de clientes activos.</p></div>
    </header>
    {error ? <div className="notice error">No fue posible cargar las oportunidades: {error.message}</div> : null}
    <section className="opportunity-kpis">
      <article><span>Nuevas</span><strong>{counts.NEW}</strong></article>
      <article><span>En revisión</span><strong>{counts.REVIEWING}</strong></article>
      <article><span>Notificadas</span><strong>{counts.NOTIFIED}</strong></article>
      <article><span>Utilizadas</span><strong>{counts.COMPLETED}</strong></article>
    </section>
    <section className="opportunity-grid">
      {opportunities.map((o)=><article className="panel-card opportunity-card" key={`${o.client_id}-${o.opportunity_consulate}-${o.opportunity_date}`}>
        <div className="opportunity-top"><div><span className={`opportunity-status status-${o.operational_status.toLowerCase()}`}>{label(o.operational_status)}</span><span className="opportunity-priority">Prioridad {o.priority}</span></div><small>{o.visa_type ?? 'Visa'}</small></div>
        <h3>{o.full_name}</h3>
        <div className="opportunity-date-comparison">
          <div><span>Cita actual</span><strong>{dateOnly(o.previous_appointment_date)}</strong><small>{o.current_consulate ?? 'Sin consulado'}</small></div>
          <b>→</b>
          <div><span>Oportunidad</span><strong>{dateOnly(o.opportunity_date)}</strong><small>{o.opportunity_consulate}</small></div>
        </div>
        <div className="opportunity-gain"><strong>{o.improvement_days ?? 0}</strong><span>días de mejora</span></div>
        <div className="opportunity-meta"><span>Detectada {o.detection_count} {o.detection_count===1?'vez':'veces'}</span><span>Última: {dateTime(o.last_detected_at)}</span>{o.days_notice != null ? <span>{o.days_notice} días de aviso</span> : null}</div>
        <div className="opportunity-actions">
          <form action={updateOpportunityStatus}><input type="hidden" name="client_id" value={o.client_id}/><input type="hidden" name="consulate" value={o.opportunity_consulate}/><input type="hidden" name="available_date" value={o.opportunity_date}/><button className="secondary-button mini-button" name="status" value="REVIEWING">Revisar</button></form>
          <form action={updateOpportunityStatus}><input type="hidden" name="client_id" value={o.client_id}/><input type="hidden" name="consulate" value={o.opportunity_consulate}/><input type="hidden" name="available_date" value={o.opportunity_date}/><button className="secondary-button mini-button" name="status" value="NOTIFIED">Notificada</button></form>
          <form action={updateOpportunityStatus}><input type="hidden" name="client_id" value={o.client_id}/><input type="hidden" name="consulate" value={o.opportunity_consulate}/><input type="hidden" name="available_date" value={o.opportunity_date}/><button className="primary-button mini-button" name="status" value="USED">Utilizada</button></form>
          <form action={updateOpportunityStatus}><input type="hidden" name="client_id" value={o.client_id}/><input type="hidden" name="consulate" value={o.opportunity_consulate}/><input type="hidden" name="available_date" value={o.opportunity_date}/><button className="secondary-button mini-button" name="status" value="DISMISSED">Descartar</button></form>
        </div>
      </article>)}
      {!opportunities.length && !error ? <div className="panel-card empty-state">No hay oportunidades registradas todavía.</div> : null}
    </section>
  </>
}

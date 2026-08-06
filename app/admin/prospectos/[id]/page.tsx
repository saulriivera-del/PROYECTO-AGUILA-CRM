import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import SubmitButton from '@/components/submit-button'
import { addProspectFollowup, convertProspect, closeProspect, reactivateProspect, rescheduleProspect } from '../actions'

type Params=Promise<{id:string}>
type SearchParams=Promise<Record<string,string|string[]|undefined>>

export default async function ProspectDetail({params,searchParams}:{params:Params,searchParams:SearchParams}){
 const {id}=await params; const query=await searchParams; const context=await requireAuthContext()
 const [{data:prospect},{data:followups}]=await Promise.all([
  context.supabase.from('prospects').select('*, profiles!prospects_assigned_to_fkey(full_name)').eq('id',id).eq('organization_id',context.organizationId).single(),
  context.supabase.from('prospect_followups').select('*, profiles!prospect_followups_created_by_fkey(full_name)').eq('prospect_id',id).eq('organization_id',context.organizationId).order('created_at',{ascending:false})
 ])
 if(!prospect) notFound()
 const assigned=Array.isArray(prospect.profiles)?prospect.profiles[0]:prospect.profiles
 const phone=String(prospect.phone||'').replace(/\D/g,''); const wa=phone?`https://wa.me/${phone.startsWith('52')?phone:`52${phone}`}?text=${encodeURIComponent(`Hola ${prospect.full_name}, te escribimos de Visa Master para dar seguimiento a tu trámite.`)}`:'#'
 return <>
  <header className="page-header"><div><span className="eyebrow">Expediente comercial</span><h1>{prospect.full_name}</h1><p>{prospect.service_interest} · {prospect.temperature}</p></div><div className="header-actions"><Link className="secondary-button" href="/admin/prospectos">Volver</Link><a className="primary-button" href={wa} target="_blank" rel="noreferrer">WhatsApp</a></div></header>
  {query.followup?<div className="notice success">Seguimiento registrado.</div>:null}{query.rescheduled?<div className="notice success">Seguimiento reprogramado.</div>:null}{query.error?<div className="notice error">{String(query.error)}</div>:null}
  <section className="prospect-detail-grid">
   <aside className="daily-side-column">
    <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Contacto</span><h3>Información</h3></div><span className={`status-pill ${prospect.status.toLowerCase()}`}>{prospect.status}</span></div><div className="prospect-info-list"><p><span>Teléfono</span><strong>{prospect.phone||'Sin teléfono'}</strong></p><p><span>Correo</span><strong>{prospect.email||'Sin correo'}</strong></p><p><span>Ciudad</span><strong>{prospect.city}, {prospect.state}</strong></p><p><span>Origen</span><strong>{prospect.origin}</strong></p><p><span>Responsable</span><strong>{assigned?.full_name||'Sin asignar'}</strong></p><p><span>Cotización</span><strong>{money(prospect.quoted_amount)}</strong></p></div></article>
    <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Próxima acción</span><h3>Seguimiento</h3></div></div><p><strong>{dateTime(prospect.next_followup_at)}</strong></p><form action={rescheduleProspect} className="compact-form"><input type="hidden" name="prospect_id" value={prospect.id}/><label>Nueva fecha<input type="datetime-local" name="next_followup_at" required/></label><SubmitButton pendingText="Guardando…">Reprogramar</SubmitButton></form></article>
    <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Conversión</span><h3>Resultado comercial</h3></div></div>{prospect.status==='Activo'?<><form action={convertProspect}><input type="hidden" name="prospect_id" value={prospect.id}/><SubmitButton pendingText="Convirtiendo…">Convertir a cliente</SubmitButton></form><form action={closeProspect} className="compact-form"><input type="hidden" name="prospect_id" value={prospect.id}/><label>Motivo<select name="loss_reason" required defaultValue=""><option value="" disabled>Selecciona</option><option>No interesado</option><option>Precio</option><option>Sin respuesta</option><option>Lo hará después</option><option>Eligió otra agencia</option><option>Otro</option></select></label><SubmitButton className="secondary-button" pendingText="Cerrando…">Cerrar como perdido</SubmitButton></form></>:prospect.status==='Perdido'?<form action={reactivateProspect}><input type="hidden" name="prospect_id" value={prospect.id}/><SubmitButton pendingText="Reactivando…">Reactivar prospecto</SubmitButton></form>:<p>Este prospecto ya fue convertido.</p>}</article>
   </aside>
   <main className="prospect-timeline-column">
    <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Nueva anotación</span><h3>Registrar seguimiento</h3></div></div><form action={addProspectFollowup} className="followup-form"><input type="hidden" name="prospect_id" value={prospect.id}/><div className="form-grid"><label>Resultado<select name="outcome" defaultValue="Seguimiento"><option>Seguimiento</option><option>Llamada</option><option>WhatsApp</option><option>Cotización enviada</option><option>Esperando documentos</option><option>Esperando respuesta</option><option>Cita agendada</option></select></label><label>Próximo seguimiento<input name="next_followup_at" type="datetime-local"/></label></div><label>Anotación<textarea name="note" rows={5} required placeholder="Qué se habló, qué falta y cuál será la siguiente acción."/></label><div className="modal-form-actions-inline"><SubmitButton pendingText="Registrando…">Guardar seguimiento</SubmitButton></div></form></article>
    <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Historial</span><h3>Línea del tiempo</h3></div><strong>{followups?.length||0}</strong></div><div className="prospect-timeline">{(followups??[]).map((f:any)=>{const profile=Array.isArray(f.profiles)?f.profiles[0]:f.profiles;return <article key={f.id}><span className="timeline-dot"/><div><div className="timeline-head"><strong>{f.outcome||'Seguimiento'}</strong><time>{dateTime(f.created_at)}</time></div><p>{f.note}</p><small>{profile?.full_name||'Usuario'}{f.next_followup_at?` · Próximo: ${dateTime(f.next_followup_at)}`:''}</small></div></article>})}{!(followups??[]).length?<div className="empty-state">Todavía no hay anotaciones. Registra el primer seguimiento.</div>:null}</div></article>
   </main>
  </section>
 </>
}

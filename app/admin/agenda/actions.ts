'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { hermosilloLocalInputToDate } from '@/lib/hermosillo'

const v=(f:FormData,n:string)=>String(f.get(n)??'').trim()

export async function createAgendaEvent(f:FormData){
 const c=await requireAuthContext(); const title=v(f,'title'), starts=v(f,'starts_at'), scope=v(f,'assignment_scope')||'General', assigned=v(f,'assigned_to')||null;
 if(!title||!starts) redirect('/admin/agenda?error=Completa%20título%20y%20fecha');
 if(scope==='Específico'&&!assigned) redirect('/admin/agenda?error=Selecciona%20un%20responsable');
 const startsDate=hermosilloLocalInputToDate(starts), endsRaw=v(f,'ends_at'), endsDate=endsRaw?hermosilloLocalInputToDate(endsRaw):null
 const startsIso=startsDate?.toISOString()
 if(!startsIso) redirect('/admin/agenda?error=Fecha%20inválida')
 const {error}=await c.supabase.from('agenda_events').insert({organization_id:c.organizationId,title,event_type:v(f,'event_type')||'Tarea',description:v(f,'description')||null,starts_at:startsIso,ends_at:endsDate?.toISOString()||null,assignment_scope:scope,assigned_to:scope==='Específico'?assigned:null,status:'Pendiente',created_by:c.userId});
 if(error) redirect('/admin/agenda?error='+encodeURIComponent(error.message)); revalidatePath('/admin'); revalidatePath('/admin/agenda'); redirect('/admin/agenda?created=1');
}

export async function completeAgendaEvent(f:FormData){
 const c=await requireAuthContext();
 const id=v(f,'event_id');
 const returnTo=v(f,'return_to')||'/admin/agenda';
 const {data:event,error:lookupError}=await c.supabase.from('agenda_events').select('id, process_id, automation_key, status').eq('id',id).eq('organization_id',c.organizationId).single();
 if(lookupError||!event) redirect('/admin/agenda?error=No%20se%20encontró%20la%20actividad');
 const key=String(event.automation_key||'')
 if(key.endsWith(':consulate-status')) redirect('/admin/agenda?error=Registra%20el%20resultado%20consular')
 const pickup=event.process_id && key.endsWith(':visa-pickup-pending')
 if(event.status!=='Pendiente') redirect(returnTo+(returnTo.includes('?')?'&':'?')+'updated=1')
 if(!pickup){
   const {error}=await c.supabase.from('agenda_events').update({status:'Realizado'}).eq('id',id).eq('organization_id',c.organizationId);
   if(error) redirect('/admin/agenda?error='+encodeURIComponent(error.message));
 }

 // Si se confirma la recolección de una visa, el trámite queda concluido y
 // cualquier otra alerta pendiente del mismo expediente se depura.
 if(pickup){
   const now=new Date().toISOString()
   const {data:process,error:readError}=await c.supabase.from('processes').select('id,status,result_status').eq('id',event.process_id).eq('organization_id',c.organizationId).single()
   if(readError||!process||!['Aprobada','Concluido'].includes(process.status)&&process.result_status!=='Aprobada') redirect('/admin/agenda?error=No%20hay%20una%20visa%20aprobada%20para%20entregar')
   if(['Cancelado','Rechazada'].includes(process.status)) redirect('/admin/agenda?error=El%20trámite%20ya%20no%20está%20activo')
   const {data:steps,error:stepsError}=await c.supabase.from('process_steps').select('id,step_name,status').eq('process_id',event.process_id).eq('organization_id',c.organizationId)
   if(stepsError) redirect('/admin/agenda?error='+encodeURIComponent(stepsError.message))
   const ids=(steps??[]).filter(s=>s.status!=='Completado'&&/entrega|recolecci[oó]n|recoger|tr[aá]mite concluido/i.test(s.step_name)).map(s=>s.id)
   if(ids.length){
     const {error}=await c.supabase.from('process_steps').update({status:'Completado',completed_at:now,completed_by:c.userId}).eq('organization_id',c.organizationId).eq('process_id',event.process_id).in('id',ids)
     if(error) redirect('/admin/agenda?error='+encodeURIComponent(error.message))
   }
   const {error:processError}=await c.supabase.from('processes').update({status:'Concluido',current_stage:'Concluido',closed_at:now,last_movement_at:now,operational_status:'En orden'}).eq('id',event.process_id).eq('organization_id',c.organizationId)
   if(processError) redirect('/admin/agenda?error='+encodeURIComponent(processError.message))
   const {error:agendaError}=await c.supabase.from('agenda_events').update({status:'Realizado'}).eq('process_id',event.process_id).eq('organization_id',c.organizationId).eq('status','Pendiente').in('automation_key',['visa-pickup-pending','consulate-status','consulate-reminder','cas-reminder','interview-preparation','renewal-status-20','renewal-visa-arrival-20','assigned-priority','h-status-2','h-status-10'].map(k=>event.process_id+':'+k))
   if(agendaError) redirect('/admin/agenda?error='+encodeURIComponent(agendaError.message))
   await c.supabase.from('activity_log').insert({organization_id:c.organizationId,actor_id:c.userId,entity_type:'process',entity_id:event.process_id,action:'completed_after_pickup',description:'Trámite concluido al confirmar la recolección/recepción de la visa.'})
 }

 revalidatePath('/admin'); revalidatePath('/admin/agenda'); revalidatePath('/admin/tramites');
 if(event.process_id) revalidatePath('/admin/tramites/'+event.process_id)
 redirect(returnTo+(returnTo.includes('?')?'&':'?')+'updated=1');
}

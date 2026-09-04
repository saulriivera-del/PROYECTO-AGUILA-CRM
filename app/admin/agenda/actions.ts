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
 const {data:event,error:lookupError}=await c.supabase.from('agenda_events').select('id, process_id, automation_key').eq('id',id).eq('organization_id',c.organizationId).single();
 if(lookupError||!event) redirect('/admin/agenda?error=No%20se%20encontró%20la%20actividad');
 const {error}=await c.supabase.from('agenda_events').update({status:'Realizado'}).eq('id',id).eq('organization_id',c.organizationId);
 if(error) redirect('/admin/agenda?error='+encodeURIComponent(error.message));

 // Si se confirma la recolección de una visa, el trámite queda concluido y
 // cualquier otra alerta pendiente del mismo expediente se depura.
 if(event.process_id && String(event.automation_key||'').endsWith(':visa-pickup-pending')){
   const now=new Date().toISOString()
   await c.supabase.from('processes').update({status:'Concluido',current_stage:'Concluido',closed_at:now,last_movement_at:now,operational_status:'En orden'}).eq('id',event.process_id).eq('organization_id',c.organizationId)
   await c.supabase.from('agenda_events').update({status:'Realizado'}).eq('process_id',event.process_id).eq('organization_id',c.organizationId).eq('status','Pendiente')
   await c.supabase.from('activity_log').insert({organization_id:c.organizationId,actor_id:c.userId,entity_type:'process',entity_id:event.process_id,action:'completed_after_pickup',description:'Trámite concluido al confirmar la recolección/recepción de la visa.'})
 }

 revalidatePath('/admin'); revalidatePath('/admin/agenda'); revalidatePath('/admin/tramites');
 if(event.process_id) revalidatePath('/admin/tramites/'+event.process_id)
 redirect(returnTo+(returnTo.includes('?')?'&':'?')+'updated=1');
}

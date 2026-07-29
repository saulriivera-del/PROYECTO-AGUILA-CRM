'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
const v=(f:FormData,n:string)=>String(f.get(n)??'').trim()
export async function createAgendaEvent(f:FormData){
 const c=await requireAuthContext(); const title=v(f,'title'), starts=v(f,'starts_at'), scope=v(f,'assignment_scope')||'General', assigned=v(f,'assigned_to')||null;
 if(!title||!starts) redirect('/admin/agenda?error=Completa%20título%20y%20fecha');
 if(scope==='Específico'&&!assigned) redirect('/admin/agenda?error=Selecciona%20un%20responsable');
 const {error}=await c.supabase.from('agenda_events').insert({organization_id:c.organizationId,title,event_type:v(f,'event_type')||'Tarea',description:v(f,'description')||null,starts_at:starts,ends_at:v(f,'ends_at')||null,assignment_scope:scope,assigned_to:scope==='Específico'?assigned:null,status:'Pendiente',created_by:c.userId});
 if(error) redirect('/admin/agenda?error='+encodeURIComponent(error.message)); revalidatePath('/admin'); revalidatePath('/admin/agenda'); redirect('/admin/agenda?created=1');
}
export async function completeAgendaEvent(f:FormData){
 const c=await requireAuthContext(); const id=v(f,'event_id'); const returnTo=v(f,'return_to')||'/admin/agenda'; const {error}=await c.supabase.from('agenda_events').update({status:'Realizado'}).eq('id',id).eq('organization_id',c.organizationId);
 if(error) redirect('/admin/agenda?error='+encodeURIComponent(error.message)); revalidatePath('/admin'); revalidatePath('/admin/agenda'); redirect(returnTo+(returnTo.includes('?')?'&':'?')+'updated=1');
}

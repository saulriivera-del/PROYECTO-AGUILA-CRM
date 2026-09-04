'use server'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {requireAuthContext} from '@/lib/auth-context'
const v=(f:FormData,n:string)=>String(f.get(n)??'').trim()
export async function registerPayment(f:FormData){
 const c=await requireAuthContext(),processId=v(f,'process_id'),amount=Number(v(f,'amount')||0)
 if(!processId||amount<=0)redirect('/admin/cobranza?error=Captura%20un%20monto%20válido')
 const{data:payment,error}=await c.supabase.from('payments').insert({organization_id:c.organizationId,process_id:processId,amount,payment_method:v(f,'payment_method')||'Efectivo',reference:v(f,'reference')||null,notes:v(f,'notes')||null,recorded_by:c.userId}).select('id').single()
 if(error||!payment)redirect('/admin/cobranza?error='+encodeURIComponent(error?.message||'No se pudo registrar el pago'))
 revalidatePath('/admin');revalidatePath('/admin/cobranza');revalidatePath('/admin/tramites/'+processId)
 redirect(`/admin/cobranza?created=1&payment=${payment.id}`)
}

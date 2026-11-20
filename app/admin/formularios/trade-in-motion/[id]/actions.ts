'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'

export async function markReview(formData: FormData) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') redirect('/admin')
  const id = String(formData.get('id') ?? '')
  if (!/^[a-f0-9-]{36}$/i.test(id)) return
  const admin = createAdminClient()
  const { data: draft } = await admin.from('vm_trade_in_motion_drafts')
    .select('submission_id, status')
    .eq('id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (draft?.status !== 'Enviado') return
  const { error } = await admin.from('vm_form_submissions')
    .update({ status: 'En revisión' })
    .eq('submission_id', draft.submission_id).eq('organization_id', context.organizationId)
  if (error) throw new Error('No se pudo actualizar el estado del expediente')
  revalidatePath('/admin/formularios/trade-in-motion')
  revalidatePath('/admin/formularios/trade-in-motion/' + id)
}

export async function markFolioReview(formData: FormData) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') redirect('/admin')
  const id = String(formData.get('id') ?? '')
  if (!/^[a-f0-9-]{36}$/i.test(id)) return
  const admin = createAdminClient()
  const { error } = await admin.from('vm_trade_in_motion_drafts')
    .update({ reviewed_at: new Date().toISOString() })
    .eq('id',id).eq('organization_id',context.organizationId)
    .not('access_id','is',null).eq('status','Enviado')
  if (error) throw new Error('No se pudo marcar en revisión')
  revalidatePath('/admin/formularios/trade-in-motion')
  revalidatePath('/admin/formularios/trade-in-motion/' + id)
}

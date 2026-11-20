'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'

function canManage(role: string) {
  return isAdministrator(role) || role === 'reception'
}
export async function inviteCandidate(formData: FormData) {
  const context = await requireAuthContext()
  if (!canManage(context.role)) redirect('/admin')
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim().slice(0, 180)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 250) {
    redirect('/admin/formularios/trade-in-motion?invite_error=correo')
  }
  const admin = createAdminClient()
  const { data: company, error: companyError } = await admin.from('companies')
    .select('id').eq('slug', 'trade-in-motion').eq('is_active', true).single()
  if (companyError || !company) throw new Error('Empresa Trade in Motion no encontrada')
  const { error } = await admin.from('vm_trade_in_motion_invites').upsert({
    company_id: company.id, organization_id: context.organizationId,
    applicant_email: email, applicant_name: name || null, invited_by: context.userId,
    is_active: true, updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id,applicant_email' })
  if (error) throw new Error('No se pudo autorizar el correo del candidato')
  revalidatePath('/admin/formularios/trade-in-motion')
  redirect('/admin/formularios/trade-in-motion?invited=1')
}

export async function revokeInvite(formData: FormData) {
  const context = await requireAuthContext()
  if (!canManage(context.role)) redirect('/admin')
  const inviteId = String(formData.get('id') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return
  const admin = createAdminClient()
  const { error } = await admin.from('vm_trade_in_motion_invites')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', inviteId).eq('organization_id', context.organizationId)
  if (error) throw new Error('No se pudo desactivar la invitación')
  revalidatePath('/admin/formularios/trade-in-motion')
}

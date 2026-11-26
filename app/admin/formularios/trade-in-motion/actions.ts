'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashCandidateKey, newCandidateKey, newFolio } from '@/lib/trade-in-motion-folio'

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

/** La clave se entrega UNA vez al operador, sin guardarla en claro ni enviarla por correo. */
export async function createFolioAccess(nameInput: string) {
  const context = await requireAuthContext()
  if (!canManage(context.role)) return { error: 'No tienes permiso para generar accesos.' }
  const name = String(nameInput || '').trim().replace(/\\s+/g,' ').slice(0,180)
  if (name.length < 2) return { error: 'Escribe el nombre del candidato.' }
  const admin = createAdminClient()
  const { data: company, error: companyError } = await admin.from('companies')
    .select('id').eq('slug','trade-in-motion').eq('is_active',true).maybeSingle()
  if (companyError || !company) return { error: 'No se encontró la empresa Trade in Motion.' }
  const key = newCandidateKey()
  const keyHash = hashCandidateKey(key)
  for (let attempt = 0; attempt < 12; attempt++) {
    const folio = newFolio()
    const { error } = await admin.from('vm_trade_in_motion_access').insert({
      organization_id: context.organizationId, company_id:company.id,
      folio, key_hash:keyHash, applicant_name:name, created_by:context.userId,
    })
    if (!error) {
      revalidatePath('/admin/formularios/trade-in-motion')
      return { folio, key }
    }
    if (error.code !== '23505') break
  }
  return { error: 'No se pudo generar el acceso. Intenta de nuevo.' }
}

export async function revokeFolioAccess(formData: FormData) {
  const context = await requireAuthContext()
  if (!canManage(context.role)) redirect('/admin')
  const id = String(formData.get('id') || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return
  const admin = createAdminClient()
  const { error } = await admin.from('vm_trade_in_motion_access')
    .update({is_active:false,updated_at:new Date().toISOString()})
    .eq('id',id).eq('organization_id',context.organizationId)
  if (error) throw new Error('No se pudo revocar el acceso')
  revalidatePath('/admin/formularios/trade-in-motion')
}

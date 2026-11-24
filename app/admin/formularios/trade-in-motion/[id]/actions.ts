'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { personalDigest, personalProblems } from '@/lib/ds160-personal-transfer'

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

/**
 * Autorización humana independiente de "En revisión". No aprueba ninguna
 * solicitud oficial; habilita exclusivamente la transferencia personal.
 */
export async function approveDs160Personal(formData: FormData) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') redirect('/admin')
  const id = String(formData.get('id') ?? '')
  if (!/^[a-f0-9-]{36}$/i.test(id) || formData.get('confirmed_documents') !== 'yes')
    throw new Error('Confirma que contrastaste los datos personales con los documentos.')
  const admin = createAdminClient()
  const { data: draft, error: readError } = await admin.from('vm_trade_in_motion_drafts')
    .select('id,status,consent_at,answers')
    .eq('id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (readError || !draft || draft.status !== 'Enviado' || !draft.consent_at)
    throw new Error('Solo pueden autorizarse expedientes recibidos con consentimiento.')
  const { data: correction, error: correctionError } = await admin.from('vm_ds160_corrections')
    .select('answers,updated_at').eq('draft_id',id).eq('organization_id',context.organizationId).maybeSingle()
  if (correctionError) throw new Error('No se pudo verificar la versión corregida.')
  const effectiveAnswers = correction?.answers ?? draft.answers
  const problems = personalProblems(effectiveAnswers)
  if (problems.length)
    throw new Error('Faltan datos personales por corregir; no se puede autorizar todavía.')
  const now = new Date().toISOString()
  const { error } = await admin.from('vm_trade_in_motion_drafts')
    .update({
      reviewed_at: now,
      ds160_personal_approved_at: now,
      ds160_personal_approved_by: context.userId,
      ds160_personal_approved_digest: personalDigest(effectiveAnswers),
    })
    .eq('id', id).eq('organization_id', context.organizationId).eq('status', 'Enviado')
  if (error) throw new Error('No se pudo guardar la autorización. Verifica que se aplicó la migración.')
  revalidatePath('/admin/formularios/trade-in-motion')
  revalidatePath('/admin/formularios/trade-in-motion/' + id)
}

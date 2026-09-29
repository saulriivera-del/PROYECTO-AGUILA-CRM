'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim()
}

function boolValue(formData: FormData, name: string) {
  return formData.get(name) === 'on'
}

function redirectOk(processId: string, flag: string) {
  revalidatePath(`/admin/tramites/${processId}`)
  revalidatePath(`/admin/tramites/${processId}/portal`)
  revalidatePath('/admin/tramites')
  redirect(`/admin/tramites/${processId}/portal?${flag}=1`)
}

export async function saveCorporatePortalSettings(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const processId = value(formData, 'process_id')
  const visible = boolValue(formData, 'portal_visibility')
  const requiresAction = boolValue(formData, 'requires_client_action')
  const countRaw = value(formData, 'portal_applicant_count')
  const applicantCount = countRaw ? Number(countRaw) : null

  const payload = {
    portal_visibility: visible,
    public_status: value(formData, 'public_status') || null,
    public_status_label: value(formData, 'public_status_label') || null,
    public_note: value(formData, 'public_note') || null,
    public_next_step: value(formData, 'public_next_step') || null,
    requires_client_action: requiresAction,
    client_action_note: requiresAction
      ? value(formData, 'client_action_note') || null
      : null,
    portal_group_label: value(formData, 'portal_group_label') || null,
    portal_applicant_count:
      applicantCount && applicantCount >= 1 ? applicantCount : null,
    portal_last_updated_at: new Date().toISOString(),
    portal_published_at: visible ? new Date().toISOString() : null,
    portal_published_by: context.userId,
  }

  const { error } = await context.supabase
    .from('processes')
    .update(payload)
    .eq('id', processId)
    .eq('organization_id', context.organizationId)

  if (error) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: processId,
    action: 'corporate_portal_settings_updated',
    description: 'Información pública del Portal Empresarial actualizada.',
  })

  redirectOk(processId, 'saved')
}

export async function publishCorporatePortalUpdate(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const processId = value(formData, 'process_id')
  const title = value(formData, 'title')
  const description = value(formData, 'description')

  if (!title || !description) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('Captura título y descripción de la actualización')}`)
  }

  const { error } = await context.supabase
    .from('corporate_portal_manual_updates')
    .insert({
      organization_id: context.organizationId,
      process_id: processId,
      title,
      description,
      visible_to_company: true,
      created_by: context.userId,
    })

  if (error) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase
    .from('processes')
    .update({
      portal_last_updated_at: new Date().toISOString(),
      portal_published_at: new Date().toISOString(),
      portal_published_by: context.userId,
    })
    .eq('id', processId)
    .eq('organization_id', context.organizationId)

  redirectOk(processId, 'update_published')
}

export async function addCorporatePortalDocument(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const processId = value(formData, 'process_id')
  const title = value(formData, 'title')
  const externalUrl = value(formData, 'external_url')
  const description = value(formData, 'description')
  const documentType = value(formData, 'document_type') || 'Documento'

  if (!title || !externalUrl) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('Captura nombre y enlace del documento')}`)
  }

  let parsed: URL
  try {
    parsed = new URL(externalUrl)
  } catch {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('El enlace del documento no es válido')}`)
  }

  if (!['https:', 'http:'].includes(parsed!.protocol)) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('El enlace debe iniciar con https:// o http://')}`)
  }

  const { error } = await context.supabase
    .from('corporate_portal_documents')
    .insert({
      organization_id: context.organizationId,
      process_id: processId,
      title,
      description: description || null,
      document_type: documentType,
      external_url: externalUrl,
      visible_to_company: true,
      created_by: context.userId,
    })

  if (error) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase
    .from('processes')
    .update({
      portal_last_updated_at: new Date().toISOString(),
      portal_published_at: new Date().toISOString(),
      portal_published_by: context.userId,
    })
    .eq('id', processId)
    .eq('organization_id', context.organizationId)

  redirectOk(processId, 'document_added')
}

export async function removeCorporatePortalDocument(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const processId = value(formData, 'process_id')
  const documentId = value(formData, 'document_id')

  const { error } = await context.supabase
    .from('corporate_portal_documents')
    .delete()
    .eq('id', documentId)
    .eq('process_id', processId)
    .eq('organization_id', context.organizationId)

  if (error) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(error.message)}`)
  }

  redirectOk(processId, 'document_removed')
}

export async function removeCorporatePortalUpdate(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const processId = value(formData, 'process_id')
  const updateId = value(formData, 'update_id')

  const { error } = await context.supabase
    .from('corporate_portal_manual_updates')
    .delete()
    .eq('id', updateId)
    .eq('process_id', processId)
    .eq('organization_id', context.organizationId)

  if (error) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(error.message)}`)
  }

  redirectOk(processId, 'update_removed')
}

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

export async function saveCorporateCompanyLink(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const processId = value(formData, 'process_id')
  const companyId = value(formData, 'company_id')
  const externalReference = value(formData, 'external_reference') || null

  if (!companyId) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('Selecciona una empresa')}`)
  }

  const { data: company, error: companyError } = await context.supabase
    .from('companies')
    .select('id, name, legal_name, is_active')
    .eq('id', companyId)
    .eq('is_active', true)
    .single()

  if (companyError || !company) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('La empresa seleccionada no está disponible')}`)
  }

  const { error: deleteError } = await context.supabase
    .from('process_company_links')
    .delete()
    .eq('process_id', processId)

  if (deleteError) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(deleteError.message)}`)
  }

  const { error: insertError } = await context.supabase
    .from('process_company_links')
    .insert({
      process_id: processId,
      company_id: companyId,
      visible_in_portal: true,
      external_reference: externalReference,
    })

  if (insertError) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(insertError.message)}`)
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: processId,
    action: 'corporate_company_linked',
    description: `Trámite vinculado a empresa: ${company.legal_name || company.name}`,
    metadata: { company_id: companyId, external_reference: externalReference },
  })

  redirectOk(processId, 'company_linked')
}

export async function unlinkCorporateCompany(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const processId = value(formData, 'process_id')

  const { error } = await context.supabase
    .from('process_company_links')
    .delete()
    .eq('process_id', processId)

  if (error) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase
    .from('processes')
    .update({
      portal_visibility: false,
      portal_last_updated_at: new Date().toISOString(),
    })
    .eq('id', processId)
    .eq('organization_id', context.organizationId)

  redirectOk(processId, 'company_unlinked')
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
    client_action_note: requiresAction ? value(formData, 'client_action_note') || null : null,
    portal_group_label: value(formData, 'portal_group_label') || null,
    portal_applicant_count: applicantCount && applicantCount >= 1 ? applicantCount : null,
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

  redirectOk(processId, 'saved')
}

export async function publishCorporatePortalUpdate(formData: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)
  const processId = value(formData, 'process_id')
  const title = value(formData, 'title')
  const description = value(formData, 'description')

  if (!title || !description) {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('Captura título y descripción')}`)
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
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('Captura nombre y enlace')}`)
  }

  try {
    const parsed = new URL(externalUrl)
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('bad')
  } catch {
    redirect(`/admin/tramites/${processId}/portal?error=${encodeURIComponent('El enlace no es válido')}`)
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

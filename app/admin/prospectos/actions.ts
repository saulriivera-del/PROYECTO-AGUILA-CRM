'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim()
}

export async function createProspect(formData: FormData) {
  const context = await requireAuthContext()
  const fullName = value(formData, 'full_name')
  const phone = value(formData, 'phone')
  const serviceInterest = value(formData, 'service_interest')

  if (!fullName || !phone || !serviceInterest) {
    redirect('/admin/prospectos?error=Completa%20nombre%2C%20teléfono%20y%20servicio')
  }

  const { data, error } = await context.supabase
    .from('prospects')
    .insert({
      organization_id: context.organizationId,
      full_name: fullName,
      phone,
      whatsapp: value(formData, 'whatsapp') || phone,
      email: value(formData, 'email') || null,
      city: value(formData, 'city') || 'Hermosillo',
      state: value(formData, 'state') || 'Sonora',
      country: 'México',
      service_interest: serviceInterest,
      origin: value(formData, 'origin') || 'Oficina',
      temperature: value(formData, 'temperature') || 'Seguimiento',
      quoted_amount: Number(value(formData, 'quoted_amount') || 0),
      internal_appointment_at: value(formData, 'internal_appointment_at') || null,
      next_followup_at: value(formData, 'next_followup_at') || null,
      notes: value(formData, 'notes') || null,
      assigned_to: context.userId,
      created_by: context.userId,
    })
    .select('id')
    .single()

  if (error) {
    redirect(`/admin/prospectos?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'prospect',
    entity_id: data.id,
    action: 'created',
    description: `Prospecto creado: ${fullName}`,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/prospectos')
  redirect('/admin/prospectos?created=1')
}

export async function convertProspect(formData: FormData) {
  const context = await requireAuthContext()
  const prospectId = value(formData, 'prospect_id')

  const { data: prospect, error: prospectError } = await context.supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('organization_id', context.organizationId)
    .single()

  if (prospectError || !prospect) {
    redirect('/admin/prospectos?error=No%20se%20encontró%20el%20prospecto')
  }

  if (prospect.converted_client_id) {
    redirect('/admin/prospectos?error=Este%20prospecto%20ya%20fue%20convertido')
  }

  const { data: client, error: clientError } = await context.supabase
    .from('clients')
    .insert({
      organization_id: context.organizationId,
      full_name: prospect.full_name,
      phone: prospect.phone,
      whatsapp: prospect.whatsapp,
      email: prospect.email,
      city: prospect.city,
      state: prospect.state,
      country: prospect.country,
      origin: prospect.origin,
      notes: prospect.notes,
      assigned_to: prospect.assigned_to ?? context.userId,
      created_by: context.userId,
    })
    .select('id')
    .single()

  if (clientError) {
    redirect(`/admin/prospectos?error=${encodeURIComponent(clientError.message)}`)
  }

  await context.supabase
    .from('prospects')
    .update({
      status: 'Convertido',
      converted_client_id: client.id,
    })
    .eq('id', prospect.id)

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'client',
    entity_id: client.id,
    action: 'prospect_converted',
    description: `${prospect.full_name} fue convertido en cliente`,
    metadata: { prospect_id: prospect.id },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/prospectos')
  revalidatePath('/admin/clientes')
  redirect('/admin/clientes?converted=1')
}

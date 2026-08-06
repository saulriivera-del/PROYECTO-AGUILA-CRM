'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim()
}

function normalizedPhone(raw: string) {
  return raw.replace(/\D/g, '')
}

export async function createProspect(formData: FormData) {
  const context = await requireAuthContext()
  const fullName = value(formData, 'full_name')
  const phone = normalizedPhone(value(formData, 'phone'))
  const serviceInterest = value(formData, 'service_interest')

  if (!fullName || !phone || !serviceInterest) {
    redirect('/admin/prospectos?error=Completa%20nombre%2C%20teléfono%20y%20servicio')
  }

  const { data: existing } = await context.supabase
    .from('prospects')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('phone', phone)
    .eq('service_interest', serviceInterest)
    .in('status', ['Activo', 'Pausado'])
    .limit(1)

  if (existing?.length) {
    redirect('/admin/prospectos?error=Ya%20existe%20un%20prospecto%20activo%20con%20ese%20teléfono%20y%20servicio')
  }

  const { data, error } = await context.supabase
    .from('prospects')
    .insert({
      organization_id: context.organizationId,
      full_name: fullName,
      phone,
      whatsapp: phone,
      email: value(formData, 'email') || null,
      city: value(formData, 'city') || 'Hermosillo',
      state: value(formData, 'state') || 'Sonora',
      country: 'México',
      service_interest: serviceInterest,
      origin: value(formData, 'origin') || 'WhatsApp',
      temperature: value(formData, 'temperature') || 'Seguimiento',
      quoted_amount: Number(value(formData, 'quoted_amount') || 0),
      internal_appointment_at: value(formData, 'internal_appointment_at') || null,
      next_followup_at: value(formData, 'next_followup_at') || null,
      notes: value(formData, 'notes') || null,
      last_followup_at: new Date().toISOString(),
      followup_status: 'Pendiente',
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

  if (!prospectId) {
    redirect('/admin/prospectos?error=No%20se%20recibió%20el%20prospecto')
  }

  const { data: clientId, error } = await context.supabase.rpc(
    'convert_prospect_to_client',
    { p_prospect_id: prospectId },
  )

  if (error || !clientId) {
    redirect(
      `/admin/prospectos?error=${encodeURIComponent(
        error?.message ?? 'No fue posible crear el cliente',
      )}`,
    )
  }

  revalidatePath('/admin')
  revalidatePath('/admin/prospectos')
  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${clientId}`)

  // Abre inmediatamente el expediente creado o reutilizado.
  redirect(`/admin/clientes/${clientId}?converted=1`)
}

export async function closeProspect(formData: FormData) {
  const context = await requireAuthContext()
  const prospectId = value(formData, 'prospect_id')
  const reason = value(formData, 'loss_reason')

  if (!prospectId || !reason) {
    redirect('/admin/prospectos?error=Selecciona%20un%20motivo')
  }

  const { error } = await context.supabase
    .from('prospects')
    .update({
      status: 'Perdido',
      notes: `Motivo de cierre: ${reason}`,
    })
    .eq('id', prospectId)
    .eq('organization_id', context.organizationId)

  if (error) {
    redirect(`/admin/prospectos?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'prospect',
    entity_id: prospectId,
    action: 'closed',
    description: `Prospecto cerrado: ${reason}`,
    metadata: { reason },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/prospectos')
  redirect('/admin/prospectos?closed=1')
}

export async function reactivateProspect(formData: FormData) {
  const context = await requireAuthContext()
  const prospectId = value(formData, 'prospect_id')

  const { error } = await context.supabase
    .from('prospects')
    .update({
      status: 'Activo',
      next_followup_at: new Date().toISOString(),
    })
    .eq('id', prospectId)
    .eq('organization_id', context.organizationId)

  if (error) {
    redirect(`/admin/prospectos?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'prospect',
    entity_id: prospectId,
    action: 'reactivated',
    description: 'Prospecto reactivado',
  })

  revalidatePath('/admin')
  revalidatePath('/admin/prospectos')
  redirect('/admin/prospectos?reactivated=1')
}


export async function addProspectFollowup(formData: FormData) {
  const context = await requireAuthContext()
  const prospectId = value(formData, 'prospect_id')
  const note = value(formData, 'note')
  const outcome = value(formData, 'outcome') || 'Seguimiento'
  const nextFollowupAt = value(formData, 'next_followup_at') || null

  if (!prospectId || !note) {
    redirect(`/admin/prospectos/${prospectId}?error=Escribe%20la%20anotación`)
  }

  const now = new Date().toISOString()
  const { error } = await context.supabase.from('prospect_followups').insert({
    organization_id: context.organizationId,
    prospect_id: prospectId,
    note,
    outcome,
    next_followup_at: nextFollowupAt,
    created_by: context.userId,
  })
  if (error) redirect(`/admin/prospectos/${prospectId}?error=${encodeURIComponent(error.message)}`)

  const { error: updateError } = await context.supabase.from('prospects').update({
    last_followup_at: now,
    next_followup_at: nextFollowupAt,
    followup_status: nextFollowupAt ? 'Programado' : 'Pendiente',
    notes: note,
  }).eq('id', prospectId).eq('organization_id', context.organizationId)
  if (updateError) redirect(`/admin/prospectos/${prospectId}?error=${encodeURIComponent(updateError.message)}`)

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'prospect',
    entity_id: prospectId,
    action: 'followup_added',
    description: `Seguimiento de prospecto: ${outcome}`,
    metadata: { note, next_followup_at: nextFollowupAt },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/prospectos')
  revalidatePath(`/admin/prospectos/${prospectId}`)
  redirect(`/admin/prospectos/${prospectId}?followup=1`)
}

export async function rescheduleProspect(formData: FormData) {
  const context = await requireAuthContext()
  const prospectId = value(formData, 'prospect_id')
  const nextFollowupAt = value(formData, 'next_followup_at')
  if (!prospectId || !nextFollowupAt) redirect(`/admin/prospectos/${prospectId}?error=Selecciona%20una%20fecha`)

  const { error } = await context.supabase.from('prospects').update({
    next_followup_at: nextFollowupAt,
    followup_status: 'Programado',
  }).eq('id', prospectId).eq('organization_id', context.organizationId)
  if (error) redirect(`/admin/prospectos/${prospectId}?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/admin')
  revalidatePath('/admin/prospectos')
  revalidatePath(`/admin/prospectos/${prospectId}`)
  redirect(`/admin/prospectos/${prospectId}?rescheduled=1`)
}

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

export async function createClient(formData: FormData) {
  const context = await requireAuthContext()
  const fullName = value(formData, 'full_name')
  const phone = normalizedPhone(value(formData, 'phone'))

  if (!fullName || !phone) {
    redirect('/admin/clientes?error=Completa%20nombre%20y%20teléfono')
  }

  const { data: existing } = await context.supabase
    .from('clients')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('phone', phone)
    .limit(1)

  if (existing?.length) {
    redirect('/admin/clientes?error=Ya%20existe%20un%20cliente%20con%20ese%20teléfono')
  }

  const { data, error } = await context.supabase
    .from('clients')
    .insert({
      organization_id: context.organizationId,
      full_name: fullName,
      paternal_surname: value(formData, 'paternal_surname') || null,
      maternal_surname: value(formData, 'maternal_surname') || null,
      birth_date: value(formData, 'birth_date') || null,
      curp: null,
      phone,
      whatsapp: phone,
      email: value(formData, 'email') || null,
      city: value(formData, 'city') || 'Hermosillo',
      state: value(formData, 'state') || 'Sonora',
      country: 'México',
      origin: value(formData, 'origin') || 'Oficina',
      notes: value(formData, 'notes') || null,
      assigned_to: context.userId,
      created_by: context.userId,
    })
    .select('id')
    .single()

  if (error) redirect(`/admin/clientes?error=${encodeURIComponent(error.message)}`)

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'client',
    entity_id: data.id,
    action: 'created',
    description: `Cliente creado: ${fullName}`,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/clientes')
  redirect('/admin/clientes?created=1')
}

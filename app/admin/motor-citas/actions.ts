'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'

const PATH = '/admin/motor-citas'

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key))
  return Number.isFinite(value) ? value : fallback
}

function upperList(value: string) {
  return [...new Set(
    value
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  )]
}

function optionalDate(value: string) {
  return value || null
}

function optionalTime(value: string) {
  return value || null
}

export async function updateBookingConfig(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const id = numberValue(formData, 'booking_config_id')
  if (!id) redirect(`${PATH}?error=Configuración inválida`)

  const allowAnyTime = formData.get('allow_any_time') === 'on'
  const enabled = formData.get('enabled') === 'on'
  const autoVerify = formData.get('auto_verify_enabled') === 'on'
  const searchMode = text(formData, 'search_mode') || 'INTELLIGENT'

  const payload: any = {
    enabled,
    search_mode: searchMode,
    auto_verify_enabled: autoVerify,
    auto_confirm_enabled: false,
    acceptable_date_from: optionalDate(text(formData, 'acceptable_date_from')),
    acceptable_date_to: optionalDate(text(formData, 'acceptable_date_to')),
    minimum_improvement_days: Math.max(0, numberValue(formData, 'minimum_improvement_days', 1)),
    minimum_travel_notice_days: Math.max(0, numberValue(formData, 'minimum_travel_notice_days', 1)),
    allowed_consulates: upperList(text(formData, 'allowed_consulates')),
    allowed_cas_locations: upperList(text(formData, 'allowed_cas_locations')),
    cas_min_days_before: Math.max(0, numberValue(formData, 'cas_min_days_before', 3)),
    cas_max_days_before: Math.max(0, numberValue(formData, 'cas_max_days_before', 10)),
    allow_any_time: allowAnyTime,
    allowed_time_from: allowAnyTime ? null : optionalTime(text(formData, 'allowed_time_from')),
    allowed_time_to: allowAnyTime ? null : optionalTime(text(formData, 'allowed_time_to')),
    selection_policy: text(formData, 'selection_policy') || 'EARLIEST_DATE',
    operational_status: text(formData, 'operational_status') || 'ACTIVE',
    notes: text(formData, 'notes') || null,
    intelligent_notifier_enabled: searchMode === 'INTELLIGENT',
    intelligent_standard_enabled: searchMode === 'INTELLIGENT',
    intensive_interval_seconds:
      searchMode === 'INTENSIVE'
        ? Math.max(15, numberValue(formData, 'intensive_interval_seconds', 15))
        : null,
    updated_at: new Date().toISOString(),
  }

  if (payload.cas_max_days_before < payload.cas_min_days_before) {
    redirect(`${PATH}?error=El máximo de días CAS no puede ser menor al mínimo`)
  }

  if (!payload.allowed_consulates.length) {
    redirect(`${PATH}?error=Selecciona al menos un consulado permitido`)
  }

  if (!payload.allowed_cas_locations.length) {
    redirect(`${PATH}?error=Selecciona al menos un CAS permitido`)
  }

  const { error } = await supabase
    .from('vm_booking_configs')
    .update(payload)
    .eq('id', id)

  if (error) redirect(`${PATH}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(PATH)
  redirect(`${PATH}?updated=1`)
}

export async function toggleBookingConfig(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const id = numberValue(formData, 'booking_config_id')
  const next = text(formData, 'next_status')

  const payload =
    next === 'PAUSED'
      ? { operational_status: 'PAUSED', enabled: true, updated_at: new Date().toISOString() }
      : { operational_status: 'ACTIVE', enabled: true, updated_at: new Date().toISOString() }

  const { error } = await supabase.from('vm_booking_configs').update(payload).eq('id', id)
  if (error) redirect(`${PATH}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(PATH)
  redirect(`${PATH}?updated=1`)
}

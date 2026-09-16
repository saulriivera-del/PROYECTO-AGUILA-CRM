'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'
import { encryptVisaCredential } from '@/lib/visa-master-credentials'

const PATH = '/admin/motor-citas'

function rethrowNextRedirect(error: any) {
  const digest = String(error?.digest || '')
  const message = String(error?.message || '')

  if (
    digest.startsWith('NEXT_REDIRECT') ||
    message === 'NEXT_REDIRECT'
  ) {
    throw error
  }
}

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

async function queueAccountSync(
  supabase: ReturnType<typeof getVisaMasterAdminClient>,
  accountId: number,
  jobType: 'VALIDATE_AND_SYNC' | 'SYNC' | 'VALIDATE_CREDENTIALS',
) {
  const { data: pending } = await supabase
    .from('vm_ais_account_sync_jobs')
    .select('id')
    .eq('account_id', accountId)
    .in('status', ['PENDING', 'RUNNING'])
    .limit(1)

  if (pending?.length) return pending[0].id

  const { data, error } = await supabase
    .from('vm_ais_account_sync_jobs')
    .insert({
      account_id: accountId,
      job_type: jobType,
      status: 'PENDING',
      requested_from: 'WEB',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

async function saveEncryptedPassword(
  supabase: ReturnType<typeof getVisaMasterAdminClient>,
  accountId: number,
  password: string,
) {
  const encrypted = encryptVisaCredential(password)

  const { error } = await supabase
    .from('vm_ais_account_credentials')
    .upsert({
      account_id: accountId,
      encrypted_password: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      key_version: 1,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'account_id',
    })

  if (error) throw new Error(error.message)
}

async function ensureBookingConfig(
  supabase: ReturnType<typeof getVisaMasterAdminClient>,
  clientId: number,
  accountId: number,
  targetId: number,
) {
  const { data: existing, error: existingError } = await supabase
    .from('vm_booking_configs')
    .select('id')
    .eq('client_id', clientId)
    .eq('account_id', accountId)
    .limit(1)

  if (existingError) throw new Error(existingError.message)

  if (existing?.length) {
    const { error } = await supabase
      .from('vm_booking_configs')
      .update({
        ais_target_id: targetId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id)

    if (error) throw new Error(error.message)
    return existing[0].id
  }

  const { data, error } = await supabase
    .from('vm_booking_configs')
    .insert({
      client_id: clientId,
      account_id: accountId,
      ais_target_id: targetId,
      enabled: true,
      search_mode: 'INTELLIGENT',
      auto_verify_enabled: true,
      auto_confirm_enabled: false,
      minimum_improvement_days: 1,
      minimum_travel_notice_days: 1,
      allowed_consulates: ['HERMOSILLO'],
      allowed_cas_locations: ['HERMOSILLO'],
      cas_min_days_before: 3,
      cas_max_days_before: 10,
      allow_any_time: true,
      selection_policy: 'EARLIEST_DATE',
      operational_status: 'PAUSED',
      intelligent_notifier_enabled: true,
      intelligent_standard_enabled: true,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

export async function addAisAccount(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const email = text(formData, 'account_email').toLowerCase()
  const password = text(formData, 'password')
  const displayName = text(formData, 'display_name') || null

  if (!email || !email.includes('@')) {
    redirect(`${PATH}?error=${encodeURIComponent('Captura un correo AIS válido.')}`)
  }

  if (!password) {
    redirect(`${PATH}?error=${encodeURIComponent('La contraseña AIS es obligatoria.')}`)
  }

  try {
    let accountId: number

    const { data: existing, error: lookupError } = await supabase
      .from('vm_ais_accounts')
      .select('id')
      .eq('account_email', email)
      .limit(1)

    if (lookupError) throw new Error(lookupError.message)

    if (existing?.length) {
      accountId = Number(existing[0].id)

      const { error } = await supabase
        .from('vm_ais_accounts')
        .update({
          display_name: displayName,
          credential_status: 'PENDING_VALIDATION',
          credential_error_code: null,
          credential_error_message: null,
        })
        .eq('id', accountId)

      if (error) throw new Error(error.message)
    } else {
      const { data, error } = await supabase
        .from('vm_ais_accounts')
        .insert({
          account_email: email,
          display_name: displayName,
          credential_status: 'PENDING_VALIDATION',
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)
      accountId = Number(data.id)
    }

    await saveEncryptedPassword(supabase, accountId, password)
    await queueAccountSync(supabase, accountId, 'VALIDATE_AND_SYNC')

    await supabase.from('vm_ais_account_events').insert({
      account_id: accountId,
      event_type: 'CREDENTIALS_UPDATED',
      source: 'WEB',
      message: 'Credenciales actualizadas. Validación pendiente.',
    })

    revalidatePath(PATH)
    redirect(`${PATH}?account_added=1#cuentas-ais`)
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(`${PATH}?error=${encodeURIComponent(error?.message || 'No se pudo registrar la cuenta AIS.')}`)
  }
}

export async function updateAisPassword(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const accountId = numberValue(formData, 'account_id')
  const password = text(formData, 'password')

  if (!accountId || !password) {
    redirect(`${PATH}?error=${encodeURIComponent('Cuenta o contraseña inválida.')}`)
  }

  try {
    await saveEncryptedPassword(supabase, accountId, password)

    const { error } = await supabase
      .from('vm_ais_accounts')
      .update({
        credential_status: 'PENDING_VALIDATION',
        credential_error_code: null,
        credential_error_message: null,
      })
      .eq('id', accountId)

    if (error) throw new Error(error.message)

    await queueAccountSync(supabase, accountId, 'VALIDATE_AND_SYNC')

    await supabase.from('vm_ais_account_events').insert({
      account_id: accountId,
      event_type: 'CREDENTIALS_UPDATED',
      source: 'WEB',
      message: 'Contraseña actualizada. Validación pendiente.',
    })

    revalidatePath(PATH)
    redirect(`${PATH}?credentials_updated=1#cuentas-ais`)
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(`${PATH}?error=${encodeURIComponent(error?.message || 'No se pudo actualizar la contraseña.')}`)
  }
}

export async function requestAisAccountSync(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()
  const accountId = numberValue(formData, 'account_id')

  if (!accountId) {
    redirect(`${PATH}?error=${encodeURIComponent('Cuenta AIS inválida.')}`)
  }

  try {
    await queueAccountSync(supabase, accountId, 'SYNC')

    await supabase.from('vm_ais_account_events').insert({
      account_id: accountId,
      event_type: 'SYNC_REQUESTED',
      source: 'WEB',
      message: 'Sincronización solicitada desde Proyecto Águila.',
    })

    revalidatePath(PATH)
    redirect(`${PATH}?sync_requested=1#cuentas-ais`)
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(`${PATH}?error=${encodeURIComponent(error?.message || 'No se pudo solicitar la sincronización.')}`)
  }
}

export async function linkTargetToExistingClient(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const targetId = numberValue(formData, 'target_id')
  const clientId = numberValue(formData, 'client_id')

  if (!targetId || !clientId) {
    redirect(`${PATH}?error=${encodeURIComponent('Selecciona un tramitante/grupo y un cliente.')}`)
  }

  try {
    const { data: target, error: targetError } = await supabase
      .from('vm_ais_account_targets')
      .select('id,account_id')
      .eq('id', targetId)
      .single()

    if (targetError) throw new Error(targetError.message)

    const { error: linkError } = await supabase
      .from('vm_ais_account_targets')
      .update({
        client_id: clientId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId)

    if (linkError) throw new Error(linkError.message)

    await ensureBookingConfig(
      supabase,
      clientId,
      Number(target.account_id),
      targetId,
    )

    revalidatePath(PATH)
    redirect(`${PATH}?process_created=1#agendados`)
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(`${PATH}?error=${encodeURIComponent(error?.message || 'No se pudo crear la configuración.')}`)
  }
}

export async function createClientFromTarget(formData: FormData) {
  await requireAuthContext()
  const supabaseAdmin = getVisaMasterAdminClient()

  const targetId = numberValue(formData, 'target_id')
  const customName = text(formData, 'client_name')

  if (!targetId) {
    redirect(`${PATH}?error=${encodeURIComponent('Tramitante o grupo inválido.')}`)
  }

  try {
    const { data: target, error: targetError } = await supabaseAdmin
      .from('vm_ais_account_targets')
      .select('id,account_id,display_name,current_consular_date,current_consulate')
      .eq('id', targetId)
      .single()

    if (targetError) throw new Error(targetError.message)

    const fullName = customName || target.display_name

    // vm_appointment_clients es la entidad operativa del Motor de Citas.
    // Esta acción ya pasó requireAuthContext(); usamos el cliente admin
    // server-side para no chocar con RLS al crear un cliente de prueba
    // o un objetivo AIS que todavía no existe en el CRM comercial.
    const { data: client, error: clientError } = await supabaseAdmin
      .from('vm_appointment_clients')
      .insert({
        full_name: fullName || `Cliente AIS ${targetId}`,
        visa_type: 'B1/B2',
        status: 'ACTIVE',
        current_appointment_date: target.current_consular_date || null,
        current_consulate: target.current_consulate || null,
      })
      .select('id')
      .single()

    if (clientError) throw new Error(clientError.message)

    const clientId = Number(client.id)

    const { error: targetLinkError } = await supabaseAdmin
      .from('vm_ais_account_targets')
      .update({
        client_id: clientId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId)

    if (targetLinkError) throw new Error(targetLinkError.message)

    await ensureBookingConfig(
      supabaseAdmin,
      clientId,
      Number(target.account_id),
      targetId,
    )

    revalidatePath(PATH)
    redirect(`${PATH}?client_created=1#agendados`)
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(`${PATH}?error=${encodeURIComponent(error?.message || 'No se pudo crear el cliente.')}`)
  }
}

export async function updateBookingConfig(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const id = numberValue(formData, 'booking_config_id')
  if (!id) redirect(`${PATH}?error=Configuración inválida`)

  const allowAnyTime = formData.get('allow_any_time') === 'on'
  const searchMode = text(formData, 'search_mode') || 'INTELLIGENT'

  const payload: any = {
    search_mode: searchMode,
    auto_verify_enabled: true,
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
  redirect(`${PATH}?updated=1#agendados`)
}


export async function resumeImprovementSearch(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const id = numberValue(formData, 'booking_config_id')

  if (!id) {
    redirect(`${PATH}?error=${encodeURIComponent('Configuración inválida.')}`)
  }

  try {
    const { data: config, error: configError } = await supabase
      .from('vm_booking_configs')
      .select('id,client_id,account_id,auto_confirm_enabled')
      .eq('id', id)
      .single()

    if (configError) throw new Error(configError.message)

    const { data: client, error: clientError } = await supabase
      .from('vm_appointment_clients')
      .select('id,current_appointment_date,current_consulate')
      .eq('id', config.client_id)
      .single()

    if (clientError) throw new Error(clientError.message)

    if (!client.current_appointment_date) {
      redirect(`${PATH}?error=${encodeURIComponent(
        'Este proceso todavía no tiene una cita actual para usar como referencia de mejora.'
      )}#agendados`)
    }

    const { data: account, error: accountError } = await supabase
      .from('vm_ais_accounts')
      .select('id,credential_status,credential_error_message')
      .eq('id', config.account_id)
      .single()

    if (accountError) throw new Error(accountError.message)

    if (account.credential_status !== 'VALID') {
      redirect(`${PATH}?error=${encodeURIComponent(
        account.credential_error_message ||
        'La cuenta AIS no tiene acceso válido. Corrige el acceso antes de reactivar la búsqueda.'
      )}#cuentas-ais`)
    }

    const { error } = await supabase
      .from('vm_booking_configs')
      .update({
        enabled: true,
        operational_status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath(PATH)
    redirect(`${PATH}?improvement_search=1#agendados`)
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(`${PATH}?error=${encodeURIComponent(
      error?.message || 'No se pudo reactivar la búsqueda de mejora.'
    )}#agendados`)
  }
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
  redirect(`${PATH}?updated=1#agendados`)
}

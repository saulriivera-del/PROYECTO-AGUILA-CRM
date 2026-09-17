'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'
import { encryptVisaCredential } from '@/lib/visa-master-credentials'

const PATH = '/admin/motor-citas'

const OPERATOR_SEARCH_MODES = new Set([
  'ALERT_ONLY',
  'STANDARD',
  'INTELLIGENT',
])

const ADMIN_SEARCH_MODES = new Set([
  ...OPERATOR_SEARCH_MODES,
  'INTENSIVE',
])

function motorUrl(
  section: 'cuentas' | 'busquedas' | 'servicios' | 'resumen',
  params: Record<string, string | number | boolean | null | undefined> = {},
  hash?: string,
) {
  const query = new URLSearchParams({ section })

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === false) continue
    query.set(key, String(value))
  }

  return `${PATH}?${query.toString()}${hash ? `#${hash}` : ''}`
}

async function requireMotorAdministrator(
  section: 'cuentas' | 'busquedas' | 'servicios' | 'resumen' = 'resumen',
) {
  const context = await requireAuthContext()

  if (!isAdministrator(context.role)) {
    redirect(
      motorUrl(section, {
        error: 'Esta función está reservada para administración de Visa Master.',
      })
    )
  }

  return context
}

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
      auto_confirm_enabled: true,
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
    redirect(motorUrl('cuentas', { error: 'Captura un correo AIS válido.' }))
  }

  if (!password) {
    redirect(motorUrl('cuentas', { error: 'La contraseña AIS es obligatoria.' }))
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
    redirect(motorUrl('cuentas', { account_added: 1 }, 'cuentas-ais'))
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(motorUrl('cuentas', { error: error?.message || 'No se pudo registrar la cuenta AIS.' }))
  }
}

export async function updateAisPassword(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const accountId = numberValue(formData, 'account_id')
  const password = text(formData, 'password')

  if (!accountId || !password) {
    redirect(motorUrl('cuentas', { error: 'Cuenta o contraseña inválida.' }))
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
    redirect(motorUrl('cuentas', { credentials_updated: 1 }, 'cuentas-ais'))
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(motorUrl('cuentas', { error: error?.message || 'No se pudo actualizar la contraseña.' }))
  }
}

export async function requestAisAccountSync(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()
  const accountId = numberValue(formData, 'account_id')

  if (!accountId) {
    redirect(motorUrl('cuentas', { error: 'Cuenta AIS inválida.' }))
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
    redirect(motorUrl('cuentas', { sync_requested: 1 }, 'cuentas-ais'))
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(motorUrl('cuentas', { error: error?.message || 'No se pudo solicitar la sincronización.' }))
  }
}


export async function requestTargetAppointmentRefresh(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const targetId = numberValue(formData, 'target_id')

  if (!targetId) {
    redirect(motorUrl('cuentas', { error: 'Solicitante/grupo AIS inválido.' }, 'cuentas-ais'))
  }

  try {
    const { data: target, error: targetError } = await supabase
      .from('vm_ais_account_targets')
      .select('id,account_id,appointment_refresh_status')
      .eq('id', targetId)
      .single()

    if (targetError) throw new Error(targetError.message)

    if (['PENDING', 'RUNNING'].includes(String(target.appointment_refresh_status || ''))) {
      revalidatePath(PATH)
      redirect(motorUrl('cuentas', { target_refresh_pending: 1 }, 'cuentas-ais'))
    }

    const { data: account, error: accountError } = await supabase
      .from('vm_ais_accounts')
      .select('id,credential_status,credential_error_message')
      .eq('id', Number(target.account_id))
      .single()

    if (accountError) throw new Error(accountError.message)

    if (account.credential_status !== 'VALID') {
      redirect(motorUrl('cuentas', {
        error:
          account.credential_error_message ||
          'La cuenta AIS no tiene acceso válido. Corrige el acceso antes de verificar la cita.',
      }, 'cuentas-ais'))
    }

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('vm_ais_account_targets')
      .update({
        appointment_refresh_status: 'PENDING',
        appointment_refresh_requested_at: now,
        appointment_refresh_started_at: null,
        appointment_refresh_finished_at: null,
        appointment_refresh_error_code: null,
        appointment_refresh_error_message: null,
        updated_at: now,
      })
      .eq('id', targetId)

    if (error) throw new Error(error.message)

    await supabase.from('vm_ais_account_events').insert({
      account_id: Number(target.account_id),
      event_type: 'TARGET_APPOINTMENT_REFRESH_REQUESTED',
      source: 'WEB',
      message: `Verificación manual de cita solicitada para target #${targetId}.`,
      payload: { target_id: targetId },
    })

    revalidatePath(PATH)
    redirect(motorUrl('cuentas', { target_refresh_requested: 1 }, 'cuentas-ais'))
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(motorUrl('cuentas', {
      error: error?.message || 'No se pudo solicitar la verificación de cita en AIS.',
    }, 'cuentas-ais'))
  }
}


export async function linkTargetToCrmProcess(formData: FormData) {
  await requireAuthContext()

  // V13 usa una vista/columnas nuevas que todavía no existen en el
  // Database type generado de Supabase. El esquema real ya fue migrado.
  // Limitamos el cast a esta acción para no perder tipado en el resto.
  const supabase = getVisaMasterAdminClient() as any

  const targetId = numberValue(formData, 'target_id')
  const crmProcessId = text(formData, 'crm_process_id')

  if (!targetId || !crmProcessId) {
    redirect(motorUrl('cuentas', {
      error: 'Selecciona un solicitante/grupo AIS y un trámite de Proyecto Águila.',
    }, 'cuentas-ais'))
  }

  try {
    const { data: target, error: targetError } = await supabase
      .from('vm_ais_account_targets')
      .select(
        'id,account_id,display_name,current_consular_date,current_consulate'
      )
      .eq('id', targetId)
      .single()

    if (targetError) throw new Error(targetError.message)

    const { data: account, error: accountError } = await supabase
      .from('vm_ais_accounts')
      .select('id,account_email')
      .eq('id', Number(target.account_id))
      .single()

    if (accountError) throw new Error(accountError.message)

    const { data: match, error: matchError } = await supabase
      .from('vm_ais_crm_process_match_view')
      .select(
        'account_id,account_email,crm_client_id,crm_client_name,crm_client_email,' +
        'crm_process_id,service_name,process_status,current_stage'
      )
      .eq('account_id', Number(target.account_id))
      .eq('crm_process_id', crmProcessId)
      .single()

    if (matchError || !match) {
      throw new Error(
        'El trámite seleccionado ya no coincide con el correo AIS o no es elegible para citas.'
      )
    }

    let motorClientId: number

    const { data: existing, error: existingError } = await supabase
      .from('vm_appointment_clients')
      .select('id')
      .eq('crm_process_id', crmProcessId)
      .limit(1)

    if (existingError) throw new Error(existingError.message)

    if (existing?.length) {
      motorClientId = Number(existing[0].id)

      const { error: updateClientError } = await supabase
        .from('vm_appointment_clients')
        .update({
          crm_client_id: match.crm_client_id,
          full_name: match.crm_client_name,
          visa_type: match.service_name,
          ais_account_email: String(account.account_email || '').toLowerCase(),
          status: 'ACTIVE',
          current_appointment_date: target.current_consular_date || null,
          current_consulate: target.current_consulate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', motorClientId)

      if (updateClientError) throw new Error(updateClientError.message)
    } else {
      const { data: created, error: createError } = await supabase
        .from('vm_appointment_clients')
        .insert({
          crm_client_id: match.crm_client_id,
          crm_process_id: match.crm_process_id,
          full_name: match.crm_client_name || target.display_name || `Cliente AIS ${targetId}`,
          visa_type: match.service_name || 'VISA',
          ais_account_email: String(account.account_email || '').toLowerCase(),
          status: 'ACTIVE',
          current_appointment_date: target.current_consular_date || null,
          current_consulate: target.current_consulate || null,
        })
        .select('id')
        .single()

      if (createError) throw new Error(createError.message)
      motorClientId = Number(created.id)
    }

    const { error: targetLinkError } = await supabase
      .from('vm_ais_account_targets')
      .update({
        client_id: motorClientId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId)

    if (targetLinkError) throw new Error(targetLinkError.message)

    await ensureBookingConfig(
      supabase,
      motorClientId,
      Number(target.account_id),
      targetId,
    )

    await supabase.from('vm_ais_account_events').insert({
      account_id: Number(target.account_id),
      event_type: 'CRM_PROCESS_LINKED',
      source: 'WEB',
      message: `Target #${targetId} vinculado al proceso CRM ${crmProcessId}.`,
      payload: {
        target_id: targetId,
        motor_client_id: motorClientId,
        crm_client_id: match.crm_client_id,
        crm_process_id: match.crm_process_id,
        service_name: match.service_name,
      },
    })

    revalidatePath(PATH)
    redirect(motorUrl('busquedas', { crm_process_linked: 1 }, 'agendados'))
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(motorUrl('cuentas', {
      error: error?.message || 'No se pudo vincular el trámite de Proyecto Águila.',
    }, 'cuentas-ais'))
  }
}

export async function createClientFromTarget(formData: FormData) {
  await requireMotorAdministrator('cuentas')
  const supabaseAdmin = getVisaMasterAdminClient()

  const targetId = numberValue(formData, 'target_id')
  const customName = text(formData, 'client_name')

  if (!targetId) {
    redirect(motorUrl('cuentas', { error: 'Tramitante o grupo inválido.' }, 'cuentas-ais'))
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
    redirect(motorUrl('busquedas', { client_created: 1 }, 'agendados'))
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(motorUrl('cuentas', { error: error?.message || 'No se pudo crear el cliente.' }))
  }
}

export async function updateBookingConfig(formData: FormData) {
  const context = await requireAuthContext()
  const admin = isAdministrator(context.role)
  const supabase = getVisaMasterAdminClient()

  const id = numberValue(formData, 'booking_config_id')
  if (!id) redirect(motorUrl('busquedas', { error: 'Configuración inválida' }, 'agendados'))

  const allowAnyTime = formData.get('allow_any_time') === 'on'
  const searchMode = text(formData, 'search_mode') || 'INTELLIGENT'

  const { data: currentConfig, error: currentConfigError } = await supabase
    .from('vm_booking_configs')
    .select('id,search_mode,intensive_interval_seconds')
    .eq('id', id)
    .single()

  if (currentConfigError || !currentConfig) {
    redirect(motorUrl('busquedas', {
      error: currentConfigError?.message || 'No se pudo leer la configuración actual.',
    }, 'agendados'))
  }

  const allowedModes = admin ? ADMIN_SEARCH_MODES : OPERATOR_SEARCH_MODES
  const retainingAdminIntensiveMode =
    !admin
    && searchMode === 'INTENSIVE'
    && currentConfig.search_mode === 'INTENSIVE'

  if (!allowedModes.has(searchMode) && !retainingAdminIntensiveMode) {
    redirect(motorUrl('busquedas', {
      error:
        searchMode === 'INTENSIVE'
          ? 'El modo intensivo solo puede configurarlo un administrador.'
          : 'Modo de búsqueda no permitido.',
    }, 'agendados'))
  }

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
        ? (
            admin
              ? Math.max(15, numberValue(formData, 'intensive_interval_seconds', 30))
              : currentConfig.intensive_interval_seconds
          )
        : null,
    updated_at: new Date().toISOString(),
  }

  if (payload.cas_max_days_before < payload.cas_min_days_before) {
    redirect(motorUrl('busquedas', { error: 'El máximo de días CAS no puede ser menor al mínimo' }, 'agendados'))
  }

  if (!payload.allowed_consulates.length) {
    redirect(motorUrl('busquedas', { error: 'Selecciona al menos un consulado permitido' }, 'agendados'))
  }

  if (!payload.allowed_cas_locations.length) {
    redirect(motorUrl('busquedas', { error: 'Selecciona al menos un CAS permitido' }, 'agendados'))
  }

  const { error } = await supabase
    .from('vm_booking_configs')
    .update(payload)
    .eq('id', id)

  if (error) redirect(motorUrl('busquedas', { error: error.message }, 'agendados'))

  revalidatePath(PATH)
  redirect(motorUrl('busquedas', { updated: 1 }, 'agendados'))
}


export async function resumeImprovementSearch(formData: FormData) {
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const id = numberValue(formData, 'booking_config_id')

  if (!id) {
    redirect(motorUrl('busquedas', { error: 'Configuración inválida.' }, 'agendados'))
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
      redirect(motorUrl('busquedas', {
        error: 'Este proceso todavía no tiene una cita actual para usar como referencia de mejora.',
      }, 'agendados'))
    }

    const { data: account, error: accountError } = await supabase
      .from('vm_ais_accounts')
      .select('id,credential_status,credential_error_message')
      .eq('id', config.account_id)
      .single()

    if (accountError) throw new Error(accountError.message)

    if (account.credential_status !== 'VALID') {
      redirect(motorUrl('busquedas', {
        error:
          account.credential_error_message ||
          'La cuenta AIS no tiene acceso válido. Corrige el acceso antes de reactivar la búsqueda.',
      }, 'agendados'))
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
    redirect(motorUrl('busquedas', { improvement_search: 1 }, 'agendados'))
  } catch (error: any) {
    rethrowNextRedirect(error)
    redirect(motorUrl('busquedas', {
      error: error?.message || 'No se pudo reactivar la búsqueda de mejora.',
    }, 'agendados'))
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
  if (error) redirect(motorUrl('busquedas', { error: error.message }, 'agendados'))

  revalidatePath(PATH)
  redirect(motorUrl('busquedas', { updated: 1 }, 'agendados'))
}


export async function requestAgentCommand(formData: FormData) {
  await requireMotorAdministrator('servicios')

  // Tablas V1 nuevas; el esquema real existe tras ejecutar la migración.
  const supabase = getVisaMasterAdminClient() as any

  const agentId = text(formData, 'agent_id')
  const serviceKey = text(formData, 'service_key')
  const command = text(formData, 'command')

  const allowedCommands = new Set([
    'RESTART_SERVICE',
    'RESTART_ALL',
    'START_SERVICE',
    'STOP_SERVICE',
  ])

  const allowedServices = new Set([
    'account_worker',
    'orchestrator',
    'master_notifier',
    'telegram_bot',
  ])

  if (!agentId) {
    redirect(motorUrl('servicios', { error: String('No se recibió el Agent ID.') }, 'servicios'))
  }

  if (!allowedCommands.has(command)) {
    redirect(motorUrl('servicios', { error: String('Comando del Agent no permitido.') }, 'servicios'))
  }

  if (
    command !== 'RESTART_ALL'
    && !allowedServices.has(serviceKey)
  ) {
    redirect(motorUrl('servicios', { error: String('Servicio del Agent no permitido.') }, 'servicios'))
  }

  const { data: agent, error: agentError } = await supabase
    .from('vm_agent_instances')
    .select('agent_id,last_heartbeat_at')
    .eq('agent_id', agentId)
    .maybeSingle()

  if (agentError) {
    redirect(motorUrl('servicios', { error: String(agentError.message) }, 'servicios'))
  }

  if (!agent) {
    redirect(motorUrl('servicios', { error: String('El Agent seleccionado ya no existe.') }, 'servicios'))
  }

  const { error } = await supabase
    .from('vm_agent_commands')
    .insert({
      agent_id: agentId,
      service_key:
        command === 'RESTART_ALL'
          ? null
          : serviceKey,
      command,
      status: 'PENDING',
      updated_at: new Date().toISOString(),
    })

  if (error) {
    redirect(motorUrl('servicios', { error: String(error.message) }, 'servicios'))
  }

  revalidatePath(PATH)
  redirect(motorUrl('servicios', { agent_command: 1 }, 'servicios'))
}


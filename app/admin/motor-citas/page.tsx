import { botMasterRoleAtLeast, requireBotMasterTenant } from '@/lib/bot-master-tenant'
import {
  addAisAccount,
  createClientFromTarget,
  linkTargetToCrmProcess,
  requestAisAccountSync,
  requestTargetAppointmentRefresh,
  requestAgentCommand,
  createBotMasterOrganization,
  generateOrganizationTelegramCode,
  unlinkOrganizationTelegram,
  resumeImprovementSearch,
  setAutoConfirmState,
  toggleBookingConfig,
  updateAisPassword,
  updateBookingConfig,
} from './actions'
import OrderedMultiSelect from './OrderedMultiSelect'
import SearchModeField from './SearchModeField'
import TimeWindowField from './TimeWindowField'
import ServiceAutoRefresh from './ServiceAutoRefresh'
import styles from './motor-citas.module.css'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const SECTION_OPTIONS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'agendados', label: 'Agendados' },
  { key: 'auditoria', label: 'Auditoría' },
  { key: 'preflight', label: 'Preflight' },
  { key: 'incidencias', label: 'Incidencias' },
  { key: 'seguridad', label: 'Seguridad' },
  { key: 'organizaciones', label: 'Organizaciones' },
  { key: 'cuentas-ais', label: 'Cuentas AIS' },
  { key: 'servicios', label: 'Servicios' },
  { key: 'rendimiento', label: 'Rendimiento' },
  { key: 'salud-ais', label: 'Salud AIS' },
  { key: 'aperturas', label: 'Aperturas' },
  { key: 'historial', label: 'Historial' },
] as const

type SectionKey = typeof SECTION_OPTIONS[number]['key']

const CONSULATE_OPTIONS = [
  { value: 'CIUDAD JUAREZ', label: 'Ciudad Juárez' },
  { value: 'GUADALAJARA', label: 'Guadalajara' },
  { value: 'HERMOSILLO', label: 'Hermosillo' },
  { value: 'MATAMOROS', label: 'Matamoros' },
  { value: 'MERIDA', label: 'Mérida' },
  { value: 'MEXICO CITY', label: 'Mexico City' },
  { value: 'MONTERREY', label: 'Monterrey' },
  { value: 'NOGALES', label: 'Nogales' },
  { value: 'NUEVO LAREDO', label: 'Nuevo Laredo' },
  { value: 'TIJUANA', label: 'Tijuana' },
]

const CAS_OPTIONS = [
  { value: 'CIUDAD JUAREZ', label: 'Ciudad Juárez ASC' },
  { value: 'GUADALAJARA', label: 'Guadalajara ASC' },
  { value: 'HERMOSILLO', label: 'Hermosillo ASC' },
  { value: 'MATAMOROS', label: 'Matamoros ASC' },
  { value: 'MERIDA', label: 'Mérida ASC' },
  { value: 'MEXICO CITY', label: 'Mexico City ASC' },
  { value: 'MONTERREY', label: 'Monterrey ASC' },
  { value: 'NOGALES', label: 'Nogales ASC' },
  { value: 'NUEVO LAREDO', label: 'Nuevo Laredo ASC' },
  { value: 'TIJUANA', label: 'Tijuana ASC' },
]

function fmtDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Hermosillo',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00-07:00`))
}

function fmtTime(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return `${String(value).padStart(2, '0')}:00`
  return String(value).slice(0, 5)
}

function fmtWindow(row: any) {
  const start = `${String(row.local_hour).padStart(2, '0')}:${String(row.minute_bucket).padStart(2, '0')}`
  const total = Number(row.local_hour) * 60 + Number(row.minute_bucket) + 15
  const endHour = Math.floor(total / 60) % 24
  const endMin = total % 60
  return `${start}–${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
}

function modeLabel(mode: string) {
  const labels: Record<string, string> = {
    ALERT_ONLY: 'Master Notificador',
    STANDARD: 'Búsqueda estándar',
    INTENSIVE: 'Búsqueda intensiva',
    INTELLIGENT: 'Modo inteligente',
  }
  return labels[mode] || mode
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'Activo',
    PAUSED: 'Pausado',
    LOGIN_REQUIRED: 'Login requerido',
    ERROR: 'Error',
  }
  return map[status] || status
}

function visibleSource(source?: string | null) {
  if (!source) return '—'
  return source.toUpperCase().includes('SARU') ? 'Master Notificador' : source
}

function prettyCode(value: string) {
  const option = [...CONSULATE_OPTIONS, ...CAS_OPTIONS].find((item) => item.value === value)
  return option?.label || value
}


function credentialLabel(status?: string | null) {
  const map: Record<string, string> = {
    NOT_CONFIGURED: 'Sin credenciales',
    PENDING_VALIDATION: 'Validación pendiente',
    VALID: 'Acceso válido',
    INVALID_CREDENTIALS: 'Credenciales incorrectas',
    LOGIN_REQUIRED: 'Login requerido',
    ERROR: 'Error de acceso',
  }
  return map[status || ''] || status || 'Sin estado'
}

function credentialClass(status?: string | null) {
  if (status === 'VALID') return styles.credentialOk
  if (status === 'PENDING_VALIDATION') return styles.credentialPending
  if (status === 'INVALID_CREDENTIALS' || status === 'ERROR') return styles.credentialError
  if (status === 'LOGIN_REQUIRED') return styles.credentialWarning
  return styles.credentialNeutral
}

function targetTypeLabel(type?: string | null) {
  return type === 'GROUP' ? 'Grupo' : 'Individual'
}

function fmtDateTime(value?: string | null) {
  if (!value) return 'Nunca'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Hermosillo',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function targetVerificationLabel(target: any) {
  const status = String(target.appointment_refresh_status || 'NEVER')

  if (status === 'PENDING') return 'Verificación pendiente'
  if (status === 'RUNNING') return 'Verificando en AIS'
  if (status === 'FAILED') return 'No se pudo verificar'

  if (target.appointment_verified_at) {
    return target.appointment_verified_has_current
      ? 'Cita confirmada en AIS'
      : 'Sin cita programada en AIS'
  }

  return 'Aún no verificado'
}


function healthLabel(status?: string | null) {
  const map: Record<string, string> = {
    HEALTHY: 'Saludable',
    WARNING: 'Atención',
    DEGRADED: 'Degradado',
    NO_DATA: 'Sin datos',
  }
  return map[String(status || 'NO_DATA')] || String(status || 'Sin datos')
}

function healthClass(status?: string | null) {
  if (status === 'HEALTHY') return styles.healthGood
  if (status === 'WARNING') return styles.healthWarning
  if (status === 'DEGRADED') return styles.healthBad
  return styles.healthNeutral
}

function fmtPct(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(0)}%`
}


function fmtDurationSeconds(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'

  let seconds = Math.max(0, Math.round(Number(value)))
  if (!Number.isFinite(seconds)) return '—'

  const days = Math.floor(seconds / 86400)
  seconds -= days * 86400

  const hours = Math.floor(seconds / 3600)
  seconds -= hours * 3600

  const minutes = Math.floor(seconds / 60)
  seconds -= minutes * 60

  const parts: string[] = []

  if (days) parts.push(`${days} d`)
  if (hours) parts.push(`${hours} h`)
  if (minutes) parts.push(`${minutes} min`)
  if (!days && !hours && !minutes) parts.push(`${seconds} s`)

  return parts.slice(0, 2).join(' ')
}


function fmtSessionMinutes(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'

  const total = Math.max(0, Number(value))
  if (!Number.isFinite(total)) return '—'

  const rounded = Math.round(total)
  if (rounded < 60) return `${rounded} min`

  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60

  return minutes ? `${hours} h ${minutes} min` : `${hours} h`
}

function fmtSeconds(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`
}

function modeExperimentLabel(mode?: string | null) {
  const labels: Record<string, string> = {
    ALERT_ONLY: 'Solo alertas',
    STANDARD: 'Standard',
    INTELLIGENT: 'Intelligent',
    INTENSIVE: 'Intensive',
  }
  return labels[String(mode || '')] || String(mode || '—')
}


function blockLabel(status?: string | null) {
  if (status === 'POSSIBLE') return 'Posible restricción activa'
  if (status === 'RECOVERED') return 'Restricción transitoria recuperada'
  return 'Sin indicios de restricción'
}

function blockClass(status?: string | null) {
  if (status === 'POSSIBLE') return styles.blockActive
  if (status === 'RECOVERED') return styles.blockRecovered
  return styles.blockNone
}


function serviceStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    ONLINE: 'En línea',
    RUNNING: 'En línea',
    STARTING: 'Iniciando',
    RESTARTING: 'Reiniciando',
    STOPPING: 'Deteniendo',
    STOPPED: 'Detenido',
    CRASHED: 'Caído',
    ERROR: 'Error',
    STALE: 'Sin heartbeat',
    AGENT_OFFLINE: 'Agent desconectado',
    OFFLINE: 'Desconectado',
  }

  return map[String(status || '')] || String(status || 'Sin datos')
}

function serviceStatusClass(status?: string | null) {
  if (status === 'ONLINE' || status === 'RUNNING') {
    return styles.serviceOnline
  }

  if (
    status === 'STARTING'
    || status === 'RESTARTING'
  ) {
    return styles.serviceWarning
  }

  if (
    status === 'CRASHED'
    || status === 'ERROR'
    || status === 'STALE'
    || status === 'AGENT_OFFLINE'
    || status === 'OFFLINE'
  ) {
    return styles.serviceOffline
  }

  return styles.serviceNeutral
}

function serviceKeyLabel(key?: string | null) {
  const map: Record<string, string> = {
    account_worker: 'Worker de cuentas',
    orchestrator: 'Orquestador de citas',
    master_notifier: 'Master Notificador',
    telegram_bot: 'Telegram Bot',
    booking_publisher: 'Publicador Bot Master',
  }

  return map[String(key || '')] || String(key || 'Servicio')
}


type PreflightCheck = {
  key: string
  label: string
  ok: boolean
  detail: string
  blocking: boolean
}

function subtractIsoDays(value: string, days: number) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function buildBookingPreflight(config: any, account: any, target: any, telegramLink: any = null) {
  const checks: PreflightCheck[] = []

  const targetWasVerified = Boolean(target?.appointment_verified_at)
  const targetHasAppointment = target?.appointment_verified_has_current === true
  const targetHasNoAppointment = target?.appointment_verified_has_current === false

  const effectiveCurrentDate = targetWasVerified
    ? (targetHasAppointment ? target?.current_consular_date : null)
    : config.current_appointment_date

  const accountValid = String(account?.credential_status || '') === 'VALID'
  checks.push({
    key: 'credential',
    label: 'Acceso AIS',
    ok: accountValid,
    detail: accountValid
      ? 'Credencial validada.'
      : `Estado: ${account?.credential_status || 'sin validar'}.`,
    blocking: true,
  })

  const targetLinked = Boolean(config.ais_target_id && target)
  checks.push({
    key: 'target',
    label: 'Objetivo AIS',
    ok: targetLinked,
    detail: targetLinked
      ? `Target #${target.id} vinculado.`
      : 'Falta vincular el solicitante/grupo AIS.',
    blocking: true,
  })

  const hasScheduleHint = Boolean(
    account?.schedule_id
    || /^schedule:\d+$/i.test(String(target?.external_target_id || ''))
    || /schedule:\d+/i.test(String(target?.external_target_id || ''))
  )
  checks.push({
    key: 'schedule',
    label: 'Schedule AIS',
    ok: hasScheduleHint,
    detail: hasScheduleHint
      ? 'Schedule detectado para el proceso.'
      : 'No se ve un schedule_id utilizable desde el panel.',
    blocking: true,
  })

  checks.push({
    key: 'appointment_verified',
    label: 'Estado de cita en AIS',
    ok: targetWasVerified,
    detail: targetWasVerified
      ? (targetHasAppointment
          ? `Cita verificada${target?.current_consular_date ? `: ${target.current_consular_date}` : ''}.`
          : 'AIS verificado: actualmente sin cita.')
      : 'Falta verificar el estado real de la cita en AIS.',
    blocking: true,
  })

  if (targetWasVerified && targetHasAppointment && !target?.current_consular_date) {
    checks.push({
      key: 'appointment_date',
      label: 'Fecha de cita actual',
      ok: false,
      detail: 'AIS indica que existe cita, pero no hay fecha consular sincronizada.',
      blocking: true,
    })
  }

  const dateFrom = String(config.acceptable_date_from || '').slice(0, 10)
  const dateTo = String(config.acceptable_date_to || '').slice(0, 10)
  const rangeValid = Boolean(dateFrom && dateTo && dateFrom <= dateTo)
  checks.push({
    key: 'range',
    label: 'Rango de búsqueda',
    ok: rangeValid,
    detail: rangeValid
      ? `${dateFrom} → ${dateTo}`
      : 'Captura un rango de fechas válido.',
    blocking: true,
  })

  if (rangeValid && effectiveCurrentDate) {
    const improvementDays = Math.max(1, Number(config.minimum_improvement_days || 0))
    const cutoff = subtractIsoDays(String(effectiveCurrentDate), improvementDays)
    const lastCandidate = dateTo < cutoff ? dateTo : cutoff
    const hasImprovementCandidate = dateFrom <= lastCandidate

    checks.push({
      key: 'improvement',
      label: 'Mejora real disponible en el rango',
      ok: hasImprovementCandidate,
      detail: hasImprovementCandidate
        ? `La nueva consular deberá ser ${cutoff} o anterior.`
        : `El rango no contiene fechas que mejoren la cita actual (${String(effectiveCurrentDate).slice(0, 10)}).`,
      blocking: true,
    })
  }

  const consulates = Array.isArray(config.allowed_consulates) ? config.allowed_consulates : []
  checks.push({
    key: 'consulates',
    label: 'Consulados',
    ok: consulates.length > 0,
    detail: consulates.length
      ? `${consulates.length} permitido(s).`
      : 'Selecciona al menos un consulado.',
    blocking: true,
  })

  const casLocations = Array.isArray(config.allowed_cas_locations) ? config.allowed_cas_locations : []
  checks.push({
    key: 'cas_locations',
    label: 'CAS',
    ok: casLocations.length > 0,
    detail: casLocations.length
      ? `${casLocations.length} ubicación(es) permitida(s).`
      : 'Selecciona al menos un CAS.',
    blocking: true,
  })

  const casMin = Number(config.cas_min_days_before)
  const casMax = Number(config.cas_max_days_before)
  const casWindowValid = Number.isFinite(casMin) && Number.isFinite(casMax) && casMin >= 0 && casMax >= casMin
  checks.push({
    key: 'cas_window',
    label: 'Ventana CAS',
    ok: casWindowValid,
    detail: casWindowValid
      ? `${casMin}–${casMax} días antes de Consular.`
      : 'La ventana CAS es inválida.',
    blocking: true,
  })

  const timeWindowValid = Boolean(
    config.allow_any_time
    || (config.allowed_time_from && config.allowed_time_to)
  )
  checks.push({
    key: 'time_window',
    label: 'Horario consular',
    ok: timeWindowValid,
    detail: config.allow_any_time
      ? 'Cualquier horario permitido.'
      : (timeWindowValid
          ? `${config.allowed_time_from} → ${config.allowed_time_to}`
          : 'Falta configurar el horario permitido.'),
    blocking: true,
  })

  const telegramLinked = Boolean(telegramLink?.active && telegramLink?.link_source === 'ORGANIZATION')
  checks.push({
    key: 'telegram',
    label: 'Telegram privado',
    ok: telegramLinked,
    detail: telegramLinked
      ? `Vinculado a ${telegramLink.chat_title || `Chat ${telegramLink.chat_id}`}.`
      : 'La organización todavía no tiene un grupo principal de Telegram vinculado.',
    blocking: true,
  })

  const validModes = new Set(['ALERT_ONLY', 'STANDARD', 'INTENSIVE', 'INTELLIGENT'])
  const modeOk = validModes.has(String(config.search_mode || '').toUpperCase())
  checks.push({
    key: 'mode',
    label: 'Modo de búsqueda',
    ok: modeOk,
    detail: modeOk ? modeLabel(config.search_mode) : 'Modo de búsqueda no reconocido.',
    blocking: true,
  })

  const blocking = checks.filter((item) => item.blocking && !item.ok)

  return {
    checks,
    blocking,
    ready: blocking.length === 0,
    effectiveCurrentDate,
    targetHasNoAppointment,
  }
}


export default async function MotorCitasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const rawSection = typeof params.section === 'string' ? params.section : 'resumen'

  const tenant = await requireBotMasterTenant('VIEWER')
  const supabase = tenant.admin
  const canViewSecurity = botMasterRoleAtLeast(tenant.role, 'OWNER')
  const visibleSectionOptions = SECTION_OPTIONS.filter((item) => {
    if (item.key === 'servicios' && !tenant.isSuperadmin) return false
    if (item.key === 'organizaciones' && !canViewSecurity) return false
    if (item.key === 'seguridad' && !canViewSecurity) return false
    return true
  })
  const selectedSection: SectionKey = visibleSectionOptions.some((item) => item.key === rawSection)
    ? rawSection as SectionKey
    : 'resumen'

  const [
    { data: tenantConfigsBase, error: tenantConfigsBaseError },
    { data: tenantAccountsBase, error: tenantAccountsBaseError },
  ] = await Promise.all([
    (supabase as any).from('vm_booking_configs')
      .select('id,organization_id,client_id,account_id,ais_target_id,operational_status,auto_confirm_enabled')
      .eq('organization_id', tenant.organizationId).order('id'),
    (supabase as any).from('vm_ais_accounts')
      .select('id,organization_id').eq('organization_id', tenant.organizationId).order('id'),
  ])

  const tenantSetupError = tenantConfigsBaseError || tenantAccountsBaseError
  if (tenantSetupError) throw new Error(tenantSetupError.message)

  const tenantConfigIds = (tenantConfigsBase ?? []).map((row: any) => Number(row.id))
  const tenantAccountIds = (tenantAccountsBase ?? []).map((row: any) => Number(row.id))
  const scopedConfigIds = tenantConfigIds.length ? tenantConfigIds : [-1]
  const scopedAccountIds = tenantAccountIds.length ? tenantAccountIds : [-1]

  const [
    { error: summaryError },
    { data: openings, error: openingsError },
    { data: windows, error: windowsError },
    { data: configs, error: configsError },
    { data: events, error: eventsError },
    { data: sessionEvents, error: sessionEventsError },
    { data: healthRuns, error: healthRunsError },
    { data: accounts, error: accountsError },
    { data: targets, error: targetsError },
    { data: clients, error: clientsError },
    { data: syncJobs, error: syncJobsError },
    { data: healthRows, error: healthError },
    { data: telegramLinks, error: telegramLinksError },
    { data: crmMatches, error: crmMatchesError },
    { data: sessionStats, error: sessionStatsError },
    { data: agentRows, error: agentError },
    { data: agentServices, error: agentServicesError },
    { data: performanceModes, error: performanceModesError },
    { data: performanceConfigs, error: performanceConfigsError },
    { data: aisJobs, error: aisJobsError },
    { data: telegramOutbox, error: telegramOutboxError },
    { data: availabilityOutbox, error: availabilityOutboxError },
    { data: promoPublications, error: promoPublicationsError },
    { data: availabilityPublications, error: availabilityPublicationsError },
    { data: notifierSources, error: notifierSourcesError },
    { data: botMasterDetections, error: botMasterDetectionsError },
    { data: securityAudit, error: securityAuditError },
    { data: organizations, error: organizationsError },
    { data: organizationUsers, error: organizationUsersError },
    { data: onboardingRequests, error: onboardingRequestsError },
    { data: organizationConfigs, error: organizationConfigsError },
  ] = await Promise.all([
    supabase.from('vm_booking_engine_summary_view').select('*').limit(1),
    supabase.from('vm_openings_30d_by_consulate_view').select('*')
      .order('detections_last_7d', { ascending: false })
      .order('distinct_available_dates', { ascending: false }),
    supabase.from('vm_opening_best_windows_view').select('*')
      .order('consulate')
      .order('detections', { ascending: false }),
    supabase.from('vm_booking_config_dashboard_view').select('*')
      .in('booking_config_id', scopedConfigIds)
      .order('booking_config_id'),
    supabase.from('vm_booking_events').select(
      'id,booking_config_id,event_type,client_id,account_id,consulate,consular_date,consular_time,cas_location,cas_date,cas_time,source,result_code,message,payload,created_at'
    ).in('booking_config_id', scopedConfigIds).order('created_at', { ascending: false }).limit(300),
    (supabase as any).from('vm_ais_session_events').select('*')
      .in('account_id', scopedAccountIds)
      .order('occurred_at', { ascending: false }).limit(300),
    (supabase as any).from('vm_ais_health_runs').select('*')
      .in('booking_config_id', scopedConfigIds)
      .order('id', { ascending: false }).limit(500),
    supabase.from('vm_ais_accounts_dashboard_view').select('*').in('account_id', scopedAccountIds).order('account_id'),
    supabase.from('vm_ais_account_targets').select(
      'id,account_id,external_target_id,target_type,display_name,member_count,client_id,current_consular_date,current_consular_time,current_consulate,current_cas_date,current_cas_time,current_cas_location,synced_at,is_active,appointment_refresh_status,appointment_refresh_requested_at,appointment_refresh_started_at,appointment_refresh_finished_at,appointment_refresh_error_code,appointment_refresh_error_message,appointment_verified_has_current,appointment_verified_at'
    ).eq('organization_id', tenant.organizationId).eq('is_active', true).order('account_id').order('display_name'),
    supabase.from('vm_appointment_clients').select(
      'id,organization_id,full_name,visa_type,status,current_appointment_date,current_consulate,ais_account_email'
    ).eq('organization_id', tenant.organizationId).order('full_name'),
    supabase.from('vm_ais_account_sync_jobs').select(
      'id,account_id,job_type,status,error_code,error_message,created_at,started_at,finished_at'
    ).in('account_id', scopedAccountIds).in('status', ['PENDING', 'RUNNING']).order('created_at', { ascending: false }),
    supabase.from('vm_ais_health_dashboard_view').select('*').in('account_id', scopedAccountIds).order('account_id'),
    (supabase as any).from('vm_telegram_links').select(
      'id,booking_config_id,chat_id,chat_title,active,internal_controls,linked_at,organization_id,link_source'
    ).eq('organization_id', tenant.organizationId).eq('active', true),
    (supabase as any).from('vm_ais_crm_process_match_view').select(
      'account_id,account_email,crm_client_id,crm_client_name,crm_client_email,crm_process_id,service_name,process_status,current_stage,operational_status,match_count'
    ).in('account_id', scopedAccountIds).order('crm_client_name').order('service_name'),
    (supabase as any).from('vm_ais_session_stats_view').select('*').in('account_id', scopedAccountIds).order('account_id'),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_agent_dashboard_view').select('*').order('last_heartbeat_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_agent_services_dashboard_view').select('*').order('agent_id').order('service_key')
      : Promise.resolve({ data: [], error: null }),
    (supabase as any).from('vm_motor_performance_mode_view').select('*')
      .order('sort_order'),
    (supabase as any).from('vm_motor_performance_config_view').select('*')
      .in('booking_config_id', scopedConfigIds)
      .order('booking_config_id'),
    (supabase as any).from('vm_ais_jobs').select('*')
      .in('account_id', scopedAccountIds)
      .order('id', { ascending: false }).limit(300),
    (supabase as any).from('vm_telegram_outbox').select('*')
      .in('booking_config_id', scopedConfigIds)
      .order('id', { ascending: false }).limit(300),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_bot_master_availability_outbox').select('*').order('id', { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_bot_master_promo_publications').select('*').order('id', { ascending: false }).limit(300)
      : Promise.resolve({ data: [], error: null }),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_bot_master_availability_publications').select('*').order('id', { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_notifier_sources').select('*').order('id', { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    (supabase as any).from('vm_appointment_detections')
      .select('id,source,consulate,available_date,detected_at')
      .eq('source', 'BOT MASTER')
      .order('id', { ascending: false }).limit(30),
    canViewSecurity
      ? (tenant.isSuperadmin
          ? (supabase as any).from('vm_security_audit_log').select('*')
              .order('id', { ascending: false }).limit(250)
          : (supabase as any).from('vm_security_audit_log').select('*')
              .eq('organization_id', tenant.organizationId)
              .order('id', { ascending: false }).limit(100))
      : Promise.resolve({ data: [], error: null }),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_organization_dashboard_view').select('*').order('is_internal', { ascending: false }).order('name')
      : (supabase as any).from('vm_organization_dashboard_view').select('*').eq('id', tenant.organizationId),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_organization_users').select('*').eq('active', true).order('organization_id').order('id')
      : (supabase as any).from('vm_organization_users').select('*').eq('organization_id', tenant.organizationId).eq('active', true).order('id'),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_client_onboarding_requests').select('*').order('id', { ascending: false }).limit(100)
      : (supabase as any).from('vm_client_onboarding_requests').select('*').eq('organization_id', tenant.organizationId).order('id', { ascending: false }).limit(100),
    tenant.isSuperadmin
      ? (supabase as any).from('vm_booking_configs').select('id,organization_id,client_id,operational_status,auto_confirm_enabled').order('id')
      : (supabase as any).from('vm_booking_configs').select('id,organization_id,client_id,operational_status,auto_confirm_enabled').eq('organization_id', tenant.organizationId).order('id'),
  ])

  const anyError =
    summaryError || openingsError || windowsError || configsError || eventsError || sessionEventsError || healthRunsError ||
    accountsError || targetsError || clientsError || syncJobsError || healthError || telegramLinksError || crmMatchesError || sessionStatsError || agentError || agentServicesError || performanceModesError || performanceConfigsError ||
    aisJobsError || telegramOutboxError || availabilityOutboxError || promoPublicationsError || availabilityPublicationsError || notifierSourcesError || botMasterDetectionsError ||
    securityAuditError || organizationsError || organizationUsersError || onboardingRequestsError || organizationConfigsError || tenantConfigsBaseError || tenantAccountsBaseError
  const summary = {
    active_configs: (tenantConfigsBase ?? []).filter((row: any) => row.operational_status === 'ACTIVE').length,
    paused_configs: (tenantConfigsBase ?? []).filter((row: any) => row.operational_status === 'PAUSED').length,
    login_required_configs: (tenantConfigsBase ?? []).filter((row: any) => row.operational_status === 'LOGIN_REQUIRED').length,
    error_configs: (tenantConfigsBase ?? []).filter((row: any) => row.operational_status === 'ERROR').length,
  }


  const targetsByAccount = new Map<number, any[]>()
  for (const target of targets ?? []) {
    const accountId = Number(target.account_id)
    targetsByAccount.set(accountId, [
      ...(targetsByAccount.get(accountId) || []),
      target,
    ])
  }

  const targetById = new Map<number, any>(
    (targets ?? []).map((target: any) => [Number(target.id), target])
  )

  const accountById = new Map<number, any>(
    (accounts ?? []).map((account: any) => [Number(account.account_id ?? account.id), account])
  )

  const pendingSyncByAccount = new Map<number, any>()
  for (const job of syncJobs ?? []) {
    const accountId = Number(job.account_id)
    if (!pendingSyncByAccount.has(accountId)) {
      pendingSyncByAccount.set(accountId, job)
    }
  }

  const clientById = new Map<number, any>(
    (clients ?? []).map((client: any) => [Number(client.id), client])
  )

  const healthByAccount = new Map<number, any>(
    (healthRows ?? []).map((row: any) => [Number(row.account_id), row])
  )

  const sessionStatsByAccount = new Map<number, any>(
    (sessionStats ?? []).map((row: any) => [Number(row.account_id), row])
  )

  const telegramLinkByConfig = new Map<number, any>()
  for (const row of telegramLinks ?? []) {
    const configId = Number(row.booking_config_id)
    const current = telegramLinkByConfig.get(configId)
    if (!current || row.link_source === 'ORGANIZATION') {
      telegramLinkByConfig.set(configId, row)
    }
  }


  // ------------------------------------------------------------------
  // Auditoría / Timeline por trámite V3.35
  // ------------------------------------------------------------------
  const rawAuditConfigId = typeof params.audit_config === 'string'
    ? Number(params.audit_config)
    : 0

  const auditConfig =
    (configs ?? []).find((row: any) => Number(row.booking_config_id) === rawAuditConfigId)
    || (configs ?? [])[0]
    || null

  const auditConfigId = auditConfig ? Number(auditConfig.booking_config_id) : 0
  const auditTarget = auditConfig?.ais_target_id ? targetById.get(Number(auditConfig.ais_target_id)) : null
  const auditEventIdentity = (events ?? []).find((row: any) => Number(row.booking_config_id || 0) === auditConfigId)
  const auditClientId = Number(auditConfig?.client_id || auditTarget?.client_id || auditEventIdentity?.client_id || 0)
  const auditAccountId = auditConfig ? Number(auditConfig.account_id) : 0
  const auditTelegramLink = auditConfigId ? telegramLinkByConfig.get(auditConfigId) : null

  type AuditTone = 'GOOD' | 'INFO' | 'WARNING' | 'CRITICAL'
  type AuditEntry = {
    at: string
    tone: AuditTone
    title: string
    detail: string
    source: string
    code?: string | null
    ref?: string | null
  }

  const auditEntries: AuditEntry[] = []
  const auditBookingEventIds = new Set<number>()

  const auditToneForCode = (code?: string | null, eventType?: string | null): AuditTone => {
    const value = String(code || eventType || '').toUpperCase()
    if (
      value.includes('BOOKING_CONFIRMATION_UNCERTAIN')
      || value.includes('SUBMIT_FAILED')
      || value.includes('INVALID_CREDENTIAL')
      || value.includes('LOGIN_FAILED')
      || value === 'ERROR'
    ) return 'CRITICAL'

    if (
      value.includes('SITE_MAINTENANCE')
      || value.includes('TRANSIENT')
      || value.includes('TIMEOUT')
      || value.includes('NO_LONGER_AVAILABLE')
      || value.includes('DATE_NO_LONGER_SELECTABLE')
      || value.includes('LOGIN_REQUIRED')
      || value.includes('FAILED')
    ) return 'WARNING'

    if (
      value.includes('BOOKED_CONFIRMED')
      || value.includes('DRY_RUN_VERIFIED')
      || value.includes('LIVE_ARMED_VERIFIED')
      || value.includes('PAIR_COMPATIBLE')
      || value.includes('CONSULAR_TIME_FOUND')
      || value.includes('LOGIN_SUCCESS')
      || value === 'SENT'
      || value === 'COMPLETED'
    ) return 'GOOD'

    return 'INFO'
  }

  const auditTitleForBookingEvent = (row: any) => {
    const code = String(row.result_code || '').toUpperCase()
    const eventType = String(row.event_type || '').toUpperCase()
    const map: Record<string, string> = {
      CONSULAR_DATES_FOUND: 'Fechas consulares detectadas',
      CONSULAR_TIME_FOUND: 'Horario consular encontrado',
      PAIR_COMPATIBLE: 'Consular + CAS compatibles',
      DRY_RUN_VERIFIED: 'Combinación verificada · DRY RUN',
      LIVE_ARMED_VERIFIED: 'Combinación verificada · LIVE armado',
      BOOKED_CONFIRMED: 'Cita confirmada en AIS',
      NO_COMPATIBLE_PAIR: 'Sin combinación compatible',
      DATE_NO_LONGER_SELECTABLE: 'La fecha dejó de estar disponible',
      NO_LONGER_AVAILABLE: 'La combinación dejó de estar disponible',
      SITE_MAINTENANCE: 'AIS en mantenimiento',
      LOGIN_REQUIRED: 'AIS solicitó iniciar sesión',
      BOOKING_CONFIRMATION_UNCERTAIN: 'Resultado de agendado incierto',
    }
    return map[code] || map[eventType] || row.event_type || code || 'Evento del Motor'
  }

  const auditAppointmentDetail = (row: any) => {
    const parts: string[] = []
    if (row.consulate && row.consular_date) {
      parts.push(`Consular ${row.consulate} · ${fmtDate(row.consular_date)} ${fmtTime(row.consular_time)}`)
    } else if (row.consulate) {
      parts.push(`Consulado ${row.consulate}`)
    }
    if (row.cas_location && row.cas_date) {
      parts.push(`CAS ${row.cas_location} · ${fmtDate(row.cas_date)} ${fmtTime(row.cas_time)}`)
    }
    return parts.join(' · ')
  }

  if (auditConfig) {
    for (const row of events ?? []) {
      if (Number(row.booking_config_id || 0) !== auditConfigId) continue
      auditBookingEventIds.add(Number(row.id))
      const appointment = auditAppointmentDetail(row)
      auditEntries.push({
        at: row.created_at,
        tone: auditToneForCode(row.result_code, row.event_type),
        title: auditTitleForBookingEvent(row),
        detail: [row.message, appointment].filter(Boolean).join(' · ') || 'Evento registrado por el Motor.',
        source: 'Motor AIS',
        code: row.result_code,
        ref: `Evento #${row.id}`,
      })
    }

    for (const run of healthRuns ?? []) {
      if (Number(run.booking_config_id || 0) !== auditConfigId) continue

      const trigger = run.trigger_label || run.run_type || 'SEARCH'
      if (run.started_at) {
        auditEntries.push({
          at: run.started_at,
          tone: 'INFO',
          title: `Búsqueda AIS iniciada · ${trigger}`,
          detail: `Run #${run.id} · Cuenta #${run.account_id || auditAccountId}.`,
          source: 'Motor AIS',
          code: run.run_type || 'SEARCH',
          ref: `Run #${run.id}`,
        })
      }

      if (run.finished_at) {
        const status = String(run.status || '').toUpperCase()
        const resultCode = String(run.result_code || status || '')
        const tone: AuditTone = status === 'ERROR' || status === 'FAILED'
          ? 'WARNING'
          : status === 'NO_MATCH'
            ? 'INFO'
            : 'GOOD'
        const requests = Number(run.ais_request_count || 0)
        const responses = Number(run.ais_response_count || 0)
        const durationMs = Number(run.duration_ms || 0)
        const durationText = durationMs > 0 ? `${(durationMs / 1000).toFixed(1)} s` : '—'
        auditEntries.push({
          at: run.finished_at,
          tone,
          title: status === 'NO_MATCH'
            ? 'Búsqueda finalizada · sin combinación compatible'
            : tone === 'WARNING'
              ? 'Búsqueda AIS terminó con incidencia'
              : 'Búsqueda AIS finalizada',
          detail: `${trigger} · ${requests} request(s) / ${responses} respuesta(s) · duración ${durationText}.`,
          source: 'Motor AIS',
          code: resultCode,
          ref: `Run #${run.id}`,
        })
      }
    }

    for (const job of aisJobs ?? []) {
      if (Number(job.client_id || 0) !== auditClientId || Number(job.account_id || 0) !== auditAccountId) continue

      const target = [job.trigger_consulate || job.consulate, job.trigger_available_date || job.target_date]
        .filter(Boolean)
        .join(' · ')

      auditEntries.push({
        at: job.created_at,
        tone: 'INFO',
        title: `Alerta recibida · ${job.trigger_source || 'Motor'}`,
        detail: target ? `Objetivo ${target}. Job creado y puesto en cola.` : 'Job creado y puesto en cola.',
        source: 'Cola AIS',
        code: job.search_mode,
        ref: `Job #${job.id}`,
      })

      if (job.claimed_at || job.started_at) {
        auditEntries.push({
          at: job.claimed_at || job.started_at,
          tone: 'INFO',
          title: 'Motor tomó el Job',
          detail: `Intento ${Number(job.attempt_count || 1)}. ${target ? `Objetivo ${target}.` : ''}`.trim(),
          source: 'Orquestador',
          code: 'RUNNING',
          ref: `Job #${job.id}`,
        })
      }

      const terminalAt = job.completed_at || job.finished_at || (
        ['COMPLETED', 'FAILED', 'EXPIRED', 'RETRY_LATER'].includes(String(job.status || '').toUpperCase())
          ? job.updated_at
          : null
      )
      if (terminalAt) {
        const status = String(job.status || '').toUpperCase()
        const code = String(job.result_code || status)
        const isBackoff = code.includes('BACKOFF') || status === 'RETRY_LATER'
        auditEntries.push({
          at: terminalAt,
          tone: isBackoff ? 'INFO' : auditToneForCode(code, status),
          title: isBackoff
            ? 'Motor entró en backoff temporal'
            : status === 'COMPLETED'
              ? 'Job completado'
              : status === 'EXPIRED'
                ? 'Alerta expirada'
                : 'Job terminó con incidencia',
          detail: job.result_message || code || status,
          source: 'Cola AIS',
          code,
          ref: `Job #${job.id}`,
        })
      }
    }

    for (const row of sessionEvents ?? []) {
      const sameConfig = Number(row.booking_config_id || 0) === auditConfigId
      const sameClient = Number(row.client_id || 0) === auditClientId && Number(row.account_id || 0) === auditAccountId
      if (!sameConfig && !sameClient) continue

      const type = String(row.event_type || '').toUpperCase()
      const titleMap: Record<string, string> = {
        LOGIN_SUCCESS: 'Sesión AIS restaurada',
        SESSION_EXPIRED: 'AIS cerró la sesión',
        INITIAL_LOGIN_REQUIRED: 'AIS requiere primer inicio de sesión',
        LOGIN_FAILED: 'Falló el inicio de sesión AIS',
      }
      auditEntries.push({
        at: row.occurred_at || row.created_at,
        tone: auditToneForCode(row.result_code, row.event_type),
        title: titleMap[type] || `Sesión AIS · ${row.event_type || 'evento'}`,
        detail: row.message || row.result_code || 'Evento de sesión AIS.',
        source: 'Sesión AIS',
        code: row.result_code,
        ref: row.id ? `Sesión #${row.id}` : null,
      })
    }

    for (const row of telegramOutbox ?? []) {
      if (Number(row.booking_config_id || 0) !== auditConfigId) continue
      const status = String(row.status || '').toUpperCase()
      const at = row.sent_at || row.updated_at || row.created_at
      const title = status === 'SENT'
        ? 'Telegram privado enviado'
        : status === 'FAILED'
          ? 'Telegram privado falló'
          : 'Telegram privado encolado'
      auditEntries.push({
        at,
        tone: status === 'FAILED' ? 'WARNING' : status === 'SENT' ? 'GOOD' : 'INFO',
        title,
        detail: `${row.event_type || 'Notificación'} · ${auditTelegramLink?.chat_title || `Chat ${row.chat_id || 'de la organización'}`}${row.error_message ? ` · ${row.error_message}` : ''}`,
        source: 'Telegram privado',
        code: status,
        ref: `Outbox #${row.id}`,
      })
    }

    for (const row of promoPublications ?? []) {
      if (!auditBookingEventIds.has(Number(row.booking_event_id || 0))) continue
      const status = String(row.status || '').toUpperCase()
      auditEntries.push({
        at: row.sent_at || row.updated_at || row.created_at,
        tone: status === 'FAILED' ? 'WARNING' : status === 'SENT' ? 'GOOD' : 'INFO',
        title: status === 'SENT' ? 'BOOKED_CONFIRMED publicado' : status === 'FAILED' ? 'Publicación pública falló' : 'Publicación pública pendiente',
        detail: row.error_message || `Destino público #${row.destination_id || '—'}.`,
        source: 'Publicador Bot Master',
        code: status,
        ref: `Publicación #${row.id}`,
      })
    }
  }

  auditEntries.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())

  const auditPairCount = auditEntries.filter((row) => String(row.code || '').includes('PAIR_COMPATIBLE')).length
  const auditBookedCount = auditEntries.filter((row) => String(row.code || '').includes('BOOKED_CONFIRMED')).length
  const auditWarningCount = auditEntries.filter((row) => row.tone === 'WARNING' || row.tone === 'CRITICAL').length
  const auditLastActivity = auditEntries[0]?.at || null

  const organizationById = new Map<number, any>(
    (organizations ?? []).map((org: any) => [Number(org.id), org])
  )

  const organizationUsersByOrg = new Map<number, any[]>()
  for (const user of organizationUsers ?? []) {
    const orgId = Number(user.organization_id)
    organizationUsersByOrg.set(orgId, [...(organizationUsersByOrg.get(orgId) || []), user])
  }

  const onboardingByOrg = new Map<number, any[]>()
  for (const request of onboardingRequests ?? []) {
    const orgId = Number(request.organization_id)
    onboardingByOrg.set(orgId, [...(onboardingByOrg.get(orgId) || []), request])
  }

  const crmMatchesByAccount = new Map<number, any[]>()
  for (const match of crmMatches ?? []) {
    const accountId = Number(match.account_id)
    crmMatchesByAccount.set(accountId, [
      ...(crmMatchesByAccount.get(accountId) || []),
      match,
    ])
  }

  const healthTotals = (healthRows ?? []).reduce(
    (acc: any, row: any) => {
      acc.requests1h += Number(row.requests_1h || 0)
      acc.runs1h += Number(row.runs_1h || 0)
      acc.errors1h += Number(row.errors_1h || 0)
      acc.empty1h += Number(row.empty_responses_1h || 0)
      acc.timeouts1h += Number(row.timeouts_1h || 0)
      return acc
    },
    { requests1h: 0, runs1h: 0, errors1h: 0, empty1h: 0, timeouts1h: 0 }
  )

  const consulates = (openings ?? []).map((row: any) => row.consulate)
  const rawSelected = typeof params.consulate === 'string' ? params.consulate.toUpperCase() : ''
  const selectedConsulate =
    (rawSelected && consulates.includes(rawSelected) && rawSelected)
    || (consulates.includes('HERMOSILLO') ? 'HERMOSILLO' : consulates[0])
    || ''

  const selectedOpening = (openings ?? []).find((row: any) => row.consulate === selectedConsulate)
  const selectedWindows = (windows ?? [])
    .filter((row: any) => row.consulate === selectedConsulate)
    .slice(0, 5)

  const activeAgent = (agentRows ?? [])[0] || null

  const activeAgentServices = activeAgent
    ? (agentServices ?? []).filter(
        (row: any) => row.agent_id === activeAgent.agent_id
      )
    : []

  const ageMinutes = (value?: string | null) => {
    if (!value) return null
    const millis = Date.now() - new Date(value).getTime()
    return Number.isFinite(millis) ? Math.max(0, millis / 60000) : null
  }

  const rowTimestamp = (row: any) =>
    row?.updated_at || row?.created_at || row?.detected_at || row?.started_at || row?.scheduled_at || null

  type Incident = {
    severity: 'CRITICAL' | 'WARNING' | 'INFO'
    title: string
    detail: string
    source: string
  }

  const incidents: Incident[] = []
  const expectedServiceKeys = new Set([
    'account_worker',
    'orchestrator',
    'master_notifier',
    'telegram_bot',
    'booking_publisher',
  ])

  if (tenant.isSuperadmin) {
    if (!activeAgent || !['ONLINE', 'RUNNING'].includes(String(activeAgent.effective_status || ''))) {
      incidents.push({
        severity: 'CRITICAL',
        title: 'Visa Master Agent desconectado',
        detail: 'Proyecto Águila no está recibiendo heartbeat normal del Agent.',
        source: 'Infraestructura',
      })
    }

    for (const service of activeAgentServices) {
      if (!expectedServiceKeys.has(String(service.service_key || ''))) continue
      const effective = String(service.effective_status || '')
      const desired = String(service.desired_state || 'RUNNING')
      if (desired !== 'STOPPED' && ['CRASHED', 'ERROR', 'STALE', 'AGENT_OFFLINE', 'OFFLINE'].includes(effective)) {
        incidents.push({
          severity: 'CRITICAL',
          title: `${serviceKeyLabel(service.service_key)} fuera de servicio`,
          detail: service.last_error || `Estado reportado: ${serviceStatusLabel(effective)}.`,
          source: 'Servicios',
        })
      } else if (desired === 'STOPPED') {
        incidents.push({
          severity: 'INFO',
          title: `${serviceKeyLabel(service.service_key)} detenido intencionalmente`,
          detail: 'El Agent conserva este estado hasta que lo inicies desde Servicios.',
          source: 'Servicios',
        })
      }
    }
  }

  for (const account of accounts ?? []) {
    const credential = String(account.credential_status || '')
    if (['INVALID_CREDENTIALS', 'ERROR'].includes(credential)) {
      incidents.push({
        severity: 'CRITICAL',
        title: `Cuenta AIS con error · ${account.account_email || `#${account.account_id}`}`,
        detail: account.credential_error_message || credentialLabel(credential),
        source: 'AIS',
      })
    } else if (credential === 'LOGIN_REQUIRED') {
      incidents.push({
        severity: 'WARNING',
        title: `AIS requiere login · ${account.account_email || `#${account.account_id}`}`,
        detail: 'La cuenta no debe ejecutar búsqueda LIVE hasta restaurar la sesión.',
        source: 'AIS',
      })
    }
  }

  for (const config of configs ?? []) {
    if (!telegramLinkByConfig.has(Number(config.booking_config_id))) {
      incidents.push({
        severity: 'WARNING',
        title: `Telegram sin vincular · ${config.full_name}`,
        detail: 'La organización todavía no tiene un grupo Telegram principal vinculado. Vincúlalo una sola vez desde Organizaciones; todos sus trámites heredarán ese grupo.',
        source: 'Telegram de organización',
      })
    }
  }

  // ------------------------------------------------------------------
  // Incidencias AIS inteligentes
  //
  // Regla operativa:
  // - BACKOFF / RETRY_LATER: protección normal, no es una incidencia.
  // - Falla transitoria + éxito posterior: auto-resuelta y oculta.
  // - 1 falla transitoria sin recuperación: INFO.
  // - 2-3 fallas consecutivas: WARNING.
  // - 4+ fallas consecutivas o >15 min sin recuperar: CRITICAL.
  // - Credenciales / submit incierto: CRITICAL inmediato.
  // ------------------------------------------------------------------

  const SUCCESS_JOB_STATUSES = new Set(['COMPLETED', 'SUCCEEDED'])
  const BACKOFF_CODES = new Set([
    'BACKOFF',
    'BACKOFF_EXPIRED',
    'RETRY_LATER',
  ])

  const jobText = (job: any) =>
    `${job?.result_code || ''} ${job?.result_message || ''}`.toUpperCase()

  const isCredentialJobFailure = (job: any) => {
    const raw = jobText(job)
    return [
      'INVALID_CREDENTIALS',
      'PASSWORD_NOT_CONFIGURED',
      'LOGIN_REQUIRED',
      'AUTH_FAILED',
      'ACCOUNT_NOT_FOUND',
    ].some((token) => raw.includes(token))
  }

  const isBookingCriticalFailure = (job: any) => {
    const raw = jobText(job)
    return [
      'BOOKING_UNCERTAIN',
      'SUBMIT_FAILED',
      'CONFIRMATION_NOT_FOUND',
      'CONFIRMATION_MISSING',
      'POST_SUBMIT',
    ].some((token) => raw.includes(token))
  }

  const isTransientJobFailure = (job: any) => {
    const raw = jobText(job)
    return [
      'TRANSIENT_ERROR',
      'ERR_CONNECTION_REFUSED',
      'ERR_EMPTY_RESPONSE',
      'EMPTY_RESPONSE',
      'NAVIGATION_ERROR',
      'SITE_MAINTENANCE',
      'TIMEOUT',
      'TIMED OUT',
      'LOCATOR.WAIT_FOR',
      'CONNECTIONTERMINATED',
      'REMOTEPROTOCOLERROR',
      'TARGET_REFRESH_ERROR',
    ].some((token) => raw.includes(token))
  }

  const operationalJobMessage = (job: any) => {
    const raw = jobText(job)

    if (raw.includes('ERR_CONNECTION_REFUSED')) {
      return 'AIS rechazó temporalmente la conexión. El Motor puede recuperarse solo en el siguiente intento.'
    }

    if (raw.includes('ERR_EMPTY_RESPONSE') || raw.includes('EMPTY_RESPONSE')) {
      return 'AIS cerró la respuesta sin entregar contenido útil. El Motor volverá a intentar automáticamente.'
    }

    if (raw.includes('TIMEOUT') || raw.includes('LOCATOR.WAIT_FOR') || raw.includes('TIMED OUT')) {
      return 'AIS no terminó de cargar un elemento esperado dentro del tiempo límite. El Motor volverá a intentar.'
    }

    if (raw.includes('SITE_MAINTENANCE')) {
      return 'AIS parece estar en mantenimiento o respondiendo de forma inestable. La cuenta quedó protegida por backoff.'
    }

    if (raw.includes('TRANSIENT_ERROR') || raw.includes('CONNECTIONTERMINATED') || raw.includes('REMOTEPROTOCOLERROR')) {
      return 'AIS tuvo un fallo temporal de navegación/conexión. El Motor volverá a intentar automáticamente.'
    }

    if (isCredentialJobFailure(job)) {
      return 'La cuenta AIS requiere intervención de acceso antes de continuar.'
    }

    if (isBookingCriticalFailure(job)) {
      return 'El intento de agendado quedó en un estado que requiere revisión manual antes de volver a intentar.'
    }

    return job.result_message || 'El Job terminó con error y requiere revisión.'
  }

  const jobMoment = (job: any) => {
    const raw = rowTimestamp(job)
    const millis = raw ? new Date(raw).getTime() : 0
    return Number.isFinite(millis) ? millis : 0
  }

  const jobScopeKey = (job: any) => {
    const accountId = Number(job?.account_id || 0)
    const clientId = Number(job?.client_id || 0)
    if (accountId || clientId) return `${accountId}:${clientId}`
    return `job:${job?.id || 'unknown'}`
  }

  const jobScopeLabel = (job: any) => {
    const client = clientById.get(Number(job?.client_id || 0))
    if (client?.full_name) return client.full_name

    const account = accountById.get(Number(job?.account_id || 0))
    if (account?.account_email) return account.account_email

    return `Cuenta #${job?.account_id || '—'}`
  }

  const jobsByScope = new Map<string, any[]>()
  for (const job of aisJobs ?? []) {
    const key = jobScopeKey(job)
    jobsByScope.set(key, [...(jobsByScope.get(key) || []), job])
  }

  let autoResolvedTransientCount = 0
  let ignoredBackoffCount = 0
  const aisIncidentAccountIds = new Set<number>()

  for (const scopeJobsRaw of jobsByScope.values()) {
    const scopeJobs = [...scopeJobsRaw].sort((a: any, b: any) => {
      const timeDiff = jobMoment(b) - jobMoment(a)
      if (timeDiff !== 0) return timeDiff
      return Number(b.id || 0) - Number(a.id || 0)
    })

    // RUNNING atorado sigue siendo crítico aunque no exista FAILED.
    const stuck = scopeJobs.find((job: any) => {
      if (String(job.status || '') !== 'RUNNING') return false
      const age = ageMinutes(rowTimestamp(job))
      return age !== null && age > 15
    })

    if (stuck) {
      const age = ageMinutes(rowTimestamp(stuck))
      const accountId = Number(stuck.account_id || 0)
      if (accountId) aisIncidentAccountIds.add(accountId)

      incidents.push({
        severity: 'CRITICAL',
        title: `Motor AIS atorado · ${jobScopeLabel(stuck)}`,
        detail: `Job #${stuck.id} lleva aproximadamente ${Math.round(age || 0)} min en RUNNING. Revisa el Orquestador antes de iniciar otro intento.`,
        source: 'Cola AIS',
      })
      continue
    }

    const health = healthByAccount.get(Number(scopeJobs[0]?.account_id || 0))

    // Marcar fallas históricas como recuperadas cuando hubo un Job exitoso
    // posterior o la telemetría AIS registra éxito después del fallo.
    const unresolvedFailures: any[] = []

    for (const job of scopeJobs) {
      if (String(job.status || '') !== 'FAILED') continue

      const code = String(job.result_code || '').toUpperCase()
      if (BACKOFF_CODES.has(code)) {
        ignoredBackoffCount += 1
        continue
      }

      const failedAt = jobMoment(job)

      const laterJobSuccess = scopeJobs.some((candidate: any) =>
        SUCCESS_JOB_STATUSES.has(String(candidate.status || '').toUpperCase())
        && jobMoment(candidate) > failedAt
      )

      const lastSuccessAt = health?.last_success_at
        ? new Date(health.last_success_at).getTime()
        : 0

      const telemetryRecovered =
        Number.isFinite(lastSuccessAt)
        && lastSuccessAt > failedAt

      if (isTransientJobFailure(job) && (laterJobSuccess || telemetryRecovered)) {
        autoResolvedTransientCount += 1
        continue
      }

      unresolvedFailures.push(job)
    }

    if (!unresolvedFailures.length) continue

    const latestFailure = unresolvedFailures[0]
    const accountId = Number(latestFailure.account_id || 0)
    if (accountId) aisIncidentAccountIds.add(accountId)

    // Credencial o submit incierto: escalar inmediatamente.
    if (isCredentialJobFailure(latestFailure) || isBookingCriticalFailure(latestFailure)) {
      incidents.push({
        severity: 'CRITICAL',
        title: `${isBookingCriticalFailure(latestFailure) ? 'Agendado requiere revisión' : 'Acceso AIS requiere intervención'} · ${jobScopeLabel(latestFailure)}`,
        detail: `Job #${latestFailure.id}. ${operationalJobMessage(latestFailure)}`,
        source: 'Cola AIS',
      })
      continue
    }

    if (isTransientJobFailure(latestFailure)) {
      // Contamos únicamente el episodio transitorio actual: fallos consecutivos
      // sin un Job exitoso posterior.
      let consecutive = 0
      for (const job of unresolvedFailures) {
        if (!isTransientJobFailure(job)) break
        consecutive += 1
      }

      const age = ageMinutes(rowTimestamp(latestFailure))
      const severity: Incident['severity'] =
        consecutive >= 4 || (age !== null && age > 15)
          ? 'CRITICAL'
          : consecutive >= 2
            ? 'WARNING'
            : 'INFO'

      const followUp =
        severity === 'INFO'
          ? 'Sin intervención por ahora; el Motor reintentará automáticamente.'
          : severity === 'WARNING'
            ? 'El Motor seguirá intentando, pero conviene vigilar esta cuenta.'
            : 'La cuenta no se ha recuperado; revisa Salud AIS y el Orquestador.'

      incidents.push({
        severity,
        title: `AIS inestable · ${jobScopeLabel(latestFailure)}`,
        detail: `Job #${latestFailure.id} · ${consecutive} fallo(s) transitorio(s) consecutivo(s). ${operationalJobMessage(latestFailure)} ${followUp}`,
        source: 'AIS / red',
      })
      continue
    }

    incidents.push({
      severity: 'WARNING',
      title: `Job AIS requiere revisión · ${jobScopeLabel(latestFailure)}`,
      detail: `Job #${latestFailure.id} · ${latestFailure.result_code || 'FAILED'}. ${operationalJobMessage(latestFailure)}`,
      source: 'Cola AIS',
    })
  }

  for (const row of telegramOutbox ?? []) {
    const status = String(row.status || '')
    const age = ageMinutes(rowTimestamp(row))
    if (status === 'FAILED') {
      incidents.push({
        severity: 'WARNING',
        title: `Telegram privado falló · outbox #${row.id}`,
        detail: `${row.event_type || 'Evento'} para Config #${row.booking_config_id || '—'} no fue enviado.`,
        source: 'Telegram privado',
      })
    } else if (status === 'PENDING' && age !== null && age > 5) {
      incidents.push({
        severity: 'WARNING',
        title: `Telegram privado pendiente · outbox #${row.id}`,
        detail: `Lleva ${Math.round(age)} min pendiente. Revisa Telegram Bot en Servicios.`,
        source: 'Telegram privado',
      })
    }
  }

  for (const row of availabilityOutbox ?? []) {
    const status = String(row.status || '')
    const age = ageMinutes(rowTimestamp(row))
    if (status === 'FAILED') {
      incidents.push({
        severity: 'WARNING',
        title: `Alerta pública Bot Master falló · #${row.id}`,
        detail: `${row.consulate || 'Consulado'} ${row.available_date || ''} · ${row.last_error || 'Se reintentará automáticamente.'}`,
        source: 'Master Notificador',
      })
    } else if (status === 'PENDING' && age !== null && age > 5) {
      incidents.push({
        severity: 'WARNING',
        title: `Alerta pública Bot Master pendiente · #${row.id}`,
        detail: `Lleva ${Math.round(age)} min sin publicarse. Revisa Publicador Bot Master.`,
        source: 'Master Notificador',
      })
    }
  }

  for (const row of promoPublications ?? []) {
    if (String(row.status || '') === 'FAILED') {
      incidents.push({
        severity: 'WARNING',
        title: `Publicación BOOKED_CONFIRMED falló · #${row.id}`,
        detail: row.error_message || 'El Publicador reintentará el destino pendiente.',
        source: 'Publicador Bot Master',
      })
    }
  }

  for (const row of availabilityPublications ?? []) {
    if (String(row.status || '') === 'FAILED') {
      incidents.push({
        severity: 'WARNING',
        title: `Destino de apertura falló · #${row.id}`,
        detail: row.error_message || 'La apertura será reintentada.',
        source: 'Publicador Bot Master',
      })
    }
  }

  for (const health of healthRows ?? []) {
    if (String(health.health_status || '') !== 'DEGRADED') continue

    const accountId = Number(health.account_id || 0)

    // Si ya existe una incidencia AIS activa para esta cuenta, no duplicamos
    // la misma situación desde la vista de Salud AIS.
    if (aisIncidentAccountIds.has(accountId)) continue

    const lastErrorAt = health.last_error_at
      ? new Date(health.last_error_at).getTime()
      : 0
    const lastSuccessAt = health.last_success_at
      ? new Date(health.last_success_at).getTime()
      : 0

    // La salud puede seguir marcada como DEGRADED durante la ventana de 1 h
    // aunque AIS ya haya vuelto a responder. En ese caso se considera recuperado.
    if (
      Number.isFinite(lastSuccessAt)
      && Number.isFinite(lastErrorAt)
      && lastSuccessAt > lastErrorAt
    ) {
      continue
    }

    const consecutive = Math.max(
      Number(health.possible_block_error_runs || 0),
      Number(health.requests_since_last_success || 0),
    )

    const errorAge = ageMinutes(health.last_error_at)
    const severity: Incident['severity'] =
      consecutive >= 4 || (errorAge !== null && errorAge > 15)
        ? 'CRITICAL'
        : consecutive >= 2
          ? 'WARNING'
          : 'INFO'

    incidents.push({
      severity,
      title: `Salud AIS degradada · Cuenta #${health.account_id}`,
      detail: `Errores consecutivos: ${consecutive}. Errores 1 h: ${health.errors_1h || 0} · timeouts: ${health.timeouts_1h || 0} · empty: ${health.empty_responses_1h || 0}. ${
        severity === 'INFO'
          ? 'Seguimiento automático; todavía no requiere intervención.'
          : severity === 'WARNING'
            ? 'Vigila la recuperación automática de la cuenta.'
            : 'La cuenta lleva demasiado tiempo sin recuperarse; requiere revisión.'
      }`,
      source: 'Salud AIS',
    })
  }

  const criticalIncidents = incidents.filter((item) => item.severity === 'CRITICAL')
  const warningIncidents = incidents.filter((item) => item.severity === 'WARNING')
  const infoIncidents = incidents.filter((item) => item.severity === 'INFO')

  const semaphore = criticalIncidents.length
    ? { label: 'INCIDENCIA CRÍTICA', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.38)' }
    : warningIncidents.length
      ? { label: 'ATENCIÓN REQUERIDA', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.38)' }
      : { label: 'OPERACIÓN NORMAL', color: '#10b981', bg: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.38)' }

  const botMasterSource = (notifierSources ?? []).find(
    (row: any) => String(row.source_key || '') === 'BOT_MASTER_AIS'
  )
  const lastBotMasterDetection = (botMasterDetections ?? [])[0] || null
  const expectedServices = activeAgentServices.filter((row: any) => expectedServiceKeys.has(String(row.service_key || '')))
  const onlineServices = expectedServices.filter((row: any) => ['ONLINE', 'RUNNING'].includes(String(row.effective_status || ''))).length
  const validAccounts = (accounts ?? []).filter((row: any) => String(row.credential_status || '') === 'VALID').length
  const linkedConfigs = (configs ?? []).filter((row: any) => telegramLinkByConfig.has(Number(row.booking_config_id))).length
  const pendingPublicAlerts = (availabilityOutbox ?? []).filter((row: any) => ['PENDING', 'FAILED'].includes(String(row.status || ''))).length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Visa Master · Proyecto Águila</span>
          <h1>Motor de Citas</h1>
          <p>Configura por anticipado qué citas puede tomar el motor, vigila incidencias y analiza el comportamiento de cada consulado.</p>
        </div>
        <div
          className={styles.headerStatus}
          style={{ borderColor: semaphore.border, background: semaphore.bg, color: semaphore.color }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: semaphore.color, display: 'inline-block' }} />
          {semaphore.label}
        </div>
      </header>

      <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(59,130,246,.22)', background: 'rgba(59,130,246,.06)' }}>
        🛡️ <strong>Tenant Guard activo</strong> · {tenant.organizationName} · {tenant.role}
        {tenant.canArmLive || tenant.isSuperadmin ? ' · LIVE autorizado' : ' · LIVE requiere autorización'}
      </div>

      {params.updated ? <div className={styles.success}>Configuración actualizada.</div> : null}
      {params.agent_command ? (
        <div className={styles.success}>
          Comando enviado al Visa Master Agent. El panel se actualizará automáticamente.
        </div>
      ) : null}
      {params.improvement_search ? (
        <div className={styles.success}>
          Búsqueda de mejora reactivada. La cita actual se conserva como referencia hasta que AIS confirme una nueva.
        </div>
      ) : null}
      {params.target_refresh_requested ? (
        <div className={styles.success}>
          Verificación de cita enviada al Worker. Solo consultará AIS para ese solicitante/grupo.
        </div>
      ) : null}
      {params.target_refresh_pending ? (
        <div className={styles.success}>
          Ese solicitante/grupo ya tiene una verificación AIS pendiente o en proceso.
        </div>
      ) : null}
      {params.crm_process_linked ? (
        <div className={styles.success}>
          Trámite de Proyecto Águila vinculado al Motor por correo. La configuración quedó lista para revisión.
        </div>
      ) : null}
      {params.error ? <div className={styles.error}>{String(params.error)}</div> : null}
      {anyError ? (
        <div className={styles.error}>
          No pude leer una o más vistas del Motor de Citas.
        </div>
      ) : null}

      <section
        style={{
          margin: '18px 0 8px',
          padding: '18px 20px',
          borderRadius: '18px',
          border: `1px solid ${semaphore.border}`,
          background: semaphore.bg,
          display: 'grid',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: semaphore.color }}>SEMÁFORO GENERAL</span>
            <h2 style={{ margin: '4px 0 0' }}>Bot Master · {semaphore.label}</h2>
          </div>
          <a href="/admin/motor-citas?section=incidencias" style={{ color: 'inherit', fontWeight: 800, textDecoration: 'underline' }}>
            Ver {criticalIncidents.length + warningIncidents.length} incidencia(s)
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>
          {tenant.isSuperadmin ? (
            <div><span>Servicios</span><strong style={{ display: 'block', fontSize: 22 }}>{onlineServices}/{expectedServices.length || 5}</strong></div>
          ) : (
            <div><span>Infraestructura</span><strong style={{ display: 'block', fontSize: 18 }}>Gestionada por Bot Master</strong></div>
          )}
          <div><span>Cuentas AIS válidas</span><strong style={{ display: 'block', fontSize: 22 }}>{validAccounts}/{accounts?.length || 0}</strong></div>
          <div><span>Telegram vinculado</span><strong style={{ display: 'block', fontSize: 22 }}>{linkedConfigs}/{configs?.length || 0}</strong></div>
          <div><span>Alertas públicas pendientes</span><strong style={{ display: 'block', fontSize: 22 }}>{pendingPublicAlerts}</strong></div>
          <div><span>Fuente propia</span><strong style={{ display: 'block', fontSize: 18 }}>{botMasterSource ? 'BOT MASTER ✓' : 'Sin observación aún'}</strong></div>
        </div>
      </section>

      <nav
        aria-label="Secciones del Motor de Citas"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          margin: '18px 0 26px',
          padding: '10px',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.38)',
        }}
      >
        {visibleSectionOptions.map((item) => {
          const active = selectedSection === item.key
          const preserveConsulate =
            item.key === 'aperturas' && selectedConsulate
              ? `&consulate=${encodeURIComponent(selectedConsulate)}`
              : ''
          const preserveAuditConfig =
            item.key === 'auditoria' && auditConfigId
              ? `&audit_config=${auditConfigId}`
              : ''

          return (
            <a
              key={item.key}
              href={`/admin/motor-citas?section=${item.key}${preserveConsulate}${preserveAuditConfig}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40px',
                padding: '9px 14px',
                borderRadius: '11px',
                border: active
                  ? '1px solid rgba(250, 204, 21, 0.75)'
                  : '1px solid rgba(148, 163, 184, 0.20)',
                background: active
                  ? 'rgba(250, 204, 21, 0.13)'
                  : 'rgba(15, 23, 42, 0.28)',
                color: 'inherit',
                fontWeight: active ? 800 : 650,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </a>
          )
        })}
      </nav>

      {selectedSection === 'resumen' ? (
      <section className={styles.summaryGrid}>
        <article><span>Procesos activos</span><strong>{summary.active_configs}</strong></article>
        <article><span>Pausados</span><strong>{summary.paused_configs}</strong></article>
        <article><span>Login requerido</span><strong>{summary.login_required_configs}</strong></article>
        <article><span>Con error</span><strong>{summary.error_configs}</strong></article>
      </section>
      ) : null}

      {selectedSection === 'incidencias' ? (
      <section className={styles.section} id="incidencias">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Watchdog operativo</span>
            <h2>Incidencias de Bot Master</h2>
          </div>
          <p>
            Muestra únicamente incidencias operativas vigentes. BACKOFF es protección normal y los fallos transitorios desaparecen cuando AIS registra una recuperación posterior.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
          <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(239,68,68,.28)' }}>
            <span>Críticas</span><strong style={{ display: 'block', fontSize: 28 }}>{criticalIncidents.length}</strong>
          </article>
          <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(245,158,11,.28)' }}>
            <span>Advertencias</span><strong style={{ display: 'block', fontSize: 28 }}>{warningIncidents.length}</strong>
          </article>
          <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(148,163,184,.28)' }}>
            <span>Informativas</span><strong style={{ display: 'block', fontSize: 28 }}>{infoIncidents.length}</strong>
          </article>
          <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(16,185,129,.28)' }}>
            <span>Auto-resueltas</span><strong style={{ display: 'block', fontSize: 28 }}>{autoResolvedTransientCount}</strong>
            <small>Fallas transitorias con éxito AIS posterior.</small>
          </article>
          <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(59,130,246,.28)' }}>
            <span>Backoff ignorado</span><strong style={{ display: 'block', fontSize: 28 }}>{ignoredBackoffCount}</strong>
            <small>Protecciones normales, no errores.</small>
          </article>
          <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(16,185,129,.28)' }}>
            <span>Última detección Bot Master</span>
            <strong style={{ display: 'block', fontSize: 16 }}>{lastBotMasterDetection ? fmtDateTime(lastBotMasterDetection.detected_at) : 'Aún sin detecciones V3.32'}</strong>
          </article>
        </div>

        {autoResolvedTransientCount > 0 ? (
          <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(16,185,129,.25)', background: 'rgba(16,185,129,.06)' }}>
            <strong>{autoResolvedTransientCount} falla(s) transitoria(s) auto-resueltas.</strong>
            <span style={{ display: 'block', marginTop: 4 }}>
              Se ocultaron del semáforo porque AIS registró un éxito posterior al fallo.
            </span>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 10 }}>
          {incidents.length ? incidents.map((incident, index) => {
            const color = incident.severity === 'CRITICAL' ? '#ef4444' : incident.severity === 'WARNING' ? '#f59e0b' : '#94a3b8'
            return (
              <article
                key={`${incident.source}-${incident.title}-${index}`}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: `1px solid ${color}55`,
                  background: `${color}0D`,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(110px, 150px) 1fr',
                  gap: 14,
                }}
              >
                <div>
                  <strong style={{ color }}>{incident.severity}</strong>
                  <span style={{ display: 'block', marginTop: 4 }}>{incident.source}</span>
                </div>
                <div>
                  <strong>{incident.title}</strong>
                  <span style={{ display: 'block', marginTop: 4 }}>{incident.detail}</span>
                </div>
              </article>
            )
          }) : (
            <div style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(16,185,129,.28)', background: 'rgba(16,185,129,.06)' }}>
              <strong>Sin incidencias operativas.</strong>
              <span style={{ display: 'block', marginTop: 6 }}>Agent, AIS y colas principales se ven normales.</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, padding: 16, borderRadius: 14, border: '1px solid rgba(148,163,184,.22)', background: 'rgba(148,163,184,.04)' }}>
          <strong>Cómo leer la severidad</strong>
          <span style={{ display: 'block', marginTop: 6 }}>
            INFO = 1 fallo transitorio y reintento automático · WARNING = 2–3 fallos consecutivos · CRITICAL = 4+ fallos, más de 15 min sin recuperar, credenciales inválidas o agendado incierto.
          </span>
        </div>

        <div style={{ marginTop: 20, padding: 16, borderRadius: 14, border: '1px solid rgba(148,163,184,.22)' }}>
          <strong>Sensor propio de aperturas</strong>
          <span style={{ display: 'block', marginTop: 6 }}>
            {botMasterSource
              ? `${botMasterSource.display_name || 'Bot Master · Buscador AIS'} está registrado como fuente propia.`
              : 'Se registrará automáticamente como BOT MASTER en la primera fecha visible que detecte V3.32.'}
          </span>
          {lastBotMasterDetection ? (
            <span style={{ display: 'block', marginTop: 6 }}>
              Última observación: {lastBotMasterDetection.consulate} · {fmtDate(lastBotMasterDetection.available_date)} · {fmtDateTime(lastBotMasterDetection.detected_at)}
            </span>
          ) : null}
        </div>
      </section>
      ) : null}

      {selectedSection === 'seguridad' ? (
      <section className={styles.section} id="seguridad">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Tenant Guard V3.38.4</span>
            <h2>Auditoría de seguridad</h2>
          </div>
          <p>
            {tenant.isSuperadmin ? <><strong>Vista global</strong> · todas las organizaciones · </> : <>Organización: <strong>{tenant.organizationName}</strong> · </>}
            Rol: <strong>{tenant.role}</strong> · LIVE: <strong>{tenant.canArmLive || tenant.isSuperadmin ? 'permitido' : 'sin permiso'}</strong>
          </p>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {(securityAudit ?? []).length ? (securityAudit ?? []).map((row: any) => (
            <article key={row.id} style={{ padding: 14, borderRadius: 14, border: `1px solid ${row.allowed ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.35)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong>{row.allowed ? '✓ PERMITIDO' : '⛔ BLOQUEADO'} · {row.action}</strong>
                <small>{fmtDateTime(row.created_at)}</small>
              </div>
              <span style={{ display: 'block', marginTop: 5 }}>
                {tenant.isSuperadmin
                  ? `${organizationById.get(Number(row.organization_id))?.name || `Organización #${row.organization_id}`} · `
                  : ''}
                {row.actor_channel} · {row.actor_role || 'sin rol'} · {row.resource_type || 'recurso'} {row.resource_id ? `#${row.resource_id}` : ''}
              </span>
              {row.reason ? <small style={{ display: 'block', marginTop: 5 }}>{row.reason}</small> : null}
            </article>
          )) : (
            <div className={styles.emptyState}>Sin eventos de seguridad registrados en el alcance visible.</div>
          )}
        </div>
      </section>
      ) : null}

      {selectedSection === 'organizaciones' ? (
      <section className={styles.section} id="organizaciones">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Multiagencia / SaaS</span>
            <h2>Organizaciones y Telegram</h2>
          </div>
          <p>
            Cada agencia vincula un solo grupo. Todos sus clientes actuales y futuros heredan ese grupo y los permisos se controlan por usuario.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
          {(organizations ?? []).map((org: any) => {
            const users = organizationUsersByOrg.get(Number(org.id)) || []
            const pending = (onboardingByOrg.get(Number(org.id)) || []).filter((r: any) => r.status === 'PENDING_AIS')
            return (
              <article
                key={org.id}
                id={`organization-${org.id}`}
                style={{ padding: 18, borderRadius: 16, border: '1px solid rgba(148,163,184,.24)', display: 'grid', gap: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 12, opacity: .7 }}>{org.is_internal ? 'INTERNO' : org.organization_type}</span>
                    <strong style={{ display: 'block', fontSize: 21 }}>{org.name}</strong>
                    <small>Org #{org.id} · {org.slug}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block' }}>{org.telegram_chat_id ? '✓ Telegram vinculado' : 'Telegram pendiente'}</strong>
                    <small>{org.telegram_chat_title || 'Sin grupo principal'}</small>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <div><span>Clientes</span><strong style={{ display: 'block', fontSize: 22 }}>{org.client_count || 0}</strong></div>
                  <div><span>Motores</span><strong style={{ display: 'block', fontSize: 22 }}>{org.config_count || 0}</strong></div>
                  <div><span>Usuarios</span><strong style={{ display: 'block', fontSize: 22 }}>{org.user_count || 0}</strong></div>
                  <div><span>Altas pendientes</span><strong style={{ display: 'block', fontSize: 22 }}>{org.pending_onboarding_count || 0}</strong></div>
                </div>

                {org.telegram_chat_id ? (
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(16,185,129,.07)', border: '1px solid rgba(16,185,129,.22)' }}>
                    <strong>Grupo principal: {org.telegram_chat_title || org.telegram_chat_id}</strong>
                    <span style={{ display: 'block', marginTop: 4 }}>
                      Las nuevas configuraciones de esta organización se vinculan automáticamente; ya no se usa /vincular por cliente.
                    </span>
                    <form action={unlinkOrganizationTelegram} style={{ marginTop: 10 }}>
                      <input type="hidden" name="organization_id" value={org.id} />
                      <button type="submit" className={styles.secondaryButton}>Desvincular grupo</button>
                    </form>
                  </div>
                ) : (
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.22)' }}>
                    {org.telegram_link_code ? (
                      <>
                        <strong>Código temporal: <code>{org.telegram_link_code}</code></strong>
                        <span style={{ display: 'block', marginTop: 6 }}>
                          En el grupo privado agrega Bot Master y escribe: <code>/vincular_agencia {org.telegram_link_code}</code>
                        </span>
                        <small>Vence: {fmtDateTime(org.telegram_link_code_expires_at)}</small>
                      </>
                    ) : (
                      <span>Genera un código de un solo uso para vincular el grupo de esta organización.</span>
                    )}
                    <form action={generateOrganizationTelegramCode} style={{ marginTop: 10 }}>
                      <input type="hidden" name="organization_id" value={org.id} />
                      <button type="submit" className={styles.primaryButton}>Generar código Telegram</button>
                    </form>
                  </div>
                )}

                {users.length ? (
                  <div>
                    <strong>Usuarios autorizados</strong>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {users.map((u: any) => (
                        <span key={u.id} className={styles.badge}>
                          {u.display_name || u.telegram_username || u.telegram_user_id} · {u.role}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {pending.length ? (
                  <div>
                    <strong>Altas desde Telegram pendientes de AIS</strong>
                    {pending.slice(0, 8).map((r: any) => (
                      <span key={r.id} style={{ display: 'block', marginTop: 5 }}>
                        #{r.id} · {r.full_name} · {r.ais_email || 'sin correo'} · {r.visa_type || 'Visa'}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        {tenant.isSuperadmin ? (
          <div style={{ padding: 18, borderRadius: 16, border: '1px solid rgba(59,130,246,.24)' }}>
            <strong style={{ fontSize: 18 }}>Nueva agencia / cliente comercial</strong>
            <form action={createBotMasterOrganization} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, marginTop: 12, alignItems: 'end' }}>
              <label><span>Nombre</span><input name="organization_name" required placeholder="Ej. Agencia Sonora Visas" /></label>
              <label><span>Slug opcional</span><input name="organization_slug" placeholder="agencia-sonora" /></label>
              <label><span>Tipo</span><select name="organization_type" defaultValue="AGENCY"><option value="AGENCY">Agencia</option><option value="DIRECT_CLIENT">Cliente directo</option></select></label>
              <button type="submit" className={styles.primaryButton}>Crear organización</button>
            </form>
          </div>
        ) : null}
      </section>
      ) : null}

      {selectedSection === 'rendimiento' ? (
      <section className={styles.section} id="rendimiento">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Experimentos operativos</span>
            <h2>Rendimiento del Motor</h2>
          </div>
          <p>
            Compara los cuatro modos con telemetría real. Por ahora hay muestra activa en tres; Intensive queda listo para cuando lo probemos.
          </p>
        </div>

        <div className={styles.performanceModeGrid}>
          {(performanceModes ?? []).map((row: any) => {
            const hasSample =
              Number(row.search_runs_7d || 0) > 0
              || Number(row.alert_jobs_7d || 0) > 0

            return (
              <article className={styles.performanceModeCard} key={row.search_mode}>
                <div className={styles.performanceModeHead}>
                  <div>
                    <span>Modo</span>
                    <strong>{modeExperimentLabel(row.search_mode)}</strong>
                  </div>
                  <span className={hasSample ? styles.sampleActive : styles.sampleEmpty}>
                    {hasSample ? 'Datos activos' : 'Sin muestra'}
                  </span>
                </div>

                <div className={styles.performancePrimary}>
                  <div>
                    <span>Búsquedas · 24 h</span>
                    <strong>{row.search_runs_24h ?? 0}</strong>
                  </div>
                  <div>
                    <span>Requests AIS · 24 h</span>
                    <strong>{row.ais_requests_24h ?? 0}</strong>
                  </div>
                  <div>
                    <span>Errores · 24 h</span>
                    <strong>{row.errors_24h ?? 0}</strong>
                  </div>
                </div>

                <div className={styles.performanceFunnel}>
                  <div><span>Fecha</span><strong>{row.consular_dates_found_7d ?? 0}</strong></div>
                  <div><span>Horario</span><strong>{row.consular_times_found_7d ?? 0}</strong></div>
                  <div><span>CAS</span><strong>{row.cas_pairs_found_7d ?? 0}</strong></div>
                  <div><span>Booked</span><strong>{row.booked_confirmed_7d ?? 0}</strong></div>
                </div>

                <div className={styles.performanceSmall}>
                  <span>
                    Clientes activos:
                    <strong> {row.active_clients ?? 0}</strong>
                  </span>
                  <span>
                    Requests/búsqueda:
                    <strong> {row.avg_requests_per_search_7d ?? '—'}</strong>
                  </span>
                  <span>
                    Duración promedio:
                    <strong> {fmtSeconds(row.avg_search_seconds_7d)}</strong>
                  </span>
                </div>

                {['ALERT_ONLY', 'INTELLIGENT'].includes(String(row.search_mode)) ? (
                  <div className={styles.alertPerformance}>
                    <div>
                      <span>Alertas · 7 d</span>
                      <strong>{row.alert_jobs_7d ?? 0}</strong>
                    </div>
                    <div>
                      <span>Fecha viva</span>
                      <strong>{row.alert_date_found_7d ?? 0}</strong>
                    </div>
                    <div>
                      <span>Horario</span>
                      <strong>{row.alert_time_found_7d ?? 0}</strong>
                    </div>
                    <div>
                      <span>CAS</span>
                      <strong>{row.alert_pair_found_7d ?? 0}</strong>
                    </div>
                    <div>
                      <span>Latencia</span>
                      <strong>{fmtSeconds(row.avg_alert_reaction_seconds_7d)}</strong>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        <div className={styles.performanceConfigList}>
          {(performanceConfigs ?? []).map((row: any) => (
            <article className={styles.performanceConfigCard} key={row.booking_config_id}>
              <div className={styles.performanceConfigIdentity}>
                <div>
                  <span>Config #{row.booking_config_id}</span>
                  <strong>{row.full_name}</strong>
                  <small>
                    {modeExperimentLabel(row.search_mode)} ·
                    {' '}{(row.allowed_consulates || []).join(', ') || 'Sin consulado'}
                  </small>
                </div>
                <span className={row.operational_status === 'ACTIVE' ? styles.sampleActive : styles.sampleEmpty}>
                  {row.operational_status}
                </span>
              </div>

              <div className={styles.performanceConfigMetrics}>
                <div><span>Búsquedas 24 h</span><strong>{row.search_runs_24h ?? 0}</strong></div>
                <div><span>Requests 24 h</span><strong>{row.ais_requests_24h ?? 0}</strong></div>
                <div><span>Errores 24 h</span><strong>{row.errors_24h ?? 0}</strong></div>
                <div><span>Fechas 7 d</span><strong>{row.consular_dates_found_7d ?? 0}</strong></div>
                <div><span>Horarios 7 d</span><strong>{row.consular_times_found_7d ?? 0}</strong></div>
                <div><span>CAS 7 d</span><strong>{row.cas_pairs_found_7d ?? 0}</strong></div>
                <div><span>Booked 7 d</span><strong>{row.booked_confirmed_7d ?? 0}</strong></div>
                <div><span>Alertas 7 d</span><strong>{row.alert_jobs_7d ?? 0}</strong></div>
              </div>

              {Number(row.alert_jobs_7d || 0) > 0 ? (
                <div className={styles.performanceConfigAlert}>
                  <span>
                    Alerta → búsqueda:
                    <strong> {fmtSeconds(row.avg_alert_reaction_seconds_7d)}</strong>
                  </span>
                  <span>
                    Fecha encontrada:
                    <strong> {row.alert_date_found_7d ?? 0}</strong>
                  </span>
                  <span>
                    Horario:
                    <strong> {row.alert_time_found_7d ?? 0}</strong>
                  </span>
                  <span>
                    CAS:
                    <strong> {row.alert_pair_found_7d ?? 0}</strong>
                  </span>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className={styles.performanceNote}>
          Las métricas de fecha/horario y funnel de alertas comienzan a ser más completas desde V15.
          Los contadores de requests y ejecuciones conservan el histórico ya capturado por V11+.
        </div>
      </section>
      ) : null}

      {selectedSection === 'servicios' ? (
      <section className={styles.section} id="servicios">
        <ServiceAutoRefresh seconds={10} />

        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Infraestructura local</span>
            <h2>Servicios Visa Master</h2>
          </div>
          <p>
            El Agent mantiene vivos los procesos de la oficina y permite iniciarlos, detenerlos y reiniciarlos desde Proyecto Águila.
          </p>
        </div>

        {!activeAgent ? (
          <div className={styles.agentEmpty}>
            <strong>Visa Master Agent todavía no conectado.</strong>
            <span>
              Ejecuta <code>visa_master_agent_v1_3_1.py</code> en la PC de la oficina.
            </span>
          </div>
        ) : (
          <>
            <div className={styles.agentHeader}>
              <div>
                <span>Agent activo</span>
                <strong>{activeAgent.hostname || activeAgent.agent_id}</strong>
                <small>
                  {activeAgent.agent_id} · {activeAgent.agent_version || 'V1'} ·
                  heartbeat hace {activeAgent.heartbeat_age_seconds ?? '—'} s
                </small>
              </div>

              <div className={styles.agentHeaderActions}>
                <span
                  className={
                    activeAgent.effective_status === 'ONLINE'
                      ? styles.serviceOnline
                      : styles.serviceOffline
                  }
                >
                  {serviceStatusLabel(activeAgent.effective_status)}
                </span>

                <form action={requestAgentCommand}>
                  <input type="hidden" name="agent_id" value={activeAgent.agent_id} />
                  <input type="hidden" name="command" value="RESTART_ALL" />
                  <button type="submit" className={styles.restartAllButton}>
                    Reiniciar todos
                  </button>
                </form>
              </div>
            </div>

            <div className={styles.serviceGrid}>
              {activeAgentServices.map((service: any) => (
                <article
                  key={`${service.agent_id}-${service.service_key}`}
                  className={styles.serviceCard}
                >
                  <div className={styles.serviceCardTop}>
                    <div>
                      <span>{serviceKeyLabel(service.service_key)}</span>
                      <strong>
                        PID {service.pid || '—'}
                      </strong>
                    </div>

                    <span className={serviceStatusClass(service.effective_status)}>
                      {serviceStatusLabel(service.effective_status)}
                    </span>
                  </div>

                  <div className={styles.serviceMeta}>
                    <span>
                      Heartbeat:
                      <strong>
                        {' '}
                        {service.heartbeat_age_seconds === null
                          || service.heartbeat_age_seconds === undefined
                          ? '—'
                          : `${service.heartbeat_age_seconds} s`}
                      </strong>
                    </span>

                    <span>
                      Reinicios:
                      <strong> {service.restart_count ?? 0}</strong>
                    </span>

                    <span>
                      Último inicio:
                      <strong> {fmtDateTime(service.started_at)}</strong>
                    </span>
                  </div>

                  {service.last_error ? (
                    <div className={styles.serviceError}>
                      {String(service.last_error)}
                    </div>
                  ) : null}

                  <div className={styles.agentHeaderActions}>
                    {service.desired_state === 'STOPPED' || service.effective_status === 'STOPPED' ? (
                      <form action={requestAgentCommand}>
                        <input type="hidden" name="agent_id" value={activeAgent.agent_id} />
                        <input type="hidden" name="service_key" value={service.service_key} />
                        <input type="hidden" name="command" value="START_SERVICE" />
                        <button type="submit" className={styles.serviceRestartButton}>
                          ▶ Iniciar servicio
                        </button>
                      </form>
                    ) : (
                      <>
                        <form action={requestAgentCommand}>
                          <input type="hidden" name="agent_id" value={activeAgent.agent_id} />
                          <input type="hidden" name="service_key" value={service.service_key} />
                          <input type="hidden" name="command" value="STOP_SERVICE" />
                          <button type="submit" className={styles.serviceRestartButton}>
                            ■ Detener servicio
                          </button>
                        </form>

                        <form action={requestAgentCommand}>
                          <input type="hidden" name="agent_id" value={activeAgent.agent_id} />
                          <input type="hidden" name="service_key" value={service.service_key} />
                          <input type="hidden" name="command" value="RESTART_SERVICE" />
                          <button type="submit" className={styles.serviceRestartButton}>
                            ↻ Reiniciar servicio
                          </button>
                        </form>
                      </>
                    )}
                  </div>

                  {service.service_key === 'orchestrator' ? (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className={String(service.log_tail || '').includes('PROXY EFFECTIVE: OFF') ? styles.serviceOnline : styles.serviceWarning}>
                        {String(service.log_tail || '').includes('PROXY EFFECTIVE: OFF')
                          ? 'Proxy efectivo: PAUSADO'
                          : String(service.log_tail || '').includes('PROXY EFFECTIVE: ON')
                            ? 'Proxy efectivo: ACTIVO'
                            : 'Proxy efectivo: sin confirmar'}
                      </span>
                      <span className={styles.serviceNeutral}>
                        Runtime actual: {String(service.log_tail || '').includes('BOT MASTER ORQUESTADOR V3.38.4') ? 'V3.38.4' : 'revisar log'}
                      </span>
                    </div>
                  ) : null}

                  <details className={styles.serviceLogDetails}>
                    <summary>Ver últimas líneas</summary>
                    <div className={styles.serviceLogMeta}>
                      Actualizado: {fmtDateTime(service.log_updated_at)}
                    </div>
                    <pre className={styles.serviceLog}>
                      {service.log_tail || 'El Agent todavía no ha publicado líneas de este log.'}
                    </pre>
                  </details>
                </article>
              ))}
            </div>

            <div className={styles.agentFootnote}>
              El Agent reinicia automáticamente un proceso si se cae.
              Si Windows entra en suspensión, ningún proceso puede continuar;
              configura la PC para que pueda apagar pantalla pero no suspenderse.
            </div>
          </>
        )}
      </section>
      ) : null}

      {selectedSection === 'preflight' ? (
      <section className={styles.section} id="preflight">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Control antes de LIVE</span>
            <h2>Preflight de clientes</h2>
          </div>
          <p>
            Revisa que cuenta, target, cita, fechas y reglas estén listas antes de armar una confirmación automática.
          </p>
        </div>

        <div className={styles.configList}>
          {(configs ?? []).map((config: any) => {
            const target = config.ais_target_id
              ? targetById.get(Number(config.ais_target_id))
              : null
            const account = accountById.get(Number(config.account_id))
            const telegramLink = telegramLinkByConfig.get(Number(config.booking_config_id))
            const preflight = buildBookingPreflight(config, account, target, telegramLink)

            return (
              <details
                className={styles.configCard}
                key={`preflight-${config.booking_config_id}`}
                id={`preflight-${config.booking_config_id}`}
                open={!preflight.ready || config.auto_confirm_enabled}
              >
                <summary>
                  <div className={styles.clientBlock}>
                    <div className={styles.badgeRow}>
                      <span className={preflight.ready ? styles.autoConfirmOn : styles.autoConfirmOff}>
                        {preflight.ready ? 'PREFLIGHT LISTO' : `PREFLIGHT: ${preflight.blocking.length} PENDIENTE(S)`}
                      </span>
                      <span className={config.auto_confirm_enabled ? styles.autoConfirmOn : styles.autoConfirmOff}>
                        {config.auto_confirm_enabled ? 'ARMADO EN ÁGUILA' : 'DRY RUN / DESARMADO'}
                      </span>
                      <span className={styles.badge}>Config #{config.booking_config_id}</span>
                      <span className={styles.badge}>Cuenta #{config.account_id}</span>
                    </div>
                    <strong>{config.full_name}</strong>
                    <small>{config.account_email}</small>
                  </div>

                  <div className={styles.currentAppointment}>
                    <span>Cita efectiva</span>
                    <strong>{fmtDate(preflight.effectiveCurrentDate)}</strong>
                    <small>
                      {target?.appointment_verified_at
                        ? (target?.appointment_verified_has_current === false ? 'AIS verificado: sin cita' : target?.current_consulate || 'AIS verificado')
                        : 'Pendiente verificar AIS'}
                    </small>
                  </div>

                  <div className={styles.rulePreview}>
                    <span>Rango</span>
                    <strong>{fmtDate(config.acceptable_date_from)} → {fmtDate(config.acceptable_date_to)}</strong>
                    <small>Mejora mínima: {Math.max(1, Number(config.minimum_improvement_days || 0))} día(s)</small>
                  </div>

                  <div className={styles.rulePreview}>
                    <span>Estado LIVE</span>
                    <strong>{config.auto_confirm_enabled ? 'ARMADO' : 'BLOQUEADO'}</strong>
                    <small>El seguro maestro local VM_LIVE_BOOKING_ENABLED se valida al ejecutar.</small>
                  </div>
                </summary>

                <div className={styles.badgeRow}>
                  {preflight.checks.map((check) => (
                    <span
                      key={check.key}
                      className={check.ok ? styles.aisVerifiedBadge : styles.aisNoAppointmentBadge}
                      title={check.detail}
                    >
                      {check.ok ? '✓' : '✕'} {check.label}
                    </span>
                  ))}
                </div>

                {!telegramLink ? (
                  <div
                    style={{
                      margin: '12px 0',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: '1px solid rgba(245, 158, 11, 0.38)',
                      background: 'rgba(245, 158, 11, 0.08)',
                      display: 'grid',
                      gap: '6px',
                    }}
                  >
                    <strong>Telegram de organización requerido antes de LIVE</strong>
                    <span>
                      Vincula una sola vez el grupo privado de la agencia/cliente desde la sección <b>Organizaciones</b>
                      con <code>/vincular_agencia CODIGO</code>. Este trámite y los futuros heredarán ese grupo automáticamente.
                    </span>
                  </div>
                ) : null}

                <div className={styles.improvementAction}>
                  <div>
                    <strong>{preflight.ready ? 'Configuración lista para armar' : 'Completa los requisitos pendientes'}</strong>
                    <span>
                      {preflight.ready
                        ? 'Proyecto Águila permitirá ARMAR este proceso. El Worker todavía exige el seguro maestro local antes de cualquier submit.'
                        : preflight.blocking.map((item) => `${item.label}: ${item.detail}`).join(' · ')}
                    </span>
                  </div>

                  <div className={styles.topOperationalActions}>
                    {!target?.appointment_verified_at && target?.id ? (
                      <a href="?section=cuentas-ais#cuentas-ais" className={styles.secondaryButton}>
                        Verificar cita AIS
                      </a>
                    ) : null}

                    <a href="?section=agendados#agendados" className={styles.secondaryButton}>
                      Editar reglas
                    </a>

                    <form action={setAutoConfirmState}>
                      <input type="hidden" name="booking_config_id" value={config.booking_config_id} />
                      <input
                        type="hidden"
                        name="next_state"
                        value={config.auto_confirm_enabled ? 'DISARMED' : 'ARMED'}
                      />
                      <button
                        type="submit"
                        disabled={!config.auto_confirm_enabled && !preflight.ready}
                        className={config.auto_confirm_enabled ? styles.secondaryButton : styles.startButton}
                      >
                        {config.auto_confirm_enabled ? 'Desarmar' : 'Armar para LIVE'}
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            )
          })}

          {!configs?.length ? <div className={styles.empty}>Todavía no hay configuraciones para revisar.</div> : null}
        </div>
      </section>
      ) : null}

      {selectedSection === 'cuentas-ais' ? (
      <section className={styles.section} id="cuentas-ais">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Accesos y procesos</span>
            <h2>Cuentas AIS</h2>
          </div>
          <p>
            Registra cuentas, valida el acceso y elige qué solicitante o grupo de cada cuenta quieres trabajar.
          </p>
        </div>

        <details className={styles.addAccountCard}>
          <summary>+ Agregar cuenta AIS</summary>
          <form action={addAisAccount} className={styles.accountForm}>
            <label>
              <span>Nombre interno · opcional</span>
              <input name="display_name" placeholder="Ej. Familia López" autoComplete="off" />
            </label>

            <label>
              <span>Usuario / correo AIS</span>
              <input
                name="account_email"
                type="email"
                required
                placeholder="correo@ejemplo.com"
                autoComplete="username"
              />
            </label>

            <label>
              <span>Contraseña AIS</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••••"
              />
              <small>Se cifra en el servidor y nunca vuelve a mostrarse en pantalla.</small>
            </label>

            <button type="submit" className={styles.primaryButton}>
              Guardar y validar cuenta
            </button>
          </form>
        </details>

        <div className={styles.accountsList}>
          {(accounts ?? []).map((account: any) => {
            const accountId = Number(account.account_id)
            const accountTargets = targetsByAccount.get(accountId) || []
            const accountCrmMatches = crmMatchesByAccount.get(accountId) || []
            const pendingJob = pendingSyncByAccount.get(accountId)

            return (
              <details className={styles.accountCard} key={accountId}>
                <summary className={styles.accountSummary}>
                  <div>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.credentialBadge} ${credentialClass(account.credential_status)}`}>
                        {credentialLabel(account.credential_status)}
                      </span>
                      {pendingJob ? <span className={styles.syncBadge}>Sincronizando / pendiente</span> : null}
                      {(() => {
                        const health = healthByAccount.get(accountId)
                        return (
                          <span className={`${styles.healthBadge} ${healthClass(health?.health_status)}`}>
                            {healthLabel(health?.health_status)}
                          </span>
                        )
                      })()}
                    </div>
                    <strong>{account.display_name || account.account_email}</strong>
                    <small>{account.account_email}</small>
                  </div>

                  <div className={styles.accountMetric}>
                    <span>Solicitantes / grupos</span>
                    <strong>{account.targets_count ?? accountTargets.length ?? 0}</strong>
                  </div>

                  <div className={styles.accountMetric}>
                    <span>Búsquedas activas</span>
                    <strong>{account.active_searches ?? 0}</strong>
                  </div>

                  <div className={styles.accountMetric}>
                    <span>Última sincronización</span>
                    <strong>{account.last_sync_at ? fmtDate(account.last_sync_at) : 'Pendiente'}</strong>
                  </div>
                </summary>

                <div className={styles.accountBody}>{(account.credential_status === 'INVALID_CREDENTIALS' ||
                    account.credential_status === 'LOGIN_REQUIRED' ||
                    account.credential_status === 'ERROR') ? (
                    <div className={styles.credentialAlert}>
                      <strong>{credentialLabel(account.credential_status)}</strong>
                      <span>
                        {account.credential_error_message ||
                          'La búsqueda de esta cuenta debe permanecer detenida hasta corregir el acceso.'}
                      </span>
                    </div>
                  ) : null}

                  <div className={styles.accountActions}>
                    <form action={requestAisAccountSync}>
                      <input type="hidden" name="account_id" value={accountId} />
                      <button
                        type="submit"
                        className={styles.secondaryButton}
                        disabled={Boolean(pendingJob)}
                      >
                        {pendingJob ? 'Sincronización pendiente' : 'Sincronizar cuenta'}
                      </button>
                    </form>

                    <details className={styles.passwordDetails}>
                      <summary>Actualizar contraseña</summary>
                      <form action={updateAisPassword} className={styles.passwordForm}>
                        <input type="hidden" name="account_id" value={accountId} />
                        <input
                          type="password"
                          name="password"
                          required
                          autoComplete="new-password"
                          placeholder="Nueva contraseña AIS"
                        />
                        <button type="submit" className={styles.secondaryButton}>
                          Guardar y validar
                        </button>
                      </form>
                    </details>
                  </div>

                  <div className={styles.targetsHeading}>
                    <div>
                      <strong>Solicitantes / grupos de la cuenta</strong>
                      <small>
                        El Worker V3 los leerá directamente de AIS al sincronizar.
                      </small>
                    </div>
                  </div>

                  <div className={styles.targetsList}>
                    {accountTargets.map((target: any) => {
                      const linkedClient = target.client_id
                        ? clientById.get(Number(target.client_id))
                        : null

                      return (
                        <article className={styles.targetCard} key={target.id}>
                          <div className={styles.targetTop}>
                            <div>
                              <span className={styles.targetType}>{targetTypeLabel(target.target_type)}</span>
                              <strong>{target.display_name}</strong>
                              <small>
                                {target.target_type === 'GROUP'
                                  ? `${target.member_count || 1} solicitantes`
                                  : '1 solicitante'}
                              </small>
                            </div>

                            <div className={styles.targetAppointment}>
                              <span>Estado actual en AIS</span>
                              <strong>{targetVerificationLabel(target)}</strong>

                              {target.appointment_verified_at ? (
                                target.appointment_verified_has_current ? (
                                  <>
                                    <small>
                                      Consular: {fmtDate(target.current_consular_date)} · {fmtTime(target.current_consular_time)}
                                    </small>
                                    <small>
                                      CAS: {fmtDate(target.current_cas_date)} · {fmtTime(target.current_cas_time)}
                                    </small>
                                  </>
                                ) : (
                                  <small>No se detectó una cita programada en la última verificación.</small>
                                )
                              ) : (
                                <small>
                                  El dato del CRM/AIS previo no se toma como verificación actual hasta pulsar refrescar.
                                </small>
                              )}

                              <small>
                                Última verificación: {fmtDateTime(target.appointment_verified_at)}
                              </small>

                              {target.appointment_refresh_status === 'FAILED' ? (
                                <small className={styles.targetRefreshError}>
                                  {target.appointment_refresh_error_message || 'No fue posible verificar la cita.'}
                                </small>
                              ) : null}

                              <form action={requestTargetAppointmentRefresh} className={styles.targetRefreshForm}>
                                <input type="hidden" name="target_id" value={target.id} />
                                <button
                                  type="submit"
                                  className={styles.secondaryButton}
                                  disabled={['PENDING', 'RUNNING'].includes(String(target.appointment_refresh_status || ''))}
                                >
                                  {['PENDING', 'RUNNING'].includes(String(target.appointment_refresh_status || ''))
                                    ? 'Verificando...'
                                    : '↻ Verificar cita en AIS'}
                                </button>
                              </form>

                              <small>
                                Consulta manual. No busca disponibilidad ni abre calendarios de citas.
                              </small>
                            </div>
                          </div>

                          {linkedClient ? (
                            <div className={styles.targetLinked}>
                              <span>Vinculado a Proyecto Águila</span>
                              <strong>{linkedClient.full_name}</strong>
                              <small>
                                Ya puedes editar sus reglas abajo en Agendados de citas.
                              </small>
                            </div>
                          ) : (
                            <div className={styles.crmMatchPanel}>
                              <div className={styles.crmMatchHeading}>
                                <div>
                                  <span>Asociación con Proyecto Águila</span>
                                  <strong>
                                    {accountCrmMatches.length === 1
                                      ? 'Proceso compatible encontrado por correo'
                                      : accountCrmMatches.length > 1
                                        ? `${accountCrmMatches.length} procesos compatibles con este correo`
                                        : 'Sin proceso compatible por correo'}
                                  </strong>
                                  <small>Correo AIS: {account.account_email}</small>
                                </div>
                                <span className={
                                  accountCrmMatches.length
                                    ? styles.crmMatchOk
                                    : styles.crmMatchMissing
                                }>
                                  {accountCrmMatches.length ? 'Coincidencia CRM' : 'Revisar CRM'}
                                </span>
                              </div>

                              {accountCrmMatches.length === 1 ? (
                                <form action={linkTargetToCrmProcess} className={styles.crmSingleMatch}>
                                  <input type="hidden" name="target_id" value={target.id} />
                                  <input
                                    type="hidden"
                                    name="crm_process_id"
                                    value={accountCrmMatches[0].crm_process_id}
                                  />
                                  <div>
                                    <strong>{accountCrmMatches[0].crm_client_name}</strong>
                                    <span>{accountCrmMatches[0].service_name}</span>
                                    <small>
                                      {accountCrmMatches[0].current_stage
                                        || accountCrmMatches[0].process_status
                                        || 'Proceso activo'}
                                    </small>
                                  </div>
                                  <button type="submit" className={styles.primaryButton}>
                                    Vincular este proceso al Motor
                                  </button>
                                </form>
                              ) : accountCrmMatches.length > 1 ? (
                                <form action={linkTargetToCrmProcess} className={styles.targetLinkForm}>
                                  <input type="hidden" name="target_id" value={target.id} />
                                  <label>
                                    <span>Este correo tiene más de un trámite compatible</span>
                                    <select name="crm_process_id" required defaultValue="">
                                      <option value="" disabled>Seleccionar trámite...</option>
                                      {accountCrmMatches.map((match: any) => (
                                        <option key={match.crm_process_id} value={match.crm_process_id}>
                                          {match.crm_client_name} · {match.service_name} · {match.current_stage || match.process_status || 'Activo'}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <button type="submit" className={styles.primaryButton}>
                                    Vincular trámite seleccionado
                                  </button>
                                </form>
                              ) : (
                                <div className={styles.crmNoMatch}>
                                  <strong>No encontramos un trámite de citas compatible con este correo.</strong>
                                  <span>
                                    Revisa que el correo del cliente en Proyecto Águila coincida con el correo AIS
                                    y que el proceso sea Adelanto de cita o un trámite de visa que utilice citas AIS.
                                  </span>
                                </div>
                              )}

                              <details className={styles.crmTestFallback}>
                                <summary>Solo para pruebas internas</summary>
                                <form action={createClientFromTarget} className={styles.targetLinkForm}>
                                  <input type="hidden" name="target_id" value={target.id} />
                                  <label>
                                    <span>Crear cliente interno del Motor</span>
                                    <input
                                      name="client_name"
                                      defaultValue={target.display_name}
                                      required
                                    />
                                  </label>
                                  <button type="submit" className={styles.secondaryButton}>
                                    Crear cliente de prueba + configuración
                                  </button>
                                </form>
                              </details>
                            </div>
                          )}
                        </article>
                      )
                    })}

                    {!accountTargets.length ? (
                      <div className={styles.emptyAccount}>
                        <strong>Aún no hay solicitantes sincronizados.</strong>
                        <span>
                          La cuenta está lista para que Worker V3 valide el acceso y lea los solicitantes/grupos.
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </details>
            )
          })}

          {!accounts?.length ? (
            <div className={styles.emptyAccount}>
              <strong>No hay cuentas AIS registradas.</strong>
              <span>Agrega la primera cuenta para comenzar.</span>
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      {selectedSection === 'salud-ais' ? (
      <section className={styles.section} id="salud-ais">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Telemetría del Motor</span>
            <h2>Salud de cuentas AIS</h2>
          </div>
          <p>
            Mide solicitudes reales del Motor hacia AIS. Los contadores empiezan a acumularse desde V11.
          </p>
        </div>

        <div className={styles.healthTotals}>
          <article><span>Requests AIS · 60 min</span><strong>{healthTotals.requests1h}</strong></article>
          <article><span>Ejecuciones · 60 min</span><strong>{healthTotals.runs1h}</strong></article>
          <article><span>Errores · 60 min</span><strong>{healthTotals.errors1h}</strong></article>
          <article><span>Empty response · 60 min</span><strong>{healthTotals.empty1h}</strong></article>
          <article><span>Timeouts · 60 min</span><strong>{healthTotals.timeouts1h}</strong></article>
        </div>

        <div className={styles.healthAccounts}>
          {(accounts ?? []).map((account: any) => {
            const accountId = Number(account.account_id)
            const health = healthByAccount.get(accountId)
            const session = sessionStatsByAccount.get(accountId)

            return (
              <article className={styles.healthCard} key={`health-${accountId}`}>
                <div className={styles.healthCardHeader}>
                  <div>
                    <span>Cuenta #{accountId}</span>
                    <strong>{account.display_name || account.account_email}</strong>
                    <small>{account.account_email}</small>
                  </div>
                  <span className={`${styles.healthBadge} ${healthClass(health?.health_status)}`}>
                    {healthLabel(health?.health_status)}
                  </span>
                </div>

                <div className={styles.healthMetrics}>
                  <div><span>Requests 1 h</span><strong>{health?.requests_1h ?? 0}</strong></div>
                  <div><span>Ejecuciones 1 h</span><strong>{health?.runs_1h ?? 0}</strong></div>
                  <div><span>Éxito 24 h</span><strong>{health ? fmtPct(health.success_rate_24h) : '—'}</strong></div>
                  <div><span>HTTP 4xx · 1 h</span><strong>{health?.http_4xx_1h ?? 0}</strong></div>
                  <div><span>HTTP 5xx · 1 h</span><strong>{health?.http_5xx_1h ?? 0}</strong></div>
                  <div><span>Requests fallidos · 1 h</span><strong>{health?.request_failed_1h ?? 0}</strong></div>
                  <div><span>Empty response · 1 h</span><strong>{health?.empty_responses_1h ?? 0}</strong></div>
                  <div><span>Timeouts · 1 h</span><strong>{health?.timeouts_1h ?? 0}</strong></div>
                </div>

                <div className={styles.healthFooter}>
                  <span>Último éxito: <strong>{fmtDateTime(health?.last_success_at)}</strong></span>
                  <span>
                    Último error: <strong>{fmtDateTime(health?.last_error_at)}</strong>
                    {health?.last_error_code ? ` · ${health.last_error_code}` : ''}
                  </span>
                  <span>Actividad: <strong>{fmtDateTime(health?.last_activity_at)}</strong></span>
                </div>


                {health ? (
                  <div className={styles.healthHistory}>
                    <div className={styles.healthHistoryTitle}>
                      <div>
                        <span>Histórico desde V11</span>
                        <strong>Comportamiento acumulado de la cuenta</strong>
                      </div>
                      <span className={`${styles.blockBadge} ${blockClass(health.possible_block_status)}`}>
                        {blockLabel(health.possible_block_status)}
                      </span>
                    </div>

                    <div className={styles.healthHistoryGrid}>
                      <div>
                        <span>Requests acumulados</span>
                        <strong>{health.total_requests ?? 0}</strong>
                      </div>

                      <div>
                        <span>Ejecuciones acumuladas</span>
                        <strong>{health.total_runs ?? 0}</strong>
                      </div>

                      <div>
                        <span>Tiempo real dentro de AIS</span>
                        <strong>{fmtDurationSeconds(health.active_duration_seconds)}</strong>
                      </div>

                      <div>
                        <span>Primera actividad</span>
                        <strong>{fmtDateTime(health.first_activity_at)}</strong>
                      </div>

                      <div>
                        <span>Primer error observado</span>
                        <strong>{fmtDateTime(health.first_error_at)}</strong>
                        {health.first_error_code ? <small>{health.first_error_code}</small> : null}
                      </div>

                      <div>
                        <span>Requests al primer error</span>
                        <strong>
                          {health.requests_at_first_error === null || health.requests_at_first_error === undefined
                            ? '—'
                            : health.requests_at_first_error}
                        </strong>
                      </div>

                      <div>
                        <span>Requests desde último éxito</span>
                        <strong>{health.requests_since_last_success ?? 0}</strong>
                      </div>

                      <div>
                        <span>Errores consecutivos del episodio</span>
                        <strong>{health.possible_block_error_runs ?? 0}</strong>
                      </div>
                    </div>

                    {health.possible_block_status !== 'NONE' ? (
                      <div className={styles.blockEpisode}>
                        <div>
                          <span>Inicio del posible episodio</span>
                          <strong>{fmtDateTime(health.possible_block_started_at)}</strong>
                        </div>

                        <div>
                          <span>Duración</span>
                          <strong>{fmtDurationSeconds(health.possible_block_duration_seconds)}</strong>
                        </div>

                        <div>
                          <span>Último éxito antes</span>
                          <strong>{fmtDateTime(health.last_success_before_block_at)}</strong>
                        </div>

                        <div>
                          <span>Primer éxito después</span>
                          <strong>{fmtDateTime(health.first_success_after_block_at)}</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!health ? (
                  <div className={styles.healthEmpty}>
                    Aún no hay telemetría V11 para esta cuenta. Aparecerá con la siguiente búsqueda.
                  </div>
                ) : null}

                <div className={styles.sessionTelemetry}>
                  <div className={styles.healthHistoryTitle}>
                    <div>
                      <span>Sesión AIS · V14</span>
                      <strong>Frecuencia con la que AIS obliga a iniciar sesión otra vez</strong>
                    </div>
                    <span className={styles.sessionSampleBadge}>
                      {session?.forced_relogins_7d
                        ? `${session.forced_relogins_7d} cierre(s) · 7 d`
                        : 'Recolectando muestra'}
                    </span>
                  </div>

                  <div className={styles.healthHistoryGrid}>
                    <div>
                      <span>Promedio entre cierres · 7 d</span>
                      <strong>{fmtSessionMinutes(session?.avg_session_minutes_7d)}</strong>
                    </div>

                    <div>
                      <span>Mediana · 7 d</span>
                      <strong>{fmtSessionMinutes(session?.median_session_minutes_7d)}</strong>
                    </div>

                    <div>
                      <span>Última duración observada</span>
                      <strong>{fmtSessionMinutes(session?.last_session_minutes)}</strong>
                    </div>

                    <div>
                      <span>Sesión actual</span>
                      <strong>{fmtSessionMinutes(session?.current_session_age_minutes)}</strong>
                    </div>

                    <div>
                      <span>Reinicios sesión · 24 h</span>
                      <strong>{session?.forced_relogins_24h ?? 0}</strong>
                    </div>

                    <div>
                      <span>Reinicios sesión · total V14</span>
                      <strong>{session?.forced_relogins_total ?? 0}</strong>
                    </div>

                    <div>
                      <span>Último cierre detectado</span>
                      <strong>{fmtDateTime(session?.last_session_expired_at)}</strong>
                    </div>

                    <div>
                      <span>Último login correcto</span>
                      <strong>{fmtDateTime(session?.last_login_success_at)}</strong>
                    </div>
                  </div>

                  <div className={styles.sessionFootnote}>
                    El primer login observado por V14 no cuenta como cierre.
                    Con 3 o más cierres la referencia empieza a ser mucho más útil.
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className={styles.healthNote}>
          <strong>Importante:</strong> “Requests AIS” cuenta documentos, XHR y fetch del dominio AIS utilizados por el Motor.
          No cuenta imágenes, CSS ni consultas a Supabase.
          <br />
          <strong>Posible restricción</strong> es una señal operativa, no una confirmación de bloqueo por AIS:
          V12 la marca cuando observa al menos 3 ejecuciones consecutivas con error sin una ejecución exitosa entre ellas.
          Si después vuelve a existir una ejecución exitosa, el episodio queda como recuperado.
        </div>
      </section>
      ) : null}

      {selectedSection === 'aperturas' ? (
      <section className={styles.section} id="aperturas">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Inteligencia de aperturas</span>
            <h2>Movimiento por consulado</h2>
          </div>

          <form method="get" className={styles.consulatePicker}>
            <input type="hidden" name="section" value="aperturas" />
            <label>
              <span>Consulado</span>
              <select name="consulate" defaultValue={selectedConsulate}>
                {consulates.map((consulate: string) => (
                  <option key={consulate} value={consulate}>{prettyCode(consulate)}</option>
                ))}
              </select>
            </label>
            <button type="submit">Ver estadísticas</button>
          </form>
        </div>

        {selectedOpening ? (
          <div className={styles.intelligencePanel}>
            <div className={styles.intelligenceHero}>
              <div>
                <span>Consulado seleccionado</span>
                <h3>{prettyCode(selectedOpening.consulate)}</h3>
              </div>
              <div className={styles.heroCount}>
                <strong>{selectedOpening.distinct_available_dates}</strong>
                <span>fechas distintas<br/>en próximos 30 días</span>
              </div>
            </div>

            <div className={styles.intelligenceMetrics}>
              <article>
                <span>Detecciones 24 h</span>
                <strong>{selectedOpening.detections_last_24h}</strong>
              </article>
              <article>
                <span>Detecciones 7 días</span>
                <strong>{selectedOpening.detections_last_7d}</strong>
              </article>
              <article>
                <span>Primera fecha observada</span>
                <strong>{fmtDate(selectedOpening.earliest_available_date)}</strong>
              </article>
              <article>
                <span>Última fecha observada</span>
                <strong>{fmtDate(selectedOpening.latest_available_date)}</strong>
              </article>
            </div>

            <div className={styles.windowsBlock}>
              <div className={styles.windowsTitle}>
                <span>Horarios con más movimiento observado</span>
                <small>Basado en el histórico disponible de Master Notificador</small>
              </div>
              <div className={styles.windowsGrid}>
                {selectedWindows.map((row: any, index: number) => (
                  <article key={`${row.weekday}-${row.local_hour}-${row.minute_bucket}`}>
                    <span>#{index + 1}</span>
                    <strong>{row.weekday}</strong>
                    <b>{fmtWindow(row)}</b>
                    <small>{row.detections} detecciones · {row.distinct_available_dates} fecha(s)</small>
                  </article>
                ))}
                {!selectedWindows.length ? <div className={styles.empty}>Aún no hay suficiente histórico para este consulado.</div> : null}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>Todavía no hay aperturas dentro de los próximos 30 días.</div>
        )}
      </section>
      ) : null}

      {selectedSection === 'agendados' ? (
      <section className={styles.section} id="agendados">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Configuración previa</span>
            <h2>Agendados de citas</h2>
          </div>
          <p>El operador define las reglas antes de que aparezca la cita; el motor actúa con esa configuración.</p>
        </div>

        <div className={styles.configList}>
          {(configs ?? []).map((config: any) => {
            const configTarget = config.ais_target_id
              ? targetById.get(Number(config.ais_target_id))
              : null

            const targetWasVerified = Boolean(configTarget?.appointment_verified_at)
            const targetHasAppointment = configTarget?.appointment_verified_has_current === true
            const targetHasNoAppointment = configTarget?.appointment_verified_has_current === false
            const configTelegramLink = telegramLinkByConfig.get(Number(config.booking_config_id))
            const configAccount = accountById.get(Number(config.account_id))
            const configPreflight = buildBookingPreflight(config, configAccount, configTarget, configTelegramLink)

            const effectiveCurrentDate = targetWasVerified
              ? (targetHasAppointment ? configTarget?.current_consular_date : null)
              : config.current_appointment_date

            const effectiveCurrentConsulate = targetWasVerified
              ? (targetHasAppointment ? configTarget?.current_consulate : null)
              : config.current_consulate

            return (
            <details className={styles.configCard} key={config.booking_config_id} open={(configs?.length ?? 0) === 1}>
              <summary>
                <div className={styles.clientBlock}>
                  <div className={styles.badgeRow}>
                    <span className={`${styles.badge} ${config.operational_status === 'ACTIVE' ? styles.active : styles.paused}`}>
                      {statusLabel(config.operational_status)}
                    </span>
                    <span className={styles.badge}>{modeLabel(config.search_mode)}</span>
                    {config.search_mode === 'INTELLIGENT' ? <span className={styles.recommended}>Recomendado</span> : null}
                    <span className={config.auto_confirm_enabled ? styles.autoConfirmOn : styles.autoConfirmOff}>
                      {config.auto_confirm_enabled ? 'AUTO AGENDADO ARMADO' : 'AUTO AGENDADO DESARMADO'}
                    </span>
                    <span className={styles.badge}>Config #{config.booking_config_id}</span>
                    <span className={styles.badge}>Cuenta #{config.account_id}</span>
                    {config.ais_target_id ? <span className={styles.badge}>Objetivo AIS #{config.ais_target_id}</span> : null}
                    <span className={configTelegramLink ? styles.telegramLinked : styles.telegramPending}>
                      {configTelegramLink ? 'Telegram vinculado' : 'Telegram sin vincular'}
                    </span>
                    {targetWasVerified ? (
                      <span className={targetHasAppointment ? styles.aisVerifiedBadge : styles.aisNoAppointmentBadge}>
                        {targetHasAppointment ? 'AIS: cita verificada' : 'AIS: sin cita'}
                      </span>
                    ) : config.ais_target_id ? (
                      <span className={styles.aisUnverifiedBadge}>AIS: sin verificar</span>
                    ) : null}
                  </div>
                  <strong>{config.full_name}</strong>
                  <small>{config.visa_type || 'Visa'} · {config.account_email}</small>
                </div>

                <div className={styles.currentAppointment}>
                  <span>Cita actual</span>
                  <strong>{fmtDate(effectiveCurrentDate)}</strong>
                  <small>
                    {targetHasNoAppointment
                      ? 'Verificado manualmente: sin cita en AIS'
                      : (effectiveCurrentConsulate || '—')}
                  </small>
                </div>

                <div className={styles.rulePreview}>
                  <span>Consulados</span>
                  <strong>{(config.allowed_consulates || []).map(prettyCode).join(' · ') || 'Sin configurar'}</strong>
                  <small>CAS: {(config.allowed_cas_locations || []).map(prettyCode).join(' · ') || 'Sin configurar'}</small>
                </div>

                <div className={styles.rulePreview}>
                  <span>Ventana CAS</span>
                  <strong>{config.cas_min_days_before}–{config.cas_max_days_before} días antes</strong>
                  <small>Mejora mínima: {config.minimum_improvement_days} día(s)</small>
                </div>
              </summary>

              <div className={styles.topOperationalActions}>
                {config.operational_status === 'PAUSED' && effectiveCurrentDate ? (
                  <div className={styles.improvementAction}>
                    <div>
                      <strong>Búsqueda pausada</strong>
                      <span>
                        La cita actual se conserva. Puedes reactivar la búsqueda para intentar mejorarla sin perderla.
                      </span>
                    </div>

                    <form action={resumeImprovementSearch}>
                      <input type="hidden" name="booking_config_id" value={config.booking_config_id} />
                      <button type="submit" className={styles.improvementButton}>
                        Buscar una cita mejor (sin perder la cita actual)
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={toggleBookingConfig} className={styles.quickActionTop}>
                    <input type="hidden" name="booking_config_id" value={config.booking_config_id} />
                    <input
                      type="hidden"
                      name="next_status"
                      value={config.operational_status === 'PAUSED' ? 'ACTIVE' : 'PAUSED'}
                    />
                    <button
                      type="submit"
                      className={
                        config.operational_status === 'PAUSED'
                          ? styles.startButton
                          : styles.secondaryButton
                      }
                    >
                      {config.operational_status === 'PAUSED' ? 'Iniciar búsqueda' : 'Pausar motor'}
                    </button>
                  </form>
                )}
              </div>

              <div className={styles.improvementAction}>
                <div>
                  <strong>Preflight LIVE</strong>
                  <span>
                    {configPreflight.ready
                      ? 'LISTO: la configuración cumple los requisitos del panel para poder armar el agendado automático.'
                      : `NO LISTO: faltan ${configPreflight.blocking.length} requisito(s) antes de permitir LIVE.`}
                  </span>
                  {!configPreflight.ready ? (
                    <small>
                      {configPreflight.blocking.map((item) => item.label).join(' · ')}
                    </small>
                  ) : null}
                </div>
                <a
                  href={`?section=preflight#preflight-${config.booking_config_id}`}
                  className={styles.secondaryButton}
                >
                  Ver Preflight
                </a>
              </div>

              <div className={styles.improvementAction}>
                <div>
                  <strong>Agendado automático</strong>
                  <span>
                    {config.auto_confirm_enabled
                      ? 'ARMADO en Proyecto Águila. Solo podrá confirmar si el seguro maestro local VM_LIVE_BOOKING_ENABLED también está activo.'
                      : 'DESARMADO. El Motor puede buscar y verificar disponibilidad, pero no enviará una reprogramación real.'}
                  </span>
                </div>
                <form action={setAutoConfirmState}>
                  <input type="hidden" name="booking_config_id" value={config.booking_config_id} />
                  <input
                    type="hidden"
                    name="next_state"
                    value={config.auto_confirm_enabled ? 'DISARMED' : 'ARMED'}
                  />
                  <button
                    type="submit"
                    disabled={!config.auto_confirm_enabled && !configPreflight.ready}
                    title={!config.auto_confirm_enabled && !configPreflight.ready ? 'Completa el Preflight antes de armar.' : undefined}
                    className={config.auto_confirm_enabled ? styles.secondaryButton : styles.startButton}
                  >
                    {config.auto_confirm_enabled
                      ? 'Desarmar agendado automático'
                      : 'Armar agendado automático'}
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0 14px' }}>
                <a
                  href={`/admin/motor-citas?section=auditoria&audit_config=${config.booking_config_id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 38,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(59,130,246,.30)',
                    textDecoration: 'none',
                    fontWeight: 750,
                    color: 'inherit',
                  }}
                >
                  Ver auditoría completa →
                </a>
              </div>

              <div className={styles.telegramPanel}>
                <div>
                  <span>Telegram del proceso</span>
                  {configTelegramLink ? (
                    <>
                      <strong>{configTelegramLink.chat_title || `Chat ${configTelegramLink.chat_id}`}</strong>
                      <small>
                        Heredado de la organización{configTelegramLink.link_source === 'ORGANIZATION' ? '' : ' (vínculo legado)'}. El bot enviará aquí aperturas, combinaciones y BOOKED_CONFIRMED.
                      </small>
                    </>
                  ) : (
                    <>
                      <strong>Sin grupo vinculado</strong>
                      <small>
                        Vincula el grupo principal de la organización una sola vez desde la sección Organizaciones.
                      </small>
                    </>
                  )}
                </div>
                <div className={styles.telegramHint}>
                  <span>Comandos</span>
                  <code>/estado</code>
                  <code>/configuraciones</code>
                </div>
              </div>

              <form action={updateBookingConfig} className={styles.form}>
                <input type="hidden" name="booking_config_id" value={config.booking_config_id} />

                <div className={styles.formGrid}>
                  <SearchModeField
                    initialMode={config.search_mode}
                    initialIntensiveInterval={config.intensive_interval_seconds}
                  />

                  <div className={styles.statusReadOnly}>
                    <span>Estado operativo</span>
                    <strong>{statusLabel(config.operational_status)}</strong>
                    <small>
                      El operador solo pausa o reactiva el proceso. Login requerido y Error los asigna el sistema.
                    </small>
                  </div>

                  <label>
                    <span>Fecha mínima aceptable</span>
                    <input type="date" name="acceptable_date_from" defaultValue={config.acceptable_date_from || ''} />
                  </label>

                  <label>
                    <span>Fecha máxima aceptable</span>
                    <input type="date" name="acceptable_date_to" defaultValue={config.acceptable_date_to || ''} />
                  </label>

                  <div className={styles.fullWidth}>
                    <OrderedMultiSelect
                      name="allowed_consulates"
                      title="Consulados permitidos"
                      help="Selecciona los consulados y ordénalos de mayor a menor preferencia."
                      options={CONSULATE_OPTIONS}
                      initialValues={config.allowed_consulates || []}
                    />
                  </div>

                  <div className={styles.fullWidth}>
                    <OrderedMultiSelect
                      name="allowed_cas_locations"
                      title="CAS permitidos"
                      help="Selecciona los CAS autorizados para este cliente y ordénalos por preferencia."
                      options={CAS_OPTIONS}
                      initialValues={config.allowed_cas_locations || []}
                    />
                  </div>

                  <label>
                    <span>Aviso mínimo para CAS (días)</span>
                    <input
                      type="number"
                      min="0"
                      name="minimum_travel_notice_days"
                      defaultValue={config.minimum_travel_notice_days}
                    />
                    <small>Se cuenta desde hoy hasta la fecha del CAS, que es la primera cita.</small>
                  </label>

                  {effectiveCurrentDate ? (
                    <label>
                      <span>Mejora mínima de cita consular (días)</span>
                      <input
                        type="number"
                        min="0"
                        name="minimum_improvement_days"
                        defaultValue={config.minimum_improvement_days}
                      />
                      <small>Solo se acepta una nueva cita si mejora al menos esta cantidad de días.</small>
                    </label>
                  ) : (
                    <div className={styles.statusReadOnly}>
                      <input type="hidden" name="minimum_improvement_days" value="0" />
                      <span>Mejora mínima de cita consular</span>
                      <strong>No aplica</strong>
                      <small>Este cliente todavía no tiene una cita consular programada.</small>
                    </div>
                  )}

                  <label>
                    <span>CAS mínimo antes</span>
                    <input type="number" min="0" name="cas_min_days_before" defaultValue={config.cas_min_days_before} />
                  </label>

                  <label>
                    <span>CAS máximo antes</span>
                    <input type="number" min="0" name="cas_max_days_before" defaultValue={config.cas_max_days_before} />
                  </label>

                  <label>
                    <span>Política de selección</span>
                    <select name="selection_policy" defaultValue={config.selection_policy}>
                      <option value="EARLIEST_DATE">Fecha más próxima</option>
                      <option value="CONSULATE_PRIORITY_THEN_DATE">Prioridad de consulado</option>
                    </select>
                  </label>

                  <div className={styles.fullWidth}>
                    <TimeWindowField
                      initialAnyTime={config.allow_any_time}
                      initialFrom={config.allowed_time_from}
                      initialTo={config.allowed_time_to}
                    />
                  </div>

                  <label className={styles.wide}>
                    <span>Notas operativas</span>
                    <textarea name="notes" defaultValue={config.notes || ''} rows={3} />
                  </label>
                </div>

                <div className={styles.formActions}>
                  <button className={styles.primaryButton} type="submit">Guardar configuración</button>
                </div>
              </form>

            </details>
            )
          })}
        </div>
      </section>
      ) : null}

      {selectedSection === 'auditoria' ? (
      <section className={styles.section} id="auditoria">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Trazabilidad por trámite</span>
            <h2>Auditoría / Timeline</h2>
          </div>
          <p>
            Une Motor AIS, Master Notificador, sesiones, Telegram y publicaciones para reconstruir qué pasó con cada trámite sin abrir logs de Python.
          </p>
        </div>

        <form
          method="get"
          action="/admin/motor-citas"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'end',
            gap: 12,
            padding: 16,
            marginBottom: 18,
            borderRadius: 16,
            border: '1px solid rgba(148,163,184,.24)',
          }}
        >
          <input type="hidden" name="section" value="auditoria" />
          <label style={{ display: 'grid', gap: 6, minWidth: 280, flex: '1 1 320px' }}>
            <span>Trámite</span>
            <select name="audit_config" defaultValue={auditConfigId || ''} style={{ minHeight: 42 }}>
              {(configs ?? []).map((config: any) => (
                <option key={config.booking_config_id} value={config.booking_config_id}>
                  {config.full_name} · Config #{config.booking_config_id} · Cuenta #{config.account_id}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={styles.primaryButton}>Ver auditoría</button>
        </form>

        {!auditConfig ? (
          <div className={styles.empty}>Todavía no existen configuraciones para auditar.</div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                gap: 12,
                marginBottom: 18,
              }}
            >
              <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(59,130,246,.24)' }}>
                <span>Trámite</span>
                <strong style={{ display: 'block', fontSize: 20 }}>{auditConfig.full_name}</strong>
                <small>Config #{auditConfigId} · Cuenta #{auditAccountId}</small>
              </article>
              <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(148,163,184,.24)' }}>
                <span>Última actividad</span>
                <strong style={{ display: 'block', fontSize: 16 }}>{auditLastActivity ? fmtDateTime(auditLastActivity) : 'Sin actividad'}</strong>
                <small>{auditEntries.length} evento(s) reconstruidos</small>
              </article>
              <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(16,185,129,.24)' }}>
                <span>Pares Consular + CAS</span>
                <strong style={{ display: 'block', fontSize: 28 }}>{auditPairCount}</strong>
                <small>Combinaciones compatibles detectadas</small>
              </article>
              <article style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(16,185,129,.24)' }}>
                <span>Citas confirmadas</span>
                <strong style={{ display: 'block', fontSize: 28 }}>{auditBookedCount}</strong>
                <small>BOOKED_CONFIRMED</small>
              </article>
              <article style={{ padding: 16, borderRadius: 14, border: `1px solid ${auditWarningCount ? 'rgba(245,158,11,.34)' : 'rgba(16,185,129,.24)'}` }}>
                <span>Incidencias en timeline</span>
                <strong style={{ display: 'block', fontSize: 28 }}>{auditWarningCount}</strong>
                <small>Warnings + críticas dentro del histórico cargado</small>
              </article>
              <article style={{ padding: 16, borderRadius: 14, border: `1px solid ${auditTelegramLink ? 'rgba(16,185,129,.24)' : 'rgba(245,158,11,.34)'}` }}>
                <span>Telegram organización</span>
                <strong style={{ display: 'block', fontSize: 16 }}>{auditTelegramLink ? 'Vinculado' : 'Sin vincular'}</strong>
                <small>{auditTelegramLink?.chat_title || 'Sin grupo heredado'}</small>
              </article>
            </div>

            <div style={{ display: 'grid', gap: 0 }}>
              {auditEntries.slice(0, 150).map((entry, index) => {
                const toneColor = entry.tone === 'CRITICAL'
                  ? '#ef4444'
                  : entry.tone === 'WARNING'
                    ? '#f59e0b'
                    : entry.tone === 'GOOD'
                      ? '#10b981'
                      : '#60a5fa'
                return (
                  <article
                    key={`${entry.at}-${entry.source}-${entry.ref || index}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '128px 28px minmax(0, 1fr)',
                      gap: 10,
                      minHeight: 92,
                    }}
                  >
                    <time style={{ paddingTop: 15, textAlign: 'right', fontSize: 13, opacity: .78 }}>
                      {fmtDateTime(entry.at)}
                    </time>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <span
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: index === Math.min(auditEntries.length, 150) - 1 ? '50%' : 0,
                          width: 2,
                          background: 'rgba(148,163,184,.22)',
                        }}
                      />
                      <span
                        style={{
                          zIndex: 1,
                          width: 13,
                          height: 13,
                          marginTop: 20,
                          borderRadius: 999,
                          background: toneColor,
                          boxShadow: `0 0 0 4px ${toneColor}22`,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginBottom: 10,
                        padding: '13px 15px',
                        borderRadius: 14,
                        border: `1px solid ${toneColor}33`,
                        background: `${toneColor}0b`,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <strong>{entry.title}</strong>
                        <span style={{ fontSize: 12, fontWeight: 800, color: toneColor }}>{entry.tone}</span>
                        {entry.code ? <code style={{ fontSize: 11 }}>{entry.code}</code> : null}
                      </div>
                      <p style={{ margin: '7px 0 5px', lineHeight: 1.5 }}>{entry.detail}</p>
                      <small>{entry.source}{entry.ref ? ` · ${entry.ref}` : ''}</small>
                    </div>
                  </article>
                )
              })}
              {!auditEntries.length ? (
                <div className={styles.empty}>
                  Aún no hay eventos para este trámite. En cuanto el Motor, AIS o Telegram actúen, aparecerán aquí cronológicamente.
                </div>
              ) : null}
              {auditEntries.length > 150 ? (
                <div className={styles.empty}>
                  Se muestran los 150 eventos más recientes de {auditEntries.length}. El Historial conserva la vista técnica global.
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
      ) : null}

      {selectedSection === 'historial' ? (
      <section className={styles.section} id="historial">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Auditoría</span>
            <h2>Historial del motor</h2>
          </div>
          <p>Registro de detecciones, verificaciones, intentos, agendados y errores.</p>
        </div>

        <div className={styles.eventTable}>
          <div className={styles.eventHeader}>
            <span>Evento</span><span>Consulado</span><span>Consular</span><span>CAS</span><span>Fuente / resultado</span><span>Fecha</span>
          </div>
          {(events ?? []).map((event: any) => (
            <div className={styles.eventRow} key={event.id}>
              <strong>{event.event_type}</strong>
              <span>{event.consulate || '—'}</span>
              <span>{event.consular_date ? `${fmtDate(event.consular_date)} ${fmtTime(event.consular_time)}` : '—'}</span>
              <span>{event.cas_location ? `${event.cas_location} · ${fmtDate(event.cas_date)}` : '—'}</span>
              <span>{visibleSource(event.source)}{event.result_code ? ` · ${event.result_code}` : ''}</span>
              <time>{new Intl.DateTimeFormat('es-MX', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Hermosillo',
              }).format(new Date(event.created_at))}</time>
            </div>
          ))}
          {!events?.length ? <div className={styles.empty}>El historial comenzará a llenarse al conectar el Worker con vm_booking_events.</div> : null}
        </div>
      </section>
      ) : null}
    </div>
  )
}
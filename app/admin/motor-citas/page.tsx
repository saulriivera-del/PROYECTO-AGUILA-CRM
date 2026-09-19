import { requireAuthContext } from '@/lib/auth-context'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'
import {
  addAisAccount,
  createClientFromTarget,
  linkTargetToCrmProcess,
  requestAisAccountSync,
  requestTargetAppointmentRefresh,
  requestAgentCommand,
  resumeImprovementSearch,
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


export default async function MotorCitasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  await requireAuthContext()
  const supabase = getVisaMasterAdminClient()

  const [
    { data: summaryRows, error: summaryError },
    { data: openings, error: openingsError },
    { data: windows, error: windowsError },
    { data: configs, error: configsError },
    { data: events, error: eventsError },
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
  ] = await Promise.all([
    supabase.from('vm_booking_engine_summary_view').select('*').limit(1),
    supabase.from('vm_openings_30d_by_consulate_view').select('*')
      .order('detections_last_7d', { ascending: false })
      .order('distinct_available_dates', { ascending: false }),
    supabase.from('vm_opening_best_windows_view').select('*')
      .order('consulate')
      .order('detections', { ascending: false }),
    supabase.from('vm_booking_config_dashboard_view').select('*')
      .order('booking_config_id'),
    supabase.from('vm_booking_events').select(
      'id,event_type,client_id,account_id,consulate,consular_date,consular_time,cas_location,cas_date,source,result_code,message,created_at'
    ).order('created_at', { ascending: false }).limit(20),
    supabase.from('vm_ais_accounts_dashboard_view').select('*').order('account_id'),
    supabase.from('vm_ais_account_targets').select(
      'id,account_id,external_target_id,target_type,display_name,member_count,client_id,current_consular_date,current_consular_time,current_consulate,current_cas_date,current_cas_time,current_cas_location,synced_at,is_active,appointment_refresh_status,appointment_refresh_requested_at,appointment_refresh_started_at,appointment_refresh_finished_at,appointment_refresh_error_code,appointment_refresh_error_message,appointment_verified_has_current,appointment_verified_at'
    ).eq('is_active', true).order('account_id').order('display_name'),
    supabase.from('vm_appointment_clients').select(
      'id,full_name,visa_type,status,current_appointment_date,current_consulate'
    ).order('full_name'),
    supabase.from('vm_ais_account_sync_jobs').select(
      'id,account_id,job_type,status,error_code,error_message,created_at,started_at,finished_at'
    ).in('status', ['PENDING', 'RUNNING']).order('created_at', { ascending: false }),
    supabase.from('vm_ais_health_dashboard_view').select('*').order('account_id'),
    (supabase as any).from('vm_telegram_links').select(
      'id,booking_config_id,chat_id,chat_title,active,internal_controls,linked_at'
    ).eq('active', true),
    (supabase as any).from('vm_ais_crm_process_match_view').select(
      'account_id,account_email,crm_client_id,crm_client_name,crm_client_email,crm_process_id,service_name,process_status,current_stage,operational_status,match_count'
    ).order('crm_client_name').order('service_name'),
    (supabase as any).from('vm_ais_session_stats_view').select('*').order('account_id'),
    (supabase as any).from('vm_agent_dashboard_view').select('*')
      .order('last_heartbeat_at', { ascending: false }),
    (supabase as any).from('vm_agent_services_dashboard_view').select('*')
      .order('agent_id')
      .order('service_key'),
    (supabase as any).from('vm_motor_performance_mode_view').select('*')
      .order('sort_order'),
    (supabase as any).from('vm_motor_performance_config_view').select('*')
      .order('booking_config_id'),
  ])

  const anyError =
    summaryError || openingsError || windowsError || configsError || eventsError ||
    accountsError || targetsError || clientsError || syncJobsError || healthError || telegramLinksError || crmMatchesError || sessionStatsError || agentError || agentServicesError || performanceModesError || performanceConfigsError
  const summary = summaryRows?.[0] || {
    active_configs: 0,
    paused_configs: 0,
    login_required_configs: 0,
    error_configs: 0,
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

  const telegramLinkByConfig = new Map<number, any>(
    (telegramLinks ?? []).map((row: any) => [Number(row.booking_config_id), row])
  )

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Visa Master · Proyecto Águila</span>
          <h1>Motor de Citas</h1>
          <p>Configura por anticipado qué citas puede tomar el motor y analiza el comportamiento de cada consulado.</p>
        </div>
        <div className={styles.headerStatus}>
          <span className={styles.liveDot} />
          Configuración operativa
        </div>
      </header>

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

      <section className={styles.summaryGrid}>
        <article><span>Procesos activos</span><strong>{summary.active_configs}</strong></article>
        <article><span>Pausados</span><strong>{summary.paused_configs}</strong></article>
        <article><span>Login requerido</span><strong>{summary.login_required_configs}</strong></article>
        <article><span>Con error</span><strong>{summary.error_configs}</strong></article>
      </section>

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

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Inteligencia de aperturas</span>
            <h2>Movimiento por consulado</h2>
          </div>

          <form method="get" className={styles.consulatePicker}>
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
                      Auto confirm {config.auto_confirm_enabled ? 'ON' : 'OFF'}
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

              <div className={styles.telegramPanel}>
                <div>
                  <span>Telegram del proceso</span>
                  {configTelegramLink ? (
                    <>
                      <strong>{configTelegramLink.chat_title || `Chat ${configTelegramLink.chat_id}`}</strong>
                      <small>
                        Vinculado a Config #{config.booking_config_id}. El bot enviará aquí BOOKED_CONFIRMED, fechas CAS/Consular y el PDF.
                      </small>
                    </>
                  ) : (
                    <>
                      <strong>Sin grupo vinculado</strong>
                      <small>
                        Agrega el bot al grupo y, desde una cuenta administradora, escribe:{' '}
                        <code>/vincular {config.booking_config_id}</code>
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

      <section className={styles.section}>
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
    </div>
  )
}
import { requireAuthContext } from '@/lib/auth-context'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'
import {
  addAisAccount,
  createClientFromTarget,
  linkTargetToExistingClient,
  requestAisAccountSync,
  requestTargetAppointmentRefresh,
  resumeImprovementSearch,
  toggleBookingConfig,
  updateAisPassword,
  updateBookingConfig,
} from './actions'
import OrderedMultiSelect from './OrderedMultiSelect'
import SearchModeField from './SearchModeField'
import TimeWindowField from './TimeWindowField'
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
  ])

  const anyError =
    summaryError || openingsError || windowsError || configsError || eventsError ||
    accountsError || targetsError || clientsError || syncJobsError || healthError
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

                <div className={styles.accountBody}>
                  {(account.credential_status === 'INVALID_CREDENTIALS' ||
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
                            <div className={styles.targetSetup}>
                              <form action={linkTargetToExistingClient} className={styles.targetLinkForm}>
                                <input type="hidden" name="target_id" value={target.id} />
                                <label>
                                  <span>Vincular con cliente existente</span>
                                  <select name="client_id" required defaultValue="">
                                    <option value="" disabled>Seleccionar cliente...</option>
                                    {(clients ?? []).map((client: any) => (
                                      <option key={client.id} value={client.id}>
                                        {client.full_name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button type="submit" className={styles.primaryButton}>
                                  Crear configuración
                                </button>
                              </form>

                              <div className={styles.orDivider}>o</div>

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

                {!health ? (
                  <div className={styles.healthEmpty}>
                    Aún no hay telemetría V11 para esta cuenta. Aparecerá con la siguiente búsqueda.
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        <div className={styles.healthNote}>
          <strong>Importante:</strong> “Requests AIS” cuenta documentos, XHR y fetch del dominio AIS utilizados por el Motor.
          No cuenta imágenes, CSS ni consultas a Supabase.
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
                    <span className={styles.badge}>Cuenta #{config.account_id}</span>
                    {config.ais_target_id ? <span className={styles.badge}>Objetivo AIS #{config.ais_target_id}</span> : null}
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

import { requireAuthContext } from '@/lib/auth-context'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'
import { toggleBookingConfig, updateBookingConfig } from './actions'
import OrderedMultiSelect from './OrderedMultiSelect'
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
  ])

  const anyError = summaryError || openingsError || windowsError || configsError || eventsError
  const summary = summaryRows?.[0] || {
    active_configs: 0,
    paused_configs: 0,
    login_required_configs: 0,
    error_configs: 0,
  }

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

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Configuración previa</span>
            <h2>Agendados de citas</h2>
          </div>
          <p>El operador define las reglas antes de que aparezca la cita; el motor actúa con esa configuración.</p>
        </div>

        <div className={styles.configList}>
          {(configs ?? []).map((config: any) => (
            <details className={styles.configCard} key={config.booking_config_id} open={(configs?.length ?? 0) === 1}>
              <summary>
                <div className={styles.clientBlock}>
                  <div className={styles.badgeRow}>
                    <span className={`${styles.badge} ${config.operational_status === 'ACTIVE' ? styles.active : styles.paused}`}>
                      {statusLabel(config.operational_status)}
                    </span>
                    <span className={styles.badge}>{modeLabel(config.search_mode)}</span>
                    {config.search_mode === 'INTELLIGENT' ? <span className={styles.recommended}>Recomendado</span> : null}
                    <span className={styles.badge}>Cuenta #{config.account_id}</span>
                  </div>
                  <strong>{config.full_name}</strong>
                  <small>{config.visa_type || 'Visa'} · {config.account_email}</small>
                </div>

                <div className={styles.currentAppointment}>
                  <span>Cita actual</span>
                  <strong>{fmtDate(config.current_appointment_date)}</strong>
                  <small>{config.current_consulate || '—'}</small>
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

              <form action={updateBookingConfig} className={styles.form}>
                <input type="hidden" name="booking_config_id" value={config.booking_config_id} />

                <div className={styles.formGrid}>
                  <label>
                    <span>Modo de búsqueda</span>
                    <select name="search_mode" defaultValue={config.search_mode}>
                      <option value="ALERT_ONLY">Master Notificador</option>
                      <option value="STANDARD">Búsqueda estándar</option>
                      <option value="INTENSIVE">Búsqueda intensiva</option>
                      <option value="INTELLIGENT">Modo inteligente · recomendado</option>
                    </select>
                  </label>

                  <label>
                    <span>Estado operativo</span>
                    <select name="operational_status" defaultValue={config.operational_status}>
                      <option value="ACTIVE">Activo</option>
                      <option value="PAUSED">Pausado</option>
                      <option value="LOGIN_REQUIRED">Login requerido</option>
                      <option value="ERROR">Error</option>
                    </select>
                  </label>

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
                    <span>Aviso mínimo (días)</span>
                    <input type="number" min="0" name="minimum_travel_notice_days" defaultValue={config.minimum_travel_notice_days} />
                  </label>

                  <label>
                    <span>Mejora mínima (días)</span>
                    <input type="number" min="0" name="minimum_improvement_days" defaultValue={config.minimum_improvement_days} />
                  </label>

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
                      <option value="EARLIEST_DATE">Fecha más próxima posible</option>
                      <option value="CONSULATE_PRIORITY_THEN_DATE">Prioridad de consulado y luego fecha</option>
                    </select>
                  </label>

                  <label>
                    <span>Intervalo intensivo (segundos)</span>
                    <input
                      type="number"
                      min="15"
                      name="intensive_interval_seconds"
                      defaultValue={config.intensive_interval_seconds || 15}
                    />
                  </label>

                  <label>
                    <span>Hora mínima</span>
                    <input type="time" name="allowed_time_from" defaultValue={fmtTime(config.allowed_time_from) === '—' ? '' : fmtTime(config.allowed_time_from)} />
                  </label>

                  <label>
                    <span>Hora máxima</span>
                    <input type="time" name="allowed_time_to" defaultValue={fmtTime(config.allowed_time_to) === '—' ? '' : fmtTime(config.allowed_time_to)} />
                  </label>

                  <label className={styles.checkLabel}>
                    <input type="checkbox" name="allow_any_time" defaultChecked={config.allow_any_time} />
                    <span>Aceptar cualquier horario</span>
                  </label>

                  <label className={styles.checkLabel}>
                    <input type="checkbox" name="enabled" defaultChecked={config.enabled} />
                    <span>Configuración habilitada</span>
                  </label>

                  <label className={styles.checkLabel}>
                    <input type="checkbox" name="auto_verify_enabled" defaultChecked={config.auto_verify_enabled} />
                    <span>Verificación AIS automática</span>
                  </label>

                  <div className={`${styles.checkLabel} ${styles.locked}`}>
                    <input type="checkbox" disabled checked={false} readOnly />
                    <span>Confirmación automática · bloqueada en esta fase</span>
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

              <form action={toggleBookingConfig} className={styles.quickAction}>
                <input type="hidden" name="booking_config_id" value={config.booking_config_id} />
                <input
                  type="hidden"
                  name="next_status"
                  value={config.operational_status === 'PAUSED' ? 'ACTIVE' : 'PAUSED'}
                />
                <button type="submit" className={styles.secondaryButton}>
                  {config.operational_status === 'PAUSED' ? 'Reactivar motor' : 'Pausar motor'}
                </button>
              </form>
            </details>
          ))}
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

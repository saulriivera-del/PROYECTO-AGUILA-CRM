import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'
import styles from './master-notificador.module.css'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const WEEKDAYS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

function fmtDate(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Hermosillo',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00-07:00`))
}

function fmtDateTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Hermosillo',
  }).format(new Date(value))
}

function fmtSeconds(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'

  const seconds = Number(value)

  if (!Number.isFinite(seconds)) return '—'

  if (seconds < 60) return `${Math.round(seconds)} s`

  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)

  return rest ? `${minutes} min ${rest} s` : `${minutes} min`
}

function consulateLabel(value?: string | null) {
  const labels: Record<string, string> = {
    'MEXICO CITY': 'Ciudad de México',
    HERMOSILLO: 'Hermosillo',
    TIJUANA: 'Tijuana',
    NOGALES: 'Nogales',
    GUADALAJARA: 'Guadalajara',
    MONTERREY: 'Monterrey',
    MERIDA: 'Mérida',
    MATAMOROS: 'Matamoros',
    'NUEVO LAREDO': 'Nuevo Laredo',
    'CIUDAD JUAREZ': 'Ciudad Juárez',
  }

  return labels[String(value || '')] || String(value || '—')
}

export default async function MasterNotificadorPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAuthContext()

  const params = await searchParams
  const supabase = getVisaMasterAdminClient() as any

  const [
    { data: summaryRows, error: summaryError },
    { data: backfillRows, error: backfillError },
    { data: consulates, error: consulatesError },
    { data: hours, error: hoursError },
    { data: weekdays, error: weekdaysError },
    { data: sources, error: sourcesError },
    { data: recent, error: recentError },
  ] = await Promise.all([
    supabase
      .from('vm_notifier_intelligence_summary_view')
      .select('*')
      .limit(1),

    supabase
      .from('vm_notifier_backfill_latest_view')
      .select('*')
      .limit(1),

    supabase
      .from('vm_notifier_consulate_stats_view')
      .select('*')
      .order('openings_30d', { ascending: false }),

    supabase
      .from('vm_notifier_hour_patterns_view')
      .select('*'),

    supabase
      .from('vm_notifier_weekday_patterns_view')
      .select('*'),

    supabase
      .from('vm_notifier_source_stats_view')
      .select('*'),

    supabase
      .from('vm_notifier_recent_openings_view')
      .select('*')
      .limit(50),
  ])

  const anyError =
    summaryError
    || backfillError
    || consulatesError
    || hoursError
    || weekdaysError
    || sourcesError
    || recentError

  const summary = (summaryRows ?? [])[0] || {}
  const backfill = (backfillRows ?? [])[0] || null

  const requestedConsulate =
    typeof params.consulate === 'string'
      ? params.consulate
      : ''

  const selectedConsulate =
    requestedConsulate
    || (consulates ?? [])[0]?.consulate
    || 'HERMOSILLO'

  const selectedHours = (hours ?? [])
    .filter((row: any) => row.consulate === selectedConsulate)
    .sort((a: any, b: any) => Number(b.opening_count) - Number(a.opening_count))
    .slice(0, 8)

  const selectedWeekdays = (weekdays ?? [])
    .filter((row: any) => row.consulate === selectedConsulate)
    .sort((a: any, b: any) => Number(b.opening_count) - Number(a.opening_count))

  const selectedRecent = (recent ?? [])
    .filter((row: any) => row.consulate === selectedConsulate)
    .slice(0, 15)

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <span>Visa Master Intelligence</span>
          <h1>Master Notificador</h1>
          <p>
            Histórico unificado, fuentes, aperturas y patrones de detección.
          </p>
        </div>

        <Link href="/admin/motor-citas" className={styles.backLink}>
          Volver al Motor de Citas
        </Link>
      </div>

      {anyError ? (
        <div className={styles.error}>
          No se pudo cargar toda la inteligencia del Notificador:
          {' '}
          {anyError.message}
        </div>
      ) : null}

      <section className={styles.summaryGrid}>
        <article>
          <span>Aperturas · 180 días</span>
          <strong>{summary.openings_180d ?? 0}</strong>
        </article>

        <article>
          <span>Consulados con muestra</span>
          <strong>{summary.active_consulates_180d ?? 0}</strong>
        </article>

        <article>
          <span>Fuentes activas</span>
          <strong>{summary.active_sources ?? 0}</strong>
        </article>

        <article>
          <span>Observaciones procesadas</span>
          <strong>{summary.processed_observations ?? 0}</strong>
        </article>

        <article>
          <span>Sensores Worker</span>
          <strong>{summary.worker_observations ?? 0}</strong>
        </article>

        <article>
          <span>Histórico desde</span>
          <strong className={styles.smallStrong}>
            {fmtDateTime(summary.oldest_opening_at)}
          </strong>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Importación histórica</span>
            <h2>Backfill</h2>
          </div>
          <p>
            El backfill nunca publica alertas antiguas ni dispara búsquedas AIS.
          </p>
        </div>

        {!backfill ? (
          <div className={styles.empty}>
            Todavía no hay ejecuciones de backfill registradas.
          </div>
        ) : (
          <div className={styles.backfillCard}>
            <div>
              <span>Estado</span>
              <strong className={
                backfill.status === 'SUCCEEDED'
                  ? styles.good
                  : backfill.status === 'FAILED'
                    ? styles.bad
                    : styles.running
              }>
                {backfill.status}
              </strong>
            </div>

            <div>
              <span>Ventana</span>
              <strong>{backfill.requested_days} días</strong>
            </div>

            <div>
              <span>Fuentes</span>
              <strong>{backfill.source_count ?? 0}</strong>
            </div>

            <div>
              <span>Mensajes revisados</span>
              <strong>{backfill.messages_scanned ?? 0}</strong>
            </div>

            <div>
              <span>Observaciones nuevas</span>
              <strong>{backfill.observations_created ?? 0}</strong>
            </div>

            <div>
              <span>Inicio</span>
              <strong className={styles.smallStrong}>
                {fmtDateTime(backfill.started_at)}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Histórico consolidado</span>
            <h2>Consulados</h2>
          </div>
          <p>
            Una apertura representa una ráfaga consolidada de mismo consulado + fecha.
          </p>
        </div>

        <div className={styles.consulateGrid}>
          {(consulates ?? []).map((row: any) => (
            <Link
              key={row.consulate}
              href={`/admin/master-notificador?consulate=${encodeURIComponent(row.consulate)}`}
              className={`${styles.consulateCard} ${
                row.consulate === selectedConsulate
                  ? styles.selectedCard
                  : ''
              }`}
            >
              <div>
                <span>{consulateLabel(row.consulate)}</span>
                <strong>{row.openings_30d ?? 0}</strong>
                <small>Aperturas · 30 d</small>
              </div>

              <div className={styles.consulateStats}>
                <span>24 h <strong>{row.openings_24h ?? 0}</strong></span>
                <span>7 d <strong>{row.openings_7d ?? 0}</strong></span>
                <span>180 d <strong>{row.openings_180d ?? 0}</strong></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Análisis seleccionado</span>
            <h2>{consulateLabel(selectedConsulate)}</h2>
          </div>
          <p>
            Horas y días corresponden a horario de Hermosillo.
          </p>
        </div>

        <div className={styles.analysisGrid}>
          <article className={styles.analysisCard}>
            <h3>Horas con más aperturas</h3>

            <div className={styles.patternList}>
              {selectedHours.length ? selectedHours.map((row: any) => (
                <div key={row.local_hour}>
                  <span>
                    {String(row.local_hour).padStart(2, '0')}:00–{
                      String(row.local_hour).padStart(2, '0')
                    }:59
                  </span>
                  <strong>{row.opening_count}</strong>
                  <small>
                    Prom. {fmtSeconds(row.avg_span_seconds)}
                  </small>
                </div>
              )) : (
                <div className={styles.empty}>Sin muestra todavía.</div>
              )}
            </div>
          </article>

          <article className={styles.analysisCard}>
            <h3>Días con más aperturas</h3>

            <div className={styles.patternList}>
              {selectedWeekdays.length ? selectedWeekdays.map((row: any) => (
                <div key={row.iso_weekday}>
                  <span>{WEEKDAYS[Number(row.iso_weekday)]}</span>
                  <strong>{row.opening_count}</strong>
                </div>
              )) : (
                <div className={styles.empty}>Sin muestra todavía.</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Comparación de detectores</span>
            <h2>Fuentes</h2>
          </div>
          <p>
            “Detectó primero” se calcula sobre la primera observación registrada de cada apertura.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Fuente</th>
                <th>Tipo</th>
                <th>Observaciones</th>
                <th>Aperturas vistas</th>
                <th>Detectó primero</th>
                <th>Tasa primero</th>
                <th>Última observación</th>
              </tr>
            </thead>

            <tbody>
              {(sources ?? []).map((row: any) => (
                <tr key={row.source_key}>
                  <td>
                    <strong>{row.display_name}</strong>
                  </td>
                  <td>{row.source_type}</td>
                  <td>{row.observations_total ?? 0}</td>
                  <td>{row.openings_observed ?? 0}</td>
                  <td>{row.first_detections ?? 0}</td>
                  <td>
                    {row.first_detection_rate_pct === null
                      || row.first_detection_rate_pct === undefined
                      ? '—'
                      : `${row.first_detection_rate_pct}%`}
                  </td>
                  <td>{fmtDateTime(row.last_observation_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Últimas ráfagas</span>
            <h2>{consulateLabel(selectedConsulate)}</h2>
          </div>
          <p>
            Sirve para comprobar consolidación y número de fuentes coincidentes.
          </p>
        </div>

        <div className={styles.recentList}>
          {selectedRecent.length ? selectedRecent.map((row: any) => (
            <article key={row.opening_id}>
              <div>
                <span>{fmtDate(row.available_date)}</span>
                <strong>{row.source_count ?? 1} fuente(s)</strong>
              </div>

              <div>
                <span>Primera detección</span>
                <strong>{fmtDateTime(row.first_detected_at)}</strong>
              </div>

              <div>
                <span>Observaciones</span>
                <strong>{row.observation_count ?? 1}</strong>
              </div>

              <div>
                <span>Duración observada</span>
                <strong>{fmtSeconds(row.observed_span_seconds)}</strong>
              </div>
            </article>
          )) : (
            <div className={styles.empty}>Sin aperturas recientes.</div>
          )}
        </div>
      </section>

      <div className={styles.note}>
        Las métricas históricas mejorarán conforme agreguemos más fuentes.
        Una fuente puede “detectar primero” simplemente porque fue la primera
        integrada; compararemos con mayor confianza cuando tengamos varias
        fuentes cubriendo el mismo periodo.
      </div>
    </main>
  )
}

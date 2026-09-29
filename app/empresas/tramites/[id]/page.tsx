'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import PortalShell from '../../_components/PortalShell'
import styles from '../../portal.module.css'
import { getCorporateProcess, getCorporateUpdates } from '@/lib/corporate-portal/supabase-rest'

function fmt(v?: string) {
  if (!v) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(v))
}

export default function CorporateProcessDetailPage() {
  const params = useParams()
  const processId = String(params?.id || '')
  const [process, setProcess] = useState<any>(null)
  const [updates, setUpdates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!processId) return
    Promise.all([getCorporateProcess(processId), getCorporateUpdates(processId)])
      .then(([p, u]) => {
        if (!p) throw new Error('Trámite no disponible.')
        setProcess(p)
        setUpdates(u)
      })
      .catch((e) => setError(e?.message || 'No se pudo cargar el trámite.'))
      .finally(() => setLoading(false))
  }, [processId])

  return (
    <PortalShell>
      <div className={styles.content}>
        <Link href="/empresas/tramites" className={styles.backLink}>← Volver a trámites</Link>

        {loading ? <div className={`${styles.card} ${styles.empty}`}>Cargando trámite…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {process ? (
          <>
            <div className={styles.detailHero}>
              <div>
                <span className={styles.sectionEyebrow}>EXPEDIENTE CORPORATIVO</span>
                <div className={styles.detailTitleRow}>
                  <h1>{process.client_name}</h1>
                  {Number(process.applicant_count || 1) > 1 ? <span className={styles.groupBadge}>{process.applicant_count} solicitantes</span> : null}
                </div>
                <p>{process.service_name}{process.group_label ? ` · ${process.group_label}` : ''}</p>
              </div>

              <div className={styles.detailStatusBox}>
                <small>ESTADO ACTUAL</small>
                <strong>{process.public_status_label || 'En proceso'}</strong>
                <span>Actualizado {fmt(process.last_visible_update_at || process.portal_last_updated_at)}</span>
              </div>
            </div>

            {process.requires_client_action ? (
              <div className={styles.actionRequiredLarge}>
                <div className={styles.actionRequiredIcon}>!</div>
                <div>
                  <span>ACCIÓN REQUERIDA</span>
                  <strong>Se necesita información o una acción de tu empresa</strong>
                  <p>{process.client_action_note || 'Contacta a Visa Master para continuar el proceso.'}</p>
                </div>
              </div>
            ) : null}

            <div className={styles.detailLayout}>
              <div>
                <section className={`${styles.card} ${styles.detailSection}`}>
                  <span className={styles.sectionEyebrow}>CITAS</span>
                  <h2>Programación actual</h2>
                  <div className={styles.appointmentDetailGrid}>
                    <div className={styles.appointmentDetailCard}>
                      <span className={styles.appointmentType}>CAS</span>
                      <strong>{fmt(process.cas_appointment_at)}</strong>
                      <p>{process.cas_location || 'Sede pendiente de confirmar'}</p>
                    </div>
                    <div className={styles.appointmentDetailCard}>
                      <span className={styles.appointmentType}>CONSULADO</span>
                      <strong>{fmt(process.consulate_appointment_at)}</strong>
                      <p>{process.consulate_location || 'Sede pendiente de confirmar'}</p>
                    </div>
                  </div>
                </section>

                <section className={`${styles.card} ${styles.detailSection}`} style={{ marginTop: 16 }}>
                  <span className={styles.sectionEyebrow}>SEGUIMIENTO</span>
                  <h2>Situación del trámite</h2>
                  <div className={styles.processSummaryBlock}>
                    <div><small>Estado</small><strong>{process.public_status_label || process.public_status || 'En proceso'}</strong></div>
                    <div><small>Próximo paso</small><strong>{process.public_next_step || 'Continuar seguimiento.'}</strong></div>
                  </div>
                  <p className={styles.detailNote}>{process.public_note || 'Visa Master continúa dando seguimiento al trámite.'}</p>
                </section>
              </div>

              <aside className={`${styles.card} ${styles.detailSection}`}>
                <span className={styles.sectionEyebrow}>HISTORIAL</span>
                <h2>Actividad del trámite</h2>
                <div className={styles.timelineV3}>
                  {updates.map((u) => (
                    <div className={styles.timelineV3Item} key={u.update_id}>
                      <div className={styles.timelineDot} />
                      <div><small>{fmt(u.event_date)}</small><strong>{u.title}</strong><p>{u.description}</p></div>
                    </div>
                  ))}
                  {!updates.length ? <div className={styles.empty}>Aún no hay movimientos públicos registrados.</div> : null}
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </PortalShell>
  )
}

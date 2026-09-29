'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import PortalShell from './_components/PortalShell'
import styles from './portal.module.css'
import { getCompanyProfile, getCorporateProcesses, getCorporateUpdates } from '@/lib/corporate-portal/supabase-rest'

function statusClass(status?: string) {
  const s = String(status || '')
  if (s.includes('APPROVED') || s.includes('ISSUED') || s.includes('COMPLETED') || s.includes('SCHEDULED')) return styles.statusGreen
  if (s.includes('PENDING') || s.includes('ADMINISTRATIVE')) return styles.statusOrange
  if (s.includes('SEARCHING') || s.includes('FOUND')) return styles.statusBlue
  return styles.statusGray
}

function fmt(v?: string) {
  if (!v) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(v))
}

export default function CorporateDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [updates, setUpdates] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCompanyProfile(), getCorporateProcesses(), getCorporateUpdates()])
      .then(([p, i, u]) => { setProfile(p); setItems(i); setUpdates(u) })
      .catch((e) => setError(e?.message || 'No se pudo cargar el panel.'))
  }, [])

  const attention = items.filter(x => x.requires_client_action).length
  const upcoming = items.filter(x => x.cas_appointment_at || x.consulate_appointment_at).length

  return (
    <PortalShell>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1>Hola, {profile?.name?.split(' ')[0] || 'Gabriela'}</h1>
          <p>Consulta el avance de tus trámites, citas y actualizaciones de Visa Master.</p>
        </div>

        {error ? <div className={styles.error} style={{ marginTop: 20 }}>{error}</div> : null}

        <div className={styles.stats}>
          <div className={`${styles.card} ${styles.stat}`}><div className={styles.statIcon}>▤</div><div><span>Trámites activos</span><strong>{items.length}</strong></div></div>
          <div className={`${styles.card} ${styles.stat}`}><div className={styles.statIcon}>!</div><div><span>Requieren atención</span><strong>{attention}</strong></div></div>
          <div className={`${styles.card} ${styles.stat}`}><div className={styles.statIcon}>▣</div><div><span>Con citas programadas</span><strong>{upcoming}</strong></div></div>
        </div>

        {attention > 0 ? (
          <div className={styles.attentionBanner}>
            <div className={styles.attentionIcon}>!</div>
            <div>
              <strong>Hay {attention} {attention === 1 ? 'trámite' : 'trámites'} que requieren atención</strong>
              <p>Revisa las indicaciones de Visa Master para evitar retrasos en el proceso.</p>
            </div>
          </div>
        ) : null}

        <div className={styles.grid}>
          <section>
            <h2 className={styles.sectionTitle}>Trámites</h2>
            <div className={styles.caseList}>
              {items.map((p: any) => (
                <div className={`${styles.card} ${styles.caseCard}`} key={p.process_id}>
                  <div className={styles.caseTop}>
                    <div>
                      <div className={styles.caseIdentityRow}>
                        <h3 className={styles.caseName}>{p.client_name}</h3>
                        {Number(p.applicant_count || 1) > 1 ? <span className={styles.groupBadge}>{p.applicant_count} solicitantes</span> : null}
                      </div>
                      <div className={styles.caseMeta}>{p.service_name}{p.group_label ? ` · ${p.group_label}` : ''}</div>
                    </div>
                    <span className={`${styles.status} ${statusClass(p.public_status)}`}>{p.public_status_label || p.public_status || 'En proceso'}</span>
                  </div>

                  <p className={styles.note}>{p.public_note || 'Visa Master continúa dando seguimiento al trámite.'}</p>

                  <div className={styles.appointmentGrid}>
                    <div className={styles.appointmentCard}>
                      <span className={styles.appointmentType}>CAS</span>
                      <strong>{fmt(p.cas_appointment_at)}</strong>
                      <small>{p.cas_location || 'Sede pendiente de confirmar'}</small>
                    </div>
                    <div className={styles.appointmentCard}>
                      <span className={styles.appointmentType}>CONSULADO</span>
                      <strong>{fmt(p.consulate_appointment_at)}</strong>
                      <small>{p.consulate_location || 'Sede pendiente de confirmar'}</small>
                    </div>
                  </div>

                  {p.requires_client_action ? (
                    <div className={styles.actionRequired}>
                      <span className={styles.actionRequiredIcon}>!</span>
                      <div><strong>Acción requerida</strong><p>{p.client_action_note || 'Contacta a Visa Master.'}</p></div>
                    </div>
                  ) : null}

                  <div className={styles.next}><strong>Próximo paso</strong><div>{p.public_next_step || 'Continuar seguimiento.'}</div></div>

                  <div className={styles.caseFooter}>
                    <span className={styles.lastUpdated}>Última actualización: <strong>{fmt(p.last_visible_update_at || p.portal_last_updated_at)}</strong></span>
                    <Link className={styles.button} href={`/empresas/tramites/${p.process_id}`}>Ver trámite →</Link>
                  </div>
                </div>
              ))}
              {!items.length ? <div className={`${styles.card} ${styles.empty}`}>No hay trámites visibles actualmente.</div> : null}
            </div>
          </section>

          <aside>
            <div className={`${styles.card} ${styles.sideCard}`}>
              <h2 className={styles.sectionTitle}>Actividad reciente</h2>
              {updates.slice(0, 6).map((u: any) => (
                <div className={styles.activityItem} key={u.update_id}>
                  <strong>{u.title}</strong>
                  <small>{fmt(u.event_date)}</small>
                  <p>{u.description}</p>
                </div>
              ))}
              {!updates.length ? <div className={styles.empty}>Sin actividad reciente.</div> : null}
            </div>
          </aside>
        </div>
      </div>
    </PortalShell>
  )
}

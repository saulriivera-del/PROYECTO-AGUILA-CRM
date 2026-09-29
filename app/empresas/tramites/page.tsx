'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import PortalShell from '../_components/PortalShell'
import styles from '../portal.module.css'
import { getCorporateProcesses } from '@/lib/corporate-portal/supabase-rest'

function fmt(v?: string) {
  if (!v) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(v))
}

export default function CorporateProcessesPage() {
  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getCorporateProcesses().then(setItems).catch((e) => setError(e?.message || 'No se pudieron cargar los trámites.'))
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) =>
      [item.client_name, item.service_name, item.public_status_label, item.group_label, item.cas_location, item.consulate_location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    )
  }, [items, query])

  return (
    <PortalShell>
      <div className={styles.content}>
        <div className={styles.pageHeading}>
          <div>
            <span className={styles.sectionEyebrow}>EXPEDIENTES CORPORATIVOS</span>
            <h1>Trámites</h1>
            <p>Consulta los candidatos y grupos vinculados a tu empresa.</p>
          </div>
          <div className={styles.searchBox}>
            <input className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, visa, estado o sede…" />
          </div>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.caseList}>
          {filtered.map((p) => (
            <Link key={p.process_id} href={`/empresas/tramites/${p.process_id}`} className={`${styles.card} ${styles.processRow}`}>
              <div className={styles.processRowMain}>
                <div className={styles.caseIdentityRow}>
                  <strong>{p.client_name}</strong>
                  {Number(p.applicant_count || 1) > 1 ? <span className={styles.groupBadge}>{p.applicant_count} solicitantes</span> : null}
                </div>
                <span>{p.service_name}{p.group_label ? ` · ${p.group_label}` : ''}</span>
              </div>

              <div className={styles.processAppointmentSummary}>
                <div><small>CAS</small><strong>{fmt(p.cas_appointment_at)}</strong><span>{p.cas_location || 'Sede pendiente'}</span></div>
                <div><small>Consulado</small><strong>{fmt(p.consulate_appointment_at)}</strong><span>{p.consulate_location || 'Sede pendiente'}</span></div>
              </div>

              <div className={styles.processRowStatus}>
                {p.requires_client_action ? <span className={styles.miniAttention}>Acción requerida</span> : <span>{p.public_status_label || 'En proceso'}</span>}
                <b>→</b>
              </div>
            </Link>
          ))}
          {!filtered.length ? <div className={`${styles.card} ${styles.empty}`}>No se encontraron trámites.</div> : null}
        </div>
      </div>
    </PortalShell>
  )
}

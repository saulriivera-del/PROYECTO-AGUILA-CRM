'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import PortalShell from './_components/PortalShell'
import styles from './portal.module.css'
import { getCompanyProfile, getCorporateProcesses, getCorporateUpdates } from '@/lib/corporate-portal/supabase-rest'

function statusClass(status?:string) {
  const s = String(status||'')
  if (s.includes('APPROVED') || s.includes('ISSUED') || s.includes('COMPLETED') || s.includes('SCHEDULED')) return styles.statusGreen
  if (s.includes('PENDING') || s.includes('ADMINISTRATIVE')) return styles.statusOrange
  if (s.includes('SEARCHING') || s.includes('FOUND')) return styles.statusBlue
  return styles.statusGray
}
function fmt(v?:string) {
  if (!v) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX',{dateStyle:'medium'}).format(new Date(v))
}

export default function CorporateDashboard() {
  const [profile,setProfile]=useState<any>(null)
  const [items,setItems]=useState<any[]>([])
  const [updates,setUpdates]=useState<any[]>([])
  const [error,setError]=useState('')

  useEffect(()=>{
    Promise.all([getCompanyProfile(),getCorporateProcesses(),getCorporateUpdates()])
      .then(([p,i,u])=>{setProfile(p);setItems(i);setUpdates(u)})
      .catch((e)=>setError(e?.message||'No se pudo cargar el panel.'))
  },[])

  const attention = items.filter(x=>x.requires_client_action).length
  const upcoming = items.filter(x=>x.cas_appointment_at || x.consulate_appointment_at).length

  return <PortalShell>
    <div className={styles.content}>
      <div className={styles.hero}>
        <h1>Hola, {profile?.name?.split(' ')[0] || 'Gabriela'}</h1>
        <p>Aquí puedes dar seguimiento a los trámites de tus candidatos.</p>
      </div>

      {error ? <div className={styles.error} style={{marginTop:20}}>{error}</div>:null}

      <div className={styles.stats}>
        <div className={`${styles.card} ${styles.stat}`}><div className={styles.statIcon}>▤</div><div><span>Trámites activos</span><strong>{items.length}</strong></div></div>
        <div className={`${styles.card} ${styles.stat}`}><div className={styles.statIcon}>!</div><div><span>Requieren atención</span><strong>{attention}</strong></div></div>
        <div className={`${styles.card} ${styles.stat}`}><div className={styles.statIcon}>▣</div><div><span>Próximas citas</span><strong>{upcoming}</strong></div></div>
      </div>

      <div className={styles.grid}>
        <section>
          <h2 className={styles.sectionTitle}>Trámites</h2>
          <div className={styles.caseList}>
            {items.map((p:any)=><div className={`${styles.card} ${styles.caseCard}`} key={p.process_id}>
              <div className={styles.caseTop}>
                <div>
                  <h3 className={styles.caseName}>{p.client_name}</h3>
                  <div className={styles.caseMeta}>{p.service_name}</div>
                </div>
                <span className={`${styles.status} ${statusClass(p.public_status)}`}>{p.public_status_label || p.public_status || 'En proceso'}</span>
              </div>
              <p className={styles.note}>{p.public_note || 'Visa Master continúa dando seguimiento al trámite.'}</p>
              <div className={styles.detailGrid}>
                <div className={styles.kv}><small>CAS</small><strong>{fmt(p.cas_appointment_at)}</strong></div>
                <div className={styles.kv}><small>Consulado</small><strong>{fmt(p.consulate_appointment_at)}</strong></div>
              </div>
              <div className={styles.next}><strong>Próximo paso</strong><div>{p.public_next_step || 'Continuar seguimiento.'}</div></div>
              {p.requires_client_action ? <div className={styles.error} style={{marginTop:14}}><strong>Acción requerida:</strong> {p.client_action_note || 'Contacta a Visa Master.'}</div>:null}
              <div className={styles.buttonRow}><Link className={styles.button} href={`/empresas/tramites/${p.process_id}`}>Ver trámite →</Link></div>
            </div>)}
            {!items.length ? <div className={`${styles.card} ${styles.empty}`}>No hay trámites visibles actualmente.</div>:null}
          </div>
        </section>

        <aside>
          <div className={`${styles.card} ${styles.sideCard}`}>
            <h2 className={styles.sectionTitle}>Actividad reciente</h2>
            {updates.slice(0,6).map((u:any)=><div className={styles.activityItem} key={u.update_id}>
              <strong>{u.title}</strong>
              <small>{fmt(u.event_date)}</small>
              <p>{u.description}</p>
            </div>)}
            {!updates.length ? <div className={styles.empty}>Sin actividad reciente.</div>:null}
          </div>
          <div className={`${styles.card} ${styles.sideCard}`} style={{marginTop:16}}>
            <h2 className={styles.sectionTitle}>¿Necesitas apoyo?</h2>
            <p className={styles.note}>Si tienes alguna duda sobre un trámite, puedes contactar directamente a Visa Master.</p>
          </div>
        </aside>
      </div>
    </div>
  </PortalShell>
}

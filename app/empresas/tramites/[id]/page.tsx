'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import PortalShell from '../../_components/PortalShell'
import styles from '../../portal.module.css'
import { getCorporateDocuments, getCorporateProcesses, getCorporateUpdates } from '@/lib/corporate-portal/supabase-rest'

const fmt=(v?:string)=>v?new Intl.DateTimeFormat('es-MX',{dateStyle:'long'}).format(new Date(v)):'Sin fecha'

export default function TramiteDetallePage() {
  const params=useParams()
  const id=String(params?.id||'')
  const [p,setP]=useState<any>(null)
  const [updates,setUpdates]=useState<any[]>([])
  const [docs,setDocs]=useState<any[]>([])

  useEffect(()=>{
    Promise.all([getCorporateProcesses(),getCorporateUpdates(),getCorporateDocuments(id)]).then(([ps,us,ds])=>{
      setP(ps.find((x:any)=>x.process_id===id)||null)
      setUpdates(us.filter((x:any)=>x.process_id===id))
      setDocs(ds)
    })
  },[id])

  return <PortalShell><div className={styles.content}>
    {!p ? <div className={`${styles.card} ${styles.empty}`}>Cargando expediente…</div> : <>
      <div className={styles.hero}><h1>{p.client_name}</h1><p>{p.service_name}</p></div>
      <div className={styles.grid} style={{marginTop:28}}>
        <section>
          <div className={`${styles.card} ${styles.caseCard}`}>
            <h2 className={styles.sectionTitle}>Estado actual</h2>
            <span className={`${styles.status} ${styles.statusBlue}`}>{p.public_status_label||p.public_status}</span>
            <p className={styles.note}>{p.public_note}</p>
            <div className={styles.next}><strong>Próximo paso</strong><div>{p.public_next_step||'Continuar seguimiento.'}</div></div>
            {p.requires_client_action?<div className={styles.error} style={{marginTop:15}}>{p.client_action_note}</div>:null}
          </div>
          <div className={`${styles.card} ${styles.caseCard}`} style={{marginTop:16}}>
            <h2 className={styles.sectionTitle}>Citas y resultado</h2>
            <div className={styles.detailGrid}>
              <div className={styles.kv}><small>CAS</small><strong>{fmt(p.cas_appointment_at)}</strong></div>
              <div className={styles.kv}><small>Consulado</small><strong>{fmt(p.consulate_appointment_at)}</strong></div>
              <div className={styles.kv}><small>Resultado</small><strong>{p.result_status||'Sin resultado'}</strong></div>
              <div className={styles.kv}><small>Última actualización</small><strong>{fmt(p.portal_last_updated_at)}</strong></div>
            </div>
          </div>
          <div className={`${styles.card} ${styles.caseCard}`} style={{marginTop:16}}>
            <h2 className={styles.sectionTitle}>Documentos</h2>
            {docs.map((d:any)=><div className={styles.activityItem} key={d.id}>
              <strong>{d.public_title||d.file_name}</strong><small>{d.document_type}</small>
              <p>{d.portal_description||'Documento del trámite.'}</p>
              {d.external_file_url?<a className={styles.buttonSecondary} href={d.external_file_url} target="_blank" rel="noreferrer">Abrir</a>:null}
            </div>)}
            {!docs.length?<div className={styles.empty}>El módulo está listo. Los documentos se mostrarán aquí cuando sean publicados desde Visa Master.</div>:null}
          </div>
        </section>
        <aside>
          <div className={`${styles.card} ${styles.sideCard}`}>
            <h2 className={styles.sectionTitle}>Historial</h2>
            <div className={styles.timeline}>
              {updates.map((u:any)=><div className={styles.timelineItem} key={u.update_id}>
                <strong>{u.title}</strong><small style={{display:'block',color:'#7b879b'}}>{fmt(u.event_date)}</small>
                <p className={styles.note}>{u.description}</p>
              </div>)}
              {!updates.length?<div className={styles.empty}>Sin actualizaciones públicas.</div>:null}
            </div>
          </div>
        </aside>
      </div>
    </>}
  </div></PortalShell>
}

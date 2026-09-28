'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import PortalShell from '../_components/PortalShell'
import styles from '../portal.module.css'
import { getCorporateProcesses } from '@/lib/corporate-portal/supabase-rest'

export default function TramitesPage() {
  const [items,setItems]=useState<any[]>([])
  useEffect(()=>{getCorporateProcesses().then(setItems).catch(()=>setItems([]))},[])
  return <PortalShell><div className={styles.content}>
    <div className={styles.hero}><h1>Trámites</h1><p>Expedientes visibles de tu empresa.</p></div>
    <div className={`${styles.card} ${styles.tableWrap}`} style={{marginTop:28}}>
      <table className={styles.table}>
        <thead><tr><th>Candidato</th><th>Servicio</th><th>Estatus</th><th>CAS</th><th>Consulado</th><th></th></tr></thead>
        <tbody>{items.map((p:any)=><tr key={p.process_id}>
          <td><strong>{p.client_name}</strong></td><td>{p.service_name}</td><td>{p.public_status_label||p.public_status}</td>
          <td>{p.cas_appointment_at ? new Date(p.cas_appointment_at).toLocaleDateString('es-MX'):'Sin fecha'}</td>
          <td>{p.consulate_appointment_at ? new Date(p.consulate_appointment_at).toLocaleDateString('es-MX'):'Sin fecha'}</td>
          <td><Link className={styles.buttonSecondary} href={`/empresas/tramites/${p.process_id}`}>Ver</Link></td>
        </tr>)}</tbody>
      </table>
      {!items.length?<div className={styles.empty}>No hay trámites disponibles.</div>:null}
    </div>
  </div></PortalShell>
}

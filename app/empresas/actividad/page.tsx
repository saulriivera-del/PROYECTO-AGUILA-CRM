'use client'
import { useEffect,useState } from 'react'
import PortalShell from '../_components/PortalShell'
import styles from '../portal.module.css'
import { getCorporateUpdates } from '@/lib/corporate-portal/supabase-rest'
export default function ActividadPage(){
 const [items,setItems]=useState<any[]>([])
 useEffect(()=>{getCorporateUpdates().then(setItems).catch(()=>setItems([]))},[])
 return <PortalShell><div className={styles.content}><div className={styles.hero}><h1>Actividad</h1><p>Historial de actualizaciones publicadas por Visa Master.</p></div>
 <div className={`${styles.card} ${styles.sideCard}`} style={{marginTop:28}}>
 {items.map((u:any)=><div className={styles.activityItem} key={u.update_id}><strong>{u.title}</strong><small>{new Date(u.event_date).toLocaleString('es-MX')}</small><p>{u.description}</p></div>)}
 {!items.length?<div className={styles.empty}>Sin actividad disponible.</div>:null}</div></div></PortalShell>
}

'use client'
import { useEffect,useState } from 'react'
import PortalShell from '../_components/PortalShell'
import styles from '../portal.module.css'
import { getCorporateDocuments } from '@/lib/corporate-portal/supabase-rest'
export default function DocumentosPage(){
 const [items,setItems]=useState<any[]>([])
 useEffect(()=>{getCorporateDocuments().then(setItems).catch(()=>setItems([]))},[])
 return <PortalShell><div className={styles.content}><div className={styles.hero}><h1>Documentos</h1><p>Documentación publicada para tus trámites.</p></div>
 <div className={`${styles.card} ${styles.sideCard}`} style={{marginTop:28}}>
 {items.map((d:any)=><div className={styles.activityItem} key={d.id}><strong>{d.public_title||d.file_name}</strong><small>{d.document_type}</small><p>{d.portal_description||'Documento del trámite.'}</p>{d.external_file_url?<a className={styles.buttonSecondary} href={d.external_file_url} target="_blank" rel="noreferrer">Abrir documento</a>:null}</div>)}
 {!items.length?<div className={styles.empty}>El módulo de documentos está preparado. La automatización con Drive y AIS se conectará en una fase posterior.</div>:null}</div></div></PortalShell>
}

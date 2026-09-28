'use client'
import { FormEvent,useEffect,useState } from 'react'
import PortalShell from '../_components/PortalShell'
import styles from '../portal.module.css'
import { getCompany,getCompanyProfile,updateCorporatePassword } from '@/lib/corporate-portal/supabase-rest'
export default function CuentaPage(){
 const [profile,setProfile]=useState<any>(null),[company,setCompany]=useState<any>(null)
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[msg,setMsg]=useState(''),[error,setError]=useState('')
 useEffect(()=>{Promise.all([getCompanyProfile(),getCompany()]).then(([p,c])=>{setProfile(p);setCompany(c)})},[])
 async function submit(e:FormEvent){e.preventDefault();setMsg('');setError('')
   if(password.length<8){setError('La contraseña debe tener al menos 8 caracteres.');return}
   if(password!==confirm){setError('Las contraseñas no coinciden.');return}
   try{await updateCorporatePassword(password);setPassword('');setConfirm('');setMsg('Contraseña actualizada correctamente.')}catch(e:any){setError(e?.message||'No se pudo cambiar la contraseña.')}
 }
 return <PortalShell><div className={styles.content}><div className={styles.hero}><h1>Mi cuenta</h1><p>Datos y seguridad de acceso.</p></div>
 <div className={styles.detailGrid} style={{marginTop:28}}>
 <div className={`${styles.card} ${styles.caseCard}`}><h2 className={styles.sectionTitle}>Perfil</h2>
 <div className={styles.kv}><small>Nombre</small><strong>{profile?.name||'—'}</strong></div><br/>
 <div className={styles.kv}><small>Correo</small><strong>{profile?.email||'—'}</strong></div><br/>
 <div className={styles.kv}><small>Empresa</small><strong>{company?.legal_name||company?.name||'—'}</strong></div></div>
 <form className={`${styles.card} ${styles.caseCard}`} onSubmit={submit}><h2 className={styles.sectionTitle}>Cambiar contraseña</h2>
 {error?<div className={styles.error}>{error}</div>:null}{msg?<div className={styles.success}>{msg}</div>:null}
 <div className={styles.formGroup}><label className={styles.label}>Nueva contraseña</label><input className={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
 <div className={styles.formGroup}><label className={styles.label}>Confirmar contraseña</label><input className={styles.input} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></div>
 <button className={styles.button}>Actualizar contraseña</button></form></div></div></PortalShell>
}

'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../portal.module.css'
import { getCorporateSession, getCompanyProfile, signInCorporate } from '@/lib/corporate-portal/supabase-rest'

export default function CorporateLoginPage() {
  const router = useRouter()
  const [email,setEmail] = useState('gabriela@tradeinmotion.us')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)

  useEffect(() => {
    if (getCorporateSession()) getCompanyProfile().then(p => { if (p?.is_active) router.replace('/empresas') }).catch(()=>{})
  }, [router])

  async function submit(e:FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInCorporate(email.trim().toLowerCase(), password)
      const p = await getCompanyProfile()
      if (!p?.is_active) throw new Error('Tu usuario no está habilitado para el portal empresarial.')
      router.replace('/empresas')
    } catch (e:any) {
      setError(e?.message || 'No se pudo iniciar sesión.')
    } finally { setLoading(false) }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginBrandPanel}>
        <div className={styles.loginBrandOverlay}/>
        <div className={styles.loginBrandContent}>
          <div className={styles.loginBrandLogoBox}><img src="/visa-master-logo.png" alt="Visa Master" className={styles.loginBrandLogo}/></div>
          <div className={styles.loginBrandCopy}>
            <span className={styles.loginEyebrow}>PORTAL EMPRESARIAL</span>
            <h1>Seguimiento profesional,<br/>claro y centralizado.</h1>
            <p>Consulta el avance de tus candidatos, próximas citas y actividad reciente desde un entorno privado de Visa Master.</p>
          </div>
          <div className={styles.loginTrustGrid}>
            <div><strong>Información centralizada</strong><span>Un solo lugar para todos tus trámites.</span></div>
            <div><strong>Seguimiento actualizado</strong><span>Estados, citas y movimientos relevantes.</span></div>
            <div><strong>Acceso empresarial</strong><span>Información visible únicamente para tu empresa.</span></div>
          </div>
          <div className={styles.loginBrandFooter}>Visa Master · Simplificamos tu trámite de visa</div>
        </div>
      </section>

      <section className={styles.loginFormPanel}>
        <form className={styles.loginCard} onSubmit={submit}>
          <div className={styles.loginMobileLogo}><img src="/visa-master-logo.png" alt="Visa Master"/></div>
          <div className={styles.loginHeading}><span>ACCESO CORPORATIVO</span><h2>Bienvenida</h2><p>Ingresa con las credenciales asignadas a tu empresa.</p></div>
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.formGroup}><label className={styles.label}>Correo empresarial</label><input className={styles.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></div>
          <div className={styles.formGroup}><label className={styles.label}>Contraseña</label><input className={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></div>
          <button className={`${styles.button} ${styles.loginButton}`} disabled={loading} type="submit">{loading ? 'Ingresando…' : 'Ingresar al portal'}</button>
          <div className={styles.loginSecurityNote}><span className={styles.secureDot}/><span>Conexión segura · La información de tu empresa se mantiene separada de otros clientes.</span></div>
        </form>
      </section>
    </main>
  )
}

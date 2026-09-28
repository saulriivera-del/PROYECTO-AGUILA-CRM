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
    if (getCorporateSession()) {
      getCompanyProfile().then((p)=>{ if (p?.is_active) router.replace('/empresas') }).catch(()=>{})
    }
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <form className={styles.loginCard} onSubmit={submit}>
        <div className={styles.loginLogo}>
          <div className={styles.loginLogoMark}>VM</div>
          <h1>Visa Master</h1>
          <p>Portal Empresarial</p>
        </div>
        {error ? <div className={styles.error}>{error}</div> : null}
        <div className={styles.formGroup}>
          <label className={styles.label}>Correo</label>
          <input className={styles.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Contraseña</label>
          <input className={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <button className={styles.button} style={{width:'100%'}} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}

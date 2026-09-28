'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import styles from '../portal.module.css'
import { getCompany, getCompanyProfile, getCorporateUser, signOutCorporate } from '@/lib/corporate-portal/supabase-rest'

export default function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    Promise.all([getCorporateUser(), getCompanyProfile(), getCompany()])
      .then(([, p, c]) => {
        if (!p?.is_active) throw new Error('Usuario corporativo inactivo.')
        setProfile(p)
        setCompany(c)
      })
      .catch(() => router.replace('/empresas/login'))
      .finally(() => setChecking(false))
  }, [router])

  if (checking) return <div className={styles.page}><div className={styles.empty}>Validando acceso…</div></div>

  const initials = String(profile?.name || 'U').split(' ').slice(0,2).map((p:string)=>p[0]).join('').toUpperCase()

  async function logout() {
    await signOutCorporate()
    router.replace('/empresas/login')
  }

  const nav = [
    ['/empresas','⌂ Resumen'],
    ['/empresas/tramites','▤ Trámites'],
    ['/empresas/actividad','◷ Actividad'],
    ['/empresas/documentos','▱ Documentos'],
    ['/empresas/cuenta','◎ Mi cuenta'],
  ]

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link href="/empresas" className={styles.brand}>
            <span className={styles.brandMark}>VM</span>
            <span><strong>Visa Master</strong><small>Portal Empresarial</small></span>
          </Link>
          <nav className={styles.nav}>
            {nav.map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <div className={styles.companyBox}>
            <strong>{company?.legal_name || company?.name || 'Cliente corporativo'}</strong>
            <small>Cliente Corporativo</small>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarTitle}>
              <strong>Portal Empresarial</strong>
              <small>Seguimiento de trámites | Visa Master</small>
            </div>
            <div className={styles.userBox}>
              <span className={styles.avatar}>{initials}</span>
              <span>
                <strong>{profile?.name || 'Usuario'}</strong>
                <small style={{display:'block',color:'#71809a'}}>{company?.name || ''}</small>
              </span>
              <button className={styles.buttonSecondary} onClick={logout}>Salir</button>
            </div>
          </header>
          {children}
        </main>
      </div>

      <nav className={styles.mobileNav}>
        {nav.slice(0,4).map(([href,label]) => <Link key={href} href={href}>{label.replace(/^[^ ]+ /,'')}</Link>)}
      </nav>
    </div>
  )
}

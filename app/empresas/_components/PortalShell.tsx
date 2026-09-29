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

  if (checking) {
    return <div className={styles.page}><div className={styles.loadingScreen}><img src="/visa-master-logo.png" alt="Visa Master" className={styles.loadingLogo}/><div className={styles.loadingPulse}/><p>Validando acceso empresarial…</p></div></div>
  }

  const initials = String(profile?.name || 'U').split(' ').slice(0,2).map((p:string)=>p[0]).join('').toUpperCase()

  async function logout() {
    await signOutCorporate()
    router.replace('/empresas/login')
  }

  const nav = [
    { href:'/empresas', icon:'⌂', label:'Resumen' },
    { href:'/empresas/tramites', icon:'▤', label:'Trámites' },
    { href:'/empresas/actividad', icon:'◷', label:'Actividad' },
    { href:'/empresas/documentos', icon:'▱', label:'Documentos' },
    { href:'/empresas/cuenta', icon:'◎', label:'Mi cuenta' },
  ]

  const isActive = (href:string) => href === '/empresas' ? pathname === '/empresas' : pathname.startsWith(href)

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link href="/empresas" className={styles.brand}>
            <div className={styles.brandLogoBox}><img src="/visa-master-logo.png" alt="Visa Master" className={styles.brandLogo}/></div>
            <span className={styles.brandText}><strong>Portal Empresarial</strong><small>Visa Master</small></span>
          </Link>
          <div className={styles.sidebarDivider}/>
          <nav className={styles.nav}>
            {nav.map(item => <Link key={item.href} href={item.href} className={isActive(item.href) ? styles.navActive : ''}><span className={styles.navIcon}>{item.icon}</span><span>{item.label}</span></Link>)}
          </nav>
          <div className={styles.sidebarBottom}>
            <div className={styles.companyBox}>
              <span className={styles.companyEyebrow}>Empresa vinculada</span>
              <strong>{company?.legal_name || company?.name || 'Cliente corporativo'}</strong>
              <small>Cuenta empresarial Visa Master</small>
            </div>
            <div className={styles.sidebarSecure}><span className={styles.secureDot}/><span>Acceso seguro y privado</span></div>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarTitle}><span className={styles.topbarEyebrow}>VISA MASTER</span><strong>Portal Empresarial</strong><small>Seguimiento centralizado de trámites</small></div>
            <div className={styles.userBox}>
              <span className={styles.avatar}>{initials}</span>
              <span className={styles.userText}><strong>{profile?.name || 'Usuario'}</strong><small>{company?.name || ''}</small></span>
              <button className={styles.buttonSecondary} onClick={logout} type="button">Cerrar sesión</button>
            </div>
          </header>
          {children}
        </main>
      </div>

      <nav className={styles.mobileNav}>
        {nav.slice(0,4).map(item => <Link key={item.href} href={item.href} className={isActive(item.href) ? styles.mobileNavActive : ''}><span>{item.icon}</span><small>{item.label}</small></Link>)}
      </nav>
    </div>
  )
}

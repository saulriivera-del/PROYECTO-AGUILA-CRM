'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Clock3, FileText, FolderOpen, Home, LogOut, UserRound } from 'lucide-react'
import { Brand } from './Brand'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const items = [
  { href: '/portal', label: 'Resumen', icon: Home },
  { href: '/portal#tramites', label: 'Trámites', icon: FileText },
  { href: '/portal#actividad', label: 'Actividad', icon: Clock3 },
  { href: '/portal#documentos', label: 'Documentos', icon: FolderOpen },
  { href: '/portal/cuenta', label: 'Mi cuenta', icon: UserRound },
]

export function Sidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname()
  const supabase = createSupabaseBrowserClient()

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="sidebar">
      <Brand />
      <div className="sidebar-title">PORTAL EMPRESARIAL</div>
      <nav className="sidebar-nav">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/portal' ? pathname === '/portal' : pathname.startsWith(href.split('#')[0]) && href.includes('/cuenta')
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={20}/><span>{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="company-mini"><Building2 size={20}/><div><strong>{companyName}</strong><span>Cliente Corporativo</span></div></div>
        <button className="logout-btn" onClick={signOut}><LogOut size={17}/>Cerrar sesión</button>
      </div>
    </aside>
  )
}

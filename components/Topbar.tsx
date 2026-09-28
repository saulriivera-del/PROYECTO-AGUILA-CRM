import Link from 'next/link'
import { Bell, ChevronDown } from 'lucide-react'
import { initials } from '@/lib/format'

export function Topbar({ name, company }: { name: string; company: string }) {
  return (
    <header className="topbar">
      <div><h2>Portal Empresarial</h2><p>Seguimiento de trámites | Visa Master</p></div>
      <div className="topbar-user-wrap">
        <button className="icon-button" aria-label="Notificaciones"><Bell size={20}/><span className="notification-dot"/></button>
        <Link href="/portal/cuenta" className="topbar-user">
          <div className="avatar">{initials(name)}</div>
          <div><strong>{name}</strong><span>{company}</span></div>
          <ChevronDown size={18}/>
        </Link>
      </div>
    </header>
  )
}

import Link from 'next/link'
import { logout } from '@/app/login/actions'
import { requireAuthContext } from '@/lib/auth-context'

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await requireAuthContext()
  const initials = context.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <main className="crm-shell">
      <aside className="crm-sidebar">
        <Link href="/admin" className="crm-brand">
          <span className="brand-mark">Á</span>
          <span>
            <strong>Proyecto Águila</strong>
            <small>{context.organizationName}</small>
          </span>
        </Link>

        <nav className="crm-nav">
          <Link href="/admin">⌂ Centro de Control</Link>
          <Link href="/admin/prospectos">◎ Prospectos</Link>
          <Link href="/admin/clientes">👥 Personas</Link>
          <Link href="/admin/tramites">▤ Trámites</Link>
          <Link href="/admin/cobranza">$ Cobranza</Link>
          <Link href="/admin/agenda">▣ Agenda</Link>
        </nav>

        <div className="sidebar-user">
          <span className="user-avatar">{initials}</span>
          <span>
            <strong>{context.fullName}</strong>
            <small>{context.role}</small>
          </span>
        </div>

        <form action={logout}>
          <button className="logout-button">Cerrar sesión</button>
        </form>
      </aside>

      <section className="crm-main">{children}</section>
    </main>
  )
}

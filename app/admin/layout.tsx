import Link from 'next/link'
import { logout } from '@/app/login/actions'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'

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
          <Link href="/admin">⌂ Operaciones de hoy</Link>
          <Link href="/admin/prospectos">◎ Prospectos</Link>
          <Link href="/admin/clientes">👥 Personas</Link>
          <Link href="/admin/tramites">▤ Trámites</Link>
          <Link href="/admin/cobranza">$ Cobranza</Link>
          <Link href="/admin/agenda">▣ Agenda</Link>
          {isAdministrator(context.role) ? (
            <>
              <span className="nav-divider">Dirección</span>
              <Link href="/admin/insights">📊 Águila Insights</Link>
              <Link href="/admin/configuracion/usuarios">⚙ Usuarios y roles</Link>
              <Link href="/admin/configuracion/herramientas">🛠 Herramientas</Link>
            </>
          ) : null}
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

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/login/actions'

type Profile = {
  full_name: string | null
  role: string
  organization_id: string | null
  organizations:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null
}

function organizationName(profile: Profile | null) {
  const organization = profile?.organizations
  if (Array.isArray(organization)) return organization[0]?.name ?? 'Visa Master'
  return organization?.name ?? 'Visa Master'
}

async function safeCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  return error ? 0 : count ?? 0
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select(
      'full_name, role, organization_id, organizations(name, slug)',
    )
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null

  if (!profile?.organization_id) {
    return (
      <main className="setup-page">
        <section className="setup-card">
          <span className="eyebrow">Configuración incompleta</span>
          <h1>Tu usuario todavía no tiene organización</h1>
          <p>
            Revisa que la fila de <code>profiles</code> tenga un
            <code> organization_id</code> y el rol <code>admin</code>.
          </p>
          <form action={logout}>
            <button className="secondary-button">Cerrar sesión</button>
          </form>
        </section>
      </main>
    )
  }

  const [prospects, clients, processes, agenda, tasks] = await Promise.all([
    safeCount(supabase, 'prospects'),
    safeCount(supabase, 'clients'),
    safeCount(supabase, 'processes'),
    safeCount(supabase, 'agenda_events'),
    safeCount(supabase, 'tasks'),
  ])

  const firstName = profile.full_name?.split(' ')[0] ?? 'Ángel'

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="eagle-mark small">Á</div>
          <div>
            <strong>Proyecto Águila</strong>
            <small>{organizationName(profile)}</small>
          </div>
        </div>

        <nav>
          <a className="active" href="#resumen">⌂ Resumen</a>
          <a href="#proximamente">◎ Prospectos</a>
          <a href="#proximamente">👥 Clientes</a>
          <a href="#proximamente">▤ Trámites</a>
          <a href="#proximamente">$ Cobranza</a>
          <a href="#proximamente">▣ Agenda</a>
        </nav>

        <form action={logout}>
          <button className="logout-button">Cerrar sesión</button>
        </form>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <span className="eyebrow">Centro de control real</span>
            <h1>Buenos días, {firstName}</h1>
          </div>
          <div className="user-pill">
            <span>{profile.full_name ?? user.email}</span>
            <small>{profile.role}</small>
          </div>
        </header>

        <section className="hero-card" id="resumen">
          <div>
            <span>FASE 4.2 CONECTADA</span>
            <h2>Tu sesión y la base de datos ya trabajan juntas</h2>
            <p>
              Los indicadores siguientes se consultan directamente desde
              Supabase y respetan las políticas RLS de Visa Master.
            </p>
          </div>
          <div className="connection-badge">● Supabase conectado</div>
        </section>

        <section className="metrics">
          <article>
            <span className="metric-symbol blue">◎</span>
            <strong>{prospects}</strong>
            <small>Prospectos</small>
          </article>
          <article>
            <span className="metric-symbol green">👥</span>
            <strong>{clients}</strong>
            <small>Clientes</small>
          </article>
          <article>
            <span className="metric-symbol gold">▤</span>
            <strong>{processes}</strong>
            <small>Trámites</small>
          </article>
          <article>
            <span className="metric-symbol purple">▣</span>
            <strong>{agenda + tasks}</strong>
            <small>Agenda y tareas</small>
          </article>
        </section>

        <section className="status-grid" id="proximamente">
          <article className="status-card">
            <span className="eyebrow">Comprobaciones</span>
            <h3>Lo que ya funciona</h3>
            <ul>
              <li>Inicio de sesión con Supabase Auth.</li>
              <li>Ruta privada protegida.</li>
              <li>Sesión compartida mediante cookies.</li>
              <li>Perfil, rol y organización reales.</li>
              <li>Indicadores consultados desde PostgreSQL.</li>
              <li>Cierre de sesión.</li>
            </ul>
          </article>

          <article className="status-card highlighted">
            <span className="eyebrow">Siguiente entrega</span>
            <h3>Fase 4.3</h3>
            <p>
              Conectaremos formularios reales para crear y consultar
              prospectos, clientes y trámites. Después añadiremos pagos y
              agenda.
            </p>
            <div className="next-step">
              Base segura ✓ → Operaciones CRUD reales
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}

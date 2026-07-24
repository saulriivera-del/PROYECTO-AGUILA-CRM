import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { money, dateTime } from '@/lib/format'

async function countRows(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  table: string,
) {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  return count ?? 0
}

export default async function AdminPage() {
  const context = await requireAuthContext()
  const firstName = context.fullName.split(' ')[0]

  const [prospects, clients, processes, pendingTasks] = await Promise.all([
    countRows(context.supabase, 'prospects'),
    countRows(context.supabase, 'clients'),
    countRows(context.supabase, 'processes'),
    context.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Pendiente', 'En proceso'])
      .then(({ count }) => count ?? 0),
  ])

  const { data: recentProspects } = await context.supabase
    .from('prospects')
    .select('id, full_name, service_interest, status, created_at')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentPayments } = await context.supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('organization_id', context.organizationId)
    .gte('payment_date', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  const collectedToday = (recentPayments ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  )

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Centro de operaciones</span>
          <h1>Buenos días, {firstName}</h1>
          <p>Información en tiempo real desde Supabase.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href="/admin/prospectos">
            Ver prospectos
          </Link>
          <Link className="primary-button" href="/admin/clientes">
            + Nuevo cliente
          </Link>
        </div>
      </header>

      <section className="operation-banner">
        <div>
          <span>FASE 4.3 OPERATIVA</span>
          <h2>Los registros ya se guardan realmente</h2>
          <p>
            Prospectos, clientes y trámites quedan sincronizados entre tus
            dispositivos y protegidos por las reglas RLS.
          </p>
        </div>
        <strong>● Base conectada</strong>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>◎</span><strong>{prospects}</strong><small>Prospectos</small>
        </article>
        <article className="metric-card">
          <span>👥</span><strong>{clients}</strong><small>Clientes</small>
        </article>
        <article className="metric-card">
          <span>▤</span><strong>{processes}</strong><small>Trámites</small>
        </article>
        <article className="metric-card">
          <span>$</span><strong>{money(collectedToday)}</strong><small>Cobrado hoy</small>
        </article>
        <article className="metric-card">
          <span>✓</span><strong>{pendingTasks}</strong><small>Tareas pendientes</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Actividad reciente</span><h3>Prospectos nuevos</h3></div>
            <Link href="/admin/prospectos">Ver todos</Link>
          </div>
          <div className="record-list">
            {(recentProspects ?? []).map((prospect) => (
              <div className="record-row" key={prospect.id}>
                <div>
                  <strong>{prospect.full_name}</strong>
                  <small>{prospect.service_interest} · {prospect.status}</small>
                </div>
                <time>{dateTime(prospect.created_at)}</time>
              </div>
            ))}
            {!recentProspects?.length ? (
              <div className="empty-state">Todavía no hay prospectos registrados.</div>
            ) : null}
          </div>
        </article>

        <article className="panel-card action-card">
          <span className="eyebrow">Captura rápida</span>
          <h3>¿Qué deseas registrar?</h3>
          <p>Empieza por la etapa real en la que se encuentra la persona.</p>
          <Link href="/admin/prospectos#nuevo">◎ Está cotizando o tiene cita para formato</Link>
          <Link href="/admin/clientes#nuevo">👥 Ya inició formalmente el servicio</Link>
          <Link href="/admin/tramites#nuevo">▤ Agregar trámite a un cliente existente</Link>
        </article>
      </section>
    </>
  )
}

import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { money, dateTime } from '@/lib/format'

async function countRows(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  table: string,
  filters?: (query: any) => any,
) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filters) query = filters(query)
  const { count } = await query
  return count ?? 0
}

export default async function AdminPage() {
  const context = await requireAuthContext()
  const firstName = context.fullName.split(' ')[0]
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    activeProspects,
    clients,
    activeProcesses,
    lostProspects,
    convertedProspects,
    pendingTasks,
  ] = await Promise.all([
    countRows(context.supabase, 'prospects', (q) =>
      q.eq('organization_id', context.organizationId).eq('status', 'Activo'),
    ),
    countRows(context.supabase, 'clients', (q) =>
      q.eq('organization_id', context.organizationId),
    ),
    countRows(context.supabase, 'processes', (q) =>
      q.eq('organization_id', context.organizationId).neq('status', 'Concluido'),
    ),
    countRows(context.supabase, 'prospects', (q) =>
      q.eq('organization_id', context.organizationId).eq('status', 'Perdido'),
    ),
    countRows(context.supabase, 'prospects', (q) =>
      q.eq('organization_id', context.organizationId).eq('status', 'Convertido'),
    ),
    countRows(context.supabase, 'tasks', (q) =>
      q.eq('organization_id', context.organizationId).in('status', ['Pendiente', 'En proceso']),
    ),
  ])

  const { data: payments } = await context.supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('organization_id', context.organizationId)

  const collectedToday = (payments ?? [])
    .filter((payment) => new Date(payment.payment_date) >= startOfDay)
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  const { data: charges } = await context.supabase
    .from('process_charges')
    .select('agreed_amount, process_id')
    .eq('organization_id', context.organizationId)

  const totalAgreed = (charges ?? []).reduce((sum, charge) => sum + Number(charge.agreed_amount), 0)
  const totalPaid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0)
  const outstanding = Math.max(0, totalAgreed - totalPaid)

  const { data: dueFollowups } = await context.supabase
    .from('prospects')
    .select('id, full_name, phone, service_interest, next_followup_at')
    .eq('organization_id', context.organizationId)
    .eq('status', 'Activo')
    .or(`next_followup_at.lte.${now.toISOString()},next_followup_at.is.null`)
    .order('next_followup_at', { ascending: true })
    .limit(8)

  const { data: upcomingAgenda } = await context.supabase
    .from('agenda_events')
    .select('id, title, starts_at, assignment_scope, assigned_to')
    .eq('organization_id', context.organizationId)
    .gte('starts_at', now.toISOString())
    .order('starts_at')
    .limit(6)

  const conversionBase = activeProspects + convertedProspects + lostProspects
  const conversionRate = conversionBase
    ? Math.round((convertedProspects / conversionBase) * 100)
    : 0

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Centro de Control</span>
          <h1>Buenos días, {firstName}</h1>
          <p>Lo importante del negocio, sin buscar entre pantallas.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href="/admin/prospectos">Prospectos</Link>
          <Link className="primary-button" href="/admin/clientes">+ Cliente</Link>
        </div>
      </header>

      <section className="operation-banner">
        <div>
          <span>ÁGUILA OS · OPERACIÓN REAL</span>
          <h2>Hoy tienes {dueFollowups?.length ?? 0} seguimientos prioritarios</h2>
          <p>La tasa de conversión registrada es de {conversionRate}% y hay {money(outstanding)} pendientes por cobrar.</p>
        </div>
        <strong>● Sistema activo</strong>
      </section>

      <section className="executive-metrics">
        <article><span>Prospectos activos</span><strong>{activeProspects}</strong></article>
        <article><span>Clientes</span><strong>{clients}</strong></article>
        <article><span>Trámites activos</span><strong>{activeProcesses}</strong></article>
        <article><span>Cobrado hoy</span><strong>{money(collectedToday)}</strong></article>
        <article><span>Por cobrar</span><strong>{money(outstanding)}</strong></article>
        <article><span>Conversión</span><strong>{conversionRate}%</strong></article>
      </section>

      <section className="control-grid">
        <article className="panel-card control-main">
          <div className="panel-heading">
            <div><span className="eyebrow">Prioridad de hoy</span><h3>Seguimientos pendientes</h3></div>
            <Link href="/admin/prospectos">Abrir prospectos</Link>
          </div>

          <div className="priority-list">
            {(dueFollowups ?? []).map((prospect) => (
              <div key={prospect.id}>
                <div>
                  <strong>{prospect.full_name}</strong>
                  <small>{prospect.service_interest} · {prospect.phone}</small>
                </div>
                <time>{dateTime(prospect.next_followup_at)}</time>
              </div>
            ))}
            {!dueFollowups?.length ? <div className="empty-state">No hay seguimientos vencidos.</div> : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Agenda</span><h3>Próximos eventos</h3></div>
          </div>
          <div className="priority-list compact">
            {(upcomingAgenda ?? []).map((event) => (
              <div key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.assignment_scope}</small>
                </div>
                <time>{dateTime(event.starts_at)}</time>
              </div>
            ))}
            {!upcomingAgenda?.length ? <div className="empty-state">Sin eventos próximos.</div> : null}
          </div>
        </article>

        <article className="panel-card funnel-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Embudo</span><h3>Comercial</h3></div>
          </div>
          <div className="funnel-bars">
            <div><span>Activos</span><strong>{activeProspects}</strong><i style={{ width: '100%' }} /></div>
            <div><span>Convertidos</span><strong>{convertedProspects}</strong><i style={{ width: `${conversionBase ? Math.max(8, (convertedProspects / conversionBase) * 100) : 8}%` }} /></div>
            <div><span>Perdidos</span><strong>{lostProspects}</strong><i style={{ width: `${conversionBase ? Math.max(8, (lostProspects / conversionBase) * 100) : 8}%` }} /></div>
          </div>
        </article>

        <article className="panel-card assistant-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Águila recomienda</span><h3>Acciones inmediatas</h3></div>
          </div>
          <p>• Contactar primero a los prospectos sin fecha de seguimiento.</p>
          <p>• Revisar {money(outstanding)} en saldos pendientes.</p>
          <p>• Hay {pendingTasks} tareas abiertas.</p>
          <p>• Mantener la conversión por encima de 40%.</p>
        </article>
      </section>
    </>
  )
}

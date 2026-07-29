import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { money, dateTime } from '@/lib/format'
import { getFinancialSummary } from '@/lib/financial-summary'
import SubmitButton from '@/components/submit-button'
import { completeAgendaEvent } from '@/app/admin/agenda/actions'

function atStartOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export default async function AdminPage() {
  const context = await requireAuthContext()
  const firstName = context.fullName.split(' ')[0]
  const now = new Date()
  const todayStart = atStartOfDay(now)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const afterTomorrow = new Date(tomorrowStart)
  afterTomorrow.setDate(afterTomorrow.getDate() + 1)
  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [{ data: agenda }, { data: processes }, financial] = await Promise.all([
    context.supabase
      .from('agenda_events')
      .select(
        'id, title, description, starts_at, event_type, priority, assignment_scope, assigned_to, whatsapp_message, clients(full_name, phone), processes(id, service_name)',
      )
      .eq('organization_id', context.organizationId)
      .eq('status', 'Pendiente')
      .order('starts_at'),
    context.supabase
      .from('processes')
      .select(
        'id, service_name, priority, priority_attention_at, assigned_to, current_stage, clients(full_name)',
      )
      .eq('organization_id', context.organizationId)
      .not('status', 'in', '(Concluido,Cancelado)')
      .order('priority_attention_at', { ascending: true, nullsFirst: false }),
    getFinancialSummary(context.supabase, context.organizationId),
  ])

  const pendingAgenda = agenda ?? []
  const visibleToMe = pendingAgenda.filter(
    (event) =>
      event.assignment_scope === 'General' ||
      !event.assigned_to ||
      event.assigned_to === context.userId,
  )
  const myAgenda = pendingAgenda.filter(
    (event) => event.assigned_to === context.userId,
  )
  const overdue = visibleToMe.filter(
    (event) => new Date(event.starts_at) < todayStart,
  )
  const today = visibleToMe.filter((event) => {
    const date = new Date(event.starts_at)
    return date >= todayStart && date < tomorrowStart
  })
  const tomorrow = visibleToMe.filter((event) => {
    const date = new Date(event.starts_at)
    return date >= tomorrowStart && date < afterTomorrow
  })
  const thisWeek = visibleToMe.filter((event) => {
    const date = new Date(event.starts_at)
    return date >= afterTomorrow && date < weekEnd
  })

  const personalPriorityProcesses = (processes ?? []).filter(
    (process) =>
      process.assigned_to === context.userId &&
      (process.priority === 'Alta' ||
        (process.priority_attention_at &&
          new Date(process.priority_attention_at) < afterTomorrow)),
  )

  const collectedToday = financial.payments
    .filter((payment) => new Date(payment.payment_date) >= todayStart)
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  const workQueue = [...overdue, ...today]
    .sort((a, b) => {
      const aPersonal = a.assigned_to === context.userId ? 0 : 1
      const bPersonal = b.assigned_to === context.userId ? 0 : 1
      if (aPersonal !== bPersonal) return aPersonal - bPersonal
      const aUrgent =
        a.priority === 'Urgente' || a.event_type === 'Tarea prioritaria' ? 0 : 1
      const bUrgent =
        b.priority === 'Urgente' || b.event_type === 'Tarea prioritaria' ? 0 : 1
      if (aUrgent !== bUrgent) return aUrgent - bUrgent
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    })
    .slice(0, 12)

  const formatter = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <header className="daily-control-header">
        <div>
          <span className="eyebrow">Centro de Operaciones Diario</span>
          <h1>Buenos días, {firstName}</h1>
          <p className="daily-date">{formatter.format(now)}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href="/admin/agenda">
            Abrir agenda
          </Link>
          <Link className="primary-button" href="/admin/tramites">
            Operación activa
          </Link>
        </div>
      </header>

      {financial.error ? (
        <div className="notice error">
          No fue posible calcular la cobranza: {financial.error}
        </div>
      ) : null}

      <section className="daily-summary-grid">
        <article className={overdue.length ? 'summary-alert' : ''}>
          <span>Atrasadas</span>
          <strong>{overdue.length}</strong>
          <small>Requieren atención inmediata</small>
        </article>
        <article>
          <span>Mi día</span>
          <strong>{myAgenda.filter((event) => new Date(event.starts_at) < tomorrowStart).length}</strong>
          <small>Asignadas directamente a ti</small>
        </article>
        <article>
          <span>Hoy</span>
          <strong>{today.length}</strong>
          <small>Actividades del equipo</small>
        </article>
        <article>
          <span>Mañana</span>
          <strong>{tomorrow.length}</strong>
          <small>Próxima jornada</small>
        </article>
        <article>
          <span>Prioridades propias</span>
          <strong>{personalPriorityProcesses.length}</strong>
          <small>Trámites que debes atender</small>
        </article>
        <article>
          <span>Por cobrar</span>
          <strong>{money(financial.totalBalance)}</strong>
          <small>Cobrado hoy: {money(collectedToday)}</small>
        </article>
      </section>

      <section className="daily-operation-grid">
        <article className="panel-card daily-queue-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Bandeja de trabajo</span>
              <h3>Lo siguiente por atender</h3>
            </div>
            <Link href="/admin/agenda">Ver todo</Link>
          </div>

          <div className="daily-work-list">
            {workQueue.map((event) => {
              const client = Array.isArray(event.clients)
                ? event.clients[0]
                : event.clients
              const process = Array.isArray(event.processes)
                ? event.processes[0]
                : event.processes
              const personal = event.assigned_to === context.userId
              const urgent =
                event.priority === 'Urgente' ||
                event.event_type === 'Tarea prioritaria'
              const phone = String(client?.phone ?? '').replace(/\D/g, '')
              const normalizedPhone = phone.startsWith('52')
                ? phone
                : `52${phone}`
              const whatsappUrl =
                event.whatsapp_message && phone
                  ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
                      event.whatsapp_message,
                    )}`
                  : null

              return (
                <div
                  className={`daily-work-item ${urgent ? 'urgent' : ''}`}
                  key={event.id}
                >
                  <time>{dateTime(event.starts_at)}</time>
                  <div className="daily-work-copy">
                    <div className="daily-work-badges">
                      {personal ? <span className="personal-pill">Para mí</span> : null}
                      {urgent ? <span className="urgent-pill">Prioridad</span> : null}
                    </div>
                    <strong>{event.title}</strong>
                    <small>
                      {client?.full_name || 'Actividad interna'}
                      {process?.service_name ? ` · ${process.service_name}` : ''}
                    </small>
                  </div>
                  <div className="daily-work-actions">
                    {whatsappUrl ? (
                      <a
                        className="whatsapp-action"
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {process?.id ? (
                      <Link
                        className="secondary-button mini-button"
                        href={`/admin/tramites/${process.id}`}
                      >
                        Abrir
                      </Link>
                    ) : null}
                    <form action={completeAgendaEvent}>
                      <input type="hidden" name="event_id" value={event.id} />
                      <input type="hidden" name="return_to" value="/admin" />
                      <SubmitButton
                        className="mini-button"
                        pendingText="Actualizando…"
                      >
                        Realizada
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              )
            })}

            {!workQueue.length ? (
              <div className="empty-state">
                No tienes actividades atrasadas ni programadas para hoy.
              </div>
            ) : null}
          </div>
        </article>

        <aside className="daily-side-column">
          <article className="panel-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Mis prioridades</span>
                <h3>Trámites asignados</h3>
              </div>
              <strong>{personalPriorityProcesses.length}</strong>
            </div>
            <div className="priority-list compact">
              {personalPriorityProcesses.slice(0, 8).map((process) => {
                const client = Array.isArray(process.clients)
                  ? process.clients[0]
                  : process.clients
                return (
                  <Link
                    className="priority-process-link"
                    href={`/admin/tramites/${process.id}`}
                    key={process.id}
                  >
                    <div>
                      <strong>{client?.full_name || 'Cliente'}</strong>
                      <small>
                        {process.service_name} · {process.current_stage || 'Inicio'}
                      </small>
                    </div>
                    <time>{dateTime(process.priority_attention_at)}</time>
                  </Link>
                )
              })}
              {!personalPriorityProcesses.length ? (
                <div className="empty-state">Sin prioridades personales.</div>
              ) : null}
            </div>
          </article>

          <article className="panel-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Siguiente horizonte</span>
                <h3>Próximos días</h3>
              </div>
            </div>
            <div className="daily-horizon">
              <div>
                <span>Mañana</span>
                <strong>{tomorrow.length}</strong>
              </div>
              <div>
                <span>Resto de la semana</span>
                <strong>{thisWeek.length}</strong>
              </div>
              <div>
                <span>Cuentas vencidas</span>
                <strong>{money(financial.overdueBalance)}</strong>
              </div>
            </div>
          </article>

          <article className="panel-card daily-recommendation">
            <span className="eyebrow">Águila recomienda</span>
            <h3>Orden de atención</h3>
            <p>
              Atiende primero las actividades atrasadas asignadas a ti, después
              las prioridades urgentes del equipo y finalmente las actividades
              generales del día.
            </p>
          </article>
        </aside>
      </section>
    </>
  )
}

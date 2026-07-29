import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime } from '@/lib/format'
import AgendaForm from '@/components/agenda-form'
import SubmitButton from '@/components/submit-button'
import { completeAgendaEvent } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()

  const [{ data: events }, { data: profiles }] = await Promise.all([
    context.supabase
      .from('agenda_events')
      .select('*, profiles!agenda_events_assigned_to_fkey(full_name), clients(full_name, phone), processes(id, service_name)')
      .eq('organization_id', context.organizationId)
      .order('starts_at'),
    context.supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('organization_id', context.organizationId)
      .eq('is_active', true)
      .order('full_name'),
  ])

  const now = new Date()
  const todayStart = startOfDay(now)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const afterTomorrow = new Date(tomorrowStart)
  afterTomorrow.setDate(afterTomorrow.getDate() + 1)

  const pending = (events ?? []).filter((event) => event.status === 'Pendiente')
  const overdue = pending.filter((event) => new Date(event.starts_at) < todayStart)
  const today = pending.filter((event) => {
    const date = new Date(event.starts_at)
    return date >= todayStart && date < tomorrowStart
  })
  const tomorrow = pending.filter((event) => {
    const date = new Date(event.starts_at)
    return date >= tomorrowStart && date < afterTomorrow
  })
  const upcoming = pending.filter((event) => new Date(event.starts_at) >= afterTomorrow)
  const done = (events ?? []).filter((event) => event.status === 'Realizado')

  function EventCard({ event }: { event: any }) {
    const assigned = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles
    const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
    const process = Array.isArray(event.processes) ? event.processes[0] : event.processes
    const phone = String(client?.phone ?? '').replace(/\D/g, '')
    const normalizedPhone = phone.startsWith('52') ? phone : `52${phone}`
    const whatsappUrl = event.whatsapp_message && phone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(event.whatsapp_message)}`
      : null
    const urgent = event.priority === 'Urgente' || event.event_type === 'Tarea prioritaria'

    return (
      <article className={`agenda-item ${event.assignment_scope === 'Específico' ? 'specific' : 'general'} ${urgent ? 'urgent' : ''}`}>
        <div className="agenda-item-top">
          <span className={event.assignment_scope === 'Específico' ? 'assignment-pill specific' : 'assignment-pill general'}>
            {event.assignment_scope === 'Específico' ? assigned?.full_name || 'Asignado' : 'General'}
          </span>
          {urgent ? <span className="urgent-pill">Prioridad</span> : null}
          <time>{dateTime(event.starts_at)}</time>
        </div>
        <strong>{event.title}</strong>
        <p>{event.description || 'Sin descripción'}</p>
        <small>{event.event_type}{client?.full_name ? ` · ${client.full_name}` : ''}{process?.service_name ? ` · ${process.service_name}` : ''}</small>
        <div className="agenda-item-actions">
          {whatsappUrl ? <a className="whatsapp-action" href={whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp</a> : null}
          {process?.id ? <Link className="secondary-button mini-button" href={`/admin/tramites/${process.id}`}>Abrir trámite</Link> : null}
          <form action={completeAgendaEvent}>
            <input type="hidden" name="event_id" value={event.id} />
            <SubmitButton className="mini-button" pendingText="Actualizando…">Marcar realizado</SubmitButton>
          </form>
        </div>
      </article>
    )
  }

  function AgendaColumn({ title, items, tone }: { title: string; items: any[]; tone: string }) {
    return (
      <section className={`agenda-column ${tone}`}>
        <div className="agenda-column-heading"><h3>{title}</h3><strong>{items.length}</strong></div>
        <div className="agenda-list">
          {items.map((event) => <EventCard key={event.id} event={event} />)}
          {!items.length ? <div className="empty-state">Sin actividades.</div> : null}
        </div>
      </section>
    )
  }

  return (
    <>
      <header className="page-header">
        <div><span className="eyebrow">Centro operativo</span><h1>Agenda</h1><p>Prioridades, recordatorios automáticos y trabajo asignado.</p></div>
      </header>
      {params.created ? <div className="notice success">Actividad guardada.</div> : null}
      {params.updated ? <div className="notice success">Actividad completada.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <section className="agenda-desktop-layout">
        <aside className="agenda-sidebar"><AgendaForm profiles={profiles ?? []} /></aside>
        <main className="agenda-workspace">
          <section className="agenda-kpis">
            <article><span>Atrasadas</span><strong>{overdue.length}</strong></article>
            <article><span>Hoy</span><strong>{today.length}</strong></article>
            <article><span>Mañana</span><strong>{tomorrow.length}</strong></article>
            <article><span>Próximas</span><strong>{upcoming.length}</strong></article>
          </section>
          <div className="agenda-columns">
            <AgendaColumn title="Atrasadas" items={overdue} tone="overdue" />
            <AgendaColumn title="Hoy" items={today} tone="today" />
            <AgendaColumn title="Mañana" items={tomorrow} tone="tomorrow" />
            <AgendaColumn title="Próximas" items={upcoming} tone="upcoming" />
          </div>
          <section className="panel-card agenda-history-panel">
            <div className="panel-heading"><div><span className="eyebrow">Historial</span><h3>Últimas realizadas</h3></div><strong>{done.length}</strong></div>
            <div className="agenda-history-grid">
              {done.slice(0, 12).map((event) => <article className="agenda-item done" key={event.id}><strong>{event.title}</strong><small>{dateTime(event.starts_at)} · {event.event_type}</small></article>)}
            </div>
          </section>
        </main>
      </section>
    </>
  )
}

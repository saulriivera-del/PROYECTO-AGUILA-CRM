import { requireAuthContext } from '@/lib/auth-context'
import { dateTime } from '@/lib/format'
import AgendaForm from '@/components/agenda-form'
import SubmitButton from '@/components/submit-button'
import { completeAgendaEvent } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const context = await requireAuthContext()

  const [{ data: events }, { data: profiles }] = await Promise.all([
    context.supabase
      .from('agenda_events')
      .select('*, profiles!agenda_events_assigned_to_fkey(full_name), clients(full_name, phone)')
      .eq('organization_id', context.organizationId)
      .order('starts_at'),
    context.supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('organization_id', context.organizationId)
      .eq('is_active', true)
      .order('full_name'),
  ])

  const pending = (events ?? []).filter((event) => event.status === 'Pendiente')
  const done = (events ?? []).filter((event) => event.status === 'Realizado')

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Organización del equipo</span>
          <h1>Agenda</h1>
          <p>Actividades generales, recordatorios automáticos y contacto directo.</p>
        </div>
      </header>

      {params.created ? <div className="notice success">Actividad guardada.</div> : null}
      {params.updated ? <div className="notice success">Actividad completada.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <section className="agenda-layout">
        <AgendaForm profiles={profiles ?? []} />

        <section className="agenda-board">
          <div className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Pendientes</span><h3>Por realizar</h3></div>
              <strong>{pending.length}</strong>
            </div>

            <div className="agenda-list">
              {pending.map((event) => {
                const assigned = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles
                const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
                const phone = String(client?.phone ?? '').replace(/\D/g, '')
                const whatsappUrl =
                  event.whatsapp_message && phone
                    ? `https://wa.me/52${phone}?text=${encodeURIComponent(event.whatsapp_message)}`
                    : null

                return (
                  <article
                    className={event.assignment_scope === 'Específico' ? 'agenda-item specific' : 'agenda-item general'}
                    key={event.id}
                  >
                    <div className="agenda-item-top">
                      <span className={event.assignment_scope === 'Específico' ? 'assignment-pill specific' : 'assignment-pill general'}>
                        {event.assignment_scope === 'Específico'
                          ? assigned?.full_name || 'Asignado'
                          : 'General'}
                      </span>
                      <time>{dateTime(event.starts_at)}</time>
                    </div>

                    <strong>{event.title}</strong>
                    <p>{event.description || 'Sin descripción'}</p>
                    <small>
                      {event.event_type}
                      {client?.full_name ? ` · ${client.full_name}` : ''}
                    </small>

                    <div className="agenda-item-actions">
                      {whatsappUrl ? (
                        <a
                          className="whatsapp-action"
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir WhatsApp
                        </a>
                      ) : null}

                      <form action={completeAgendaEvent}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <SubmitButton className="mini-button" pendingText="Actualizando…">
                          Marcar realizado
                        </SubmitButton>
                      </form>
                    </div>
                  </article>
                )
              })}

              {!pending.length ? <div className="empty-state">Sin actividades pendientes.</div> : null}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Historial</span><h3>Realizadas</h3></div>
              <strong>{done.length}</strong>
            </div>
            <div className="agenda-list compact">
              {done.slice(0, 15).map((event) => (
                <article className="agenda-item done" key={event.id}>
                  <strong>{event.title}</strong>
                  <small>{dateTime(event.starts_at)} · {event.event_type}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </>
  )
}

import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import { getFinancialSummary } from '@/lib/financial-summary'
import { agendaCategory, inactivityLevel, processOperationalState } from '@/lib/operational'
import SubmitButton from '@/components/submit-button'
import ProcessQuickControl from '@/components/process-quick-control'
import { completeAgendaEvent } from '@/app/admin/agenda/actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function dayStart(value: Date) {
  const date = new Date(value); date.setHours(0, 0, 0, 0); return date
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()
  const now = new Date()
  const todayStart = dayStart(now)
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const selectedView = typeof params.view === 'string' ? params.view : 'mine'

  const [{ data: agenda }, { data: processes }, { data: profiles }, financial] = await Promise.all([
    context.supabase.from('agenda_events').select(
      'id, title, description, starts_at, event_type, priority, assignment_scope, assigned_to, whatsapp_message, clients(full_name, phone), processes(id, service_name)'
    ).eq('organization_id', context.organizationId).eq('status', 'Pendiente').order('starts_at'),
    context.supabase.from('processes').select(
      'id, service_name, status, priority, operational_status, priority_attention_at, assigned_to, current_stage, created_at, last_movement_at, clients(full_name, phone), process_charges(agreed_amount, payment_commitment_date), payments(amount)'
    ).eq('organization_id', context.organizationId).not('status', 'in', '(Concluido,Cancelado)').order('priority_attention_at', { ascending: true, nullsFirst: false }),
    context.supabase.from('profiles').select('id, full_name, role').eq('organization_id', context.organizationId).eq('is_active', true).order('full_name'),
    getFinancialSummary(context.supabase, context.organizationId),
  ])

  const allAgenda = agenda ?? []
  const allProcesses = (processes ?? []).map((process: any) => ({
    ...process,
    paid_amount: (process.payments ?? []).reduce((sum: number, payment: any) => sum + Number(payment.amount), 0),
  }))

  const visibleAgenda = allAgenda.filter((event: any) => {
    if (selectedView === 'team') return true
    if (selectedView === 'unassigned') return !event.assigned_to
    if (selectedView.startsWith('user:')) return event.assigned_to === selectedView.slice(5)
    return event.assigned_to === context.userId || !event.assigned_to || event.assignment_scope === 'General'
  })
  const visibleProcesses = allProcesses.filter((process: any) => {
    if (selectedView === 'team') return true
    if (selectedView === 'unassigned') return !process.assigned_to
    if (selectedView.startsWith('user:')) return process.assigned_to === selectedView.slice(5)
    return process.assigned_to === context.userId
  })

  const overdue = visibleAgenda.filter((event: any) => new Date(event.starts_at) < todayStart)
  const today = visibleAgenda.filter((event: any) => {
    const date = new Date(event.starts_at); return date >= todayStart && date < tomorrowStart
  })
  const queue = [...overdue, ...today].sort((a: any, b: any) => {
    const ap = a.assigned_to === context.userId ? 0 : 1
    const bp = b.assigned_to === context.userId ? 0 : 1
    if (ap !== bp) return ap - bp
    const au = a.priority === 'Urgente' || a.event_type === 'Tarea prioritaria' ? 0 : 1
    const bu = b.priority === 'Urgente' || b.event_type === 'Tarea prioritaria' ? 0 : 1
    if (au !== bu) return au - bu
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  })
  const recommended = queue[0]
  const processStates = visibleProcesses.map((process: any) => ({
    process,
    state: processOperationalState(process, now),
    inactive: inactivityLevel(process, now),
  }))
  const stalled = processStates.filter((item: any) => item.inactive.days >= 3)
  const stateCount = (state: string) => processStates.filter((item: any) => item.state === state).length

  return (
    <>
      <header className="daily-control-header">
        <div>
          <span className="eyebrow">Bandeja Inteligente · Fase 5.1</span>
          <h1>Centro de Operaciones</h1>
          <p className="daily-date">El sistema ordena el trabajo por responsable, urgencia y fecha.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href="/admin/agenda">Agenda</Link>
          <Link className="primary-button" href="/admin/tramites">Trámites</Link>
        </div>
      </header>

      {params.quick_updated ? <div className="notice success">Control operativo actualizado.</div> : null}
      {params.updated ? <div className="notice success">Actividad realizada.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <nav className="operations-view-tabs">
        <Link className={selectedView === 'mine' ? 'active' : ''} href="/admin?view=mine">Mi operación</Link>
        <Link className={selectedView === 'team' ? 'active' : ''} href="/admin?view=team">Todo el equipo</Link>
        {(profiles ?? []).map((profile: any) => (
          <Link key={profile.id} className={selectedView === `user:${profile.id}` ? 'active' : ''} href={`/admin?view=user:${profile.id}`}>
            {profile.full_name || 'Usuario'}
          </Link>
        ))}
        <Link className={selectedView === 'unassigned' ? 'active' : ''} href="/admin?view=unassigned">Sin asignar</Link>
      </nav>

      <section className="smart-recommendation-card">
        <div>
          <span className="eyebrow">Siguiente acción recomendada</span>
          {recommended ? (
            <>
              <span className="work-category">{agendaCategory(recommended)}</span>
              <h2>{recommended.title}</h2>
              <p>{dateTime(recommended.starts_at)} · {recommended.description || 'Sin indicaciones adicionales'}</p>
            </>
          ) : (
            <><h2>Operación al corriente</h2><p>No hay actividades vencidas ni programadas para hoy en esta vista.</p></>
          )}
        </div>
        {recommended ? (
          <div className="recommendation-actions">
            {recommended.processes?.id || recommended.processes?.[0]?.id ? (
              <Link className="secondary-button" href={`/admin/tramites/${recommended.processes?.id || recommended.processes?.[0]?.id}`}>Abrir trámite</Link>
            ) : null}
            <form action={completeAgendaEvent}>
              <input type="hidden" name="event_id" value={recommended.id} />
              <input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`} />
              <SubmitButton pendingText="Actualizando…">Marcar realizada</SubmitButton>
            </form>
          </div>
        ) : null}
      </section>

      <section className="smart-state-grid">
        {['Atender hoy','Esperando al cliente','Esperando cita','Esperando pago','Seguimiento pendiente','Sin movimiento'].map((state) => (
          <article key={state}><span>{state}</span><strong>{stateCount(state)}</strong></article>
        ))}
      </section>

      <section className="daily-operation-grid smart-operation-grid">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Trabajo de hoy</span><h3>Bandeja ordenada</h3></div><strong>{queue.length}</strong></div>
          <div className="daily-work-list">
            {queue.slice(0, 15).map((event: any) => {
              const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
              const process = Array.isArray(event.processes) ? event.processes[0] : event.processes
              return (
                <article className="daily-work-item" key={event.id}>
                  <div><span className="work-category">{agendaCategory(event)}</span><time>{dateTime(event.starts_at)}</time></div>
                  <div className="daily-work-copy"><strong>{event.title}</strong><small>{client?.full_name || 'Actividad interna'}{process?.service_name ? ` · ${process.service_name}` : ''}</small></div>
                  <div className="daily-work-actions">
                    {process?.id ? <Link className="secondary-button mini-button" href={`/admin/tramites/${process.id}`}>Abrir</Link> : null}
                    <form action={completeAgendaEvent}><input type="hidden" name="event_id" value={event.id}/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton className="mini-button" pendingText="Actualizando…">Realizada</SubmitButton></form>
                  </div>
                </article>
              )
            })}
            {!queue.length ? <div className="empty-state">Sin actividades para esta vista.</div> : null}
          </div>
        </article>

        <aside className="daily-side-column">
          <article className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Supervisión</span><h3>Trámites sin movimiento</h3></div><strong>{stalled.length}</strong></div>
            <div className="stalled-list">
              {stalled.slice(0, 8).map(({process, inactive}: any) => {
                const client = Array.isArray(process.clients) ? process.clients[0] : process.clients
                return <Link href={`/admin/tramites/${process.id}`} key={process.id} className={`stalled-item level-${inactive.level.toLowerCase()}`}><div><strong>{client?.full_name || 'Cliente'}</strong><small>{process.service_name} · {process.current_stage || 'Inicio'}</small></div><span>{inactive.days} días · {inactive.level}</span></Link>
              })}
              {!stalled.length ? <div className="empty-state">No hay trámites detenidos.</div> : null}
            </div>
          </article>
          <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Cobranza</span><h3>Resumen</h3></div></div><div className="daily-horizon"><div><span>Por cobrar</span><strong>{money(financial.totalBalance)}</strong></div><div><span>Vencido</span><strong>{money(financial.overdueBalance)}</strong></div></div></article>
        </aside>
      </section>

      <section className="panel-card smart-process-board">
        <div className="panel-heading"><div><span className="eyebrow">Control rápido</span><h3>Trámites de la vista seleccionada</h3></div><strong>{processStates.length}</strong></div>
        <div className="smart-process-list">
          {processStates.slice(0, 18).map(({process, state, inactive}: any) => {
            const client = Array.isArray(process.clients) ? process.clients[0] : process.clients
            return (
              <article className="smart-process-row" key={process.id}>
                <Link href={`/admin/tramites/${process.id}`} className="smart-process-main"><strong>{client?.full_name || 'Cliente'}</strong><small>{process.service_name} · {process.current_stage || 'Inicio'}</small><span className={`operational-state state-${state.toLowerCase().replaceAll(' ','-')}`}>{state}</span>{inactive.days >= 3 ? <em>{inactive.days} días sin movimiento</em> : null}</Link>
                <ProcessQuickControl processId={process.id} assignedTo={process.assigned_to} priority={process.priority} operationalStatus={process.operational_status} profiles={profiles ?? []} returnTo={`/admin?view=${encodeURIComponent(selectedView)}`} />
              </article>
            )
          })}
          {!processStates.length ? <div className="empty-state">No hay trámites en esta vista.</div> : null}
        </div>
      </section>
    </>
  )
}

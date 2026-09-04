import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import { daysBetweenKeys, hermosilloDateKey, hermosilloTodayKey } from '@/lib/hermosillo'
import { getFinancialSummary } from '@/lib/financial-summary'
import { agendaCategory, inactivityLevel, processOperationalState } from '@/lib/operational'
import SubmitButton from '@/components/submit-button'
import ProcessQuickControl from '@/components/process-quick-control'
import { completeAgendaEvent } from '@/app/admin/agenda/actions'
import { resolveConsularStatus, updateProcessStatus } from '@/app/admin/tramites/actions'
import { isAdministrator } from '@/lib/admin-access'
import { getPersonalGoalData } from '@/lib/personal-goal'
import PersonalGoalCard from '@/components/personal-goal-card'

type SearchParams = Promise<Record<string, string | string[] | undefined>>


export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()
  const now = new Date()
  const todayKey = hermosilloTodayKey()
  const selectedView = typeof params.view === 'string' ? params.view : 'mine'
  const administrator = isAdministrator(context.role)
  const personalGoal = administrator ? null : await getPersonalGoalData(context.supabase, context.organizationId, context.userId)

  const [{ data: agenda }, { data: processes }, { data: profiles }, { data: prospects }, financial] = await Promise.all([
    context.supabase.from('agenda_events').select(
      'id, title, description, starts_at, event_type, priority, assignment_scope, assigned_to, whatsapp_message, automation_key, clients(full_name, phone), processes(id, service_name, contact_phone)'
    ).eq('organization_id', context.organizationId).eq('status', 'Pendiente').order('starts_at'),
    context.supabase.from('processes').select(
      'id, service_name, status, priority, operational_status, priority_attention_at, assigned_to, current_stage, created_at, last_movement_at, cas_appointment_at, consulate_appointment_at, government_appointment_at, clients(full_name, phone), process_charges(agreed_amount, payment_commitment_date), payments(amount)'
    ).eq('organization_id', context.organizationId).not('status', 'in', '(Concluido,Cancelado,Rechazada)').order('priority_attention_at', { ascending: true, nullsFirst: false }),
    context.supabase.from('profiles').select('id, full_name, role').eq('organization_id', context.organizationId).eq('is_active', true).order('full_name'),
    context.supabase.from('prospects').select('id, full_name, phone, service_interest, status, assigned_to, next_followup_at, last_followup_at, updated_at, created_at').eq('organization_id', context.organizationId).eq('status','Activo'),
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
    return process.assigned_to === context.userId || !process.assigned_to
  })

  const overdue = visibleAgenda.filter((event: any) => hermosilloDateKey(event.starts_at) < todayKey)
  const today = visibleAgenda.filter((event: any) => hermosilloDateKey(event.starts_at) === todayKey)
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
  const stalled = processStates.filter((item: any) => item.inactive.days >= 4 && item.state === 'Sin movimiento')
  const prospectAlerts = (prospects ?? []).filter((prospect: any) => {
    const nextKey = prospect.next_followup_at ? hermosilloDateKey(prospect.next_followup_at) : null
    if (nextKey && nextKey >= todayKey) return false
    const reference = prospect.last_followup_at || prospect.updated_at || prospect.created_at
    return reference && daysBetweenKeys(hermosilloDateKey(reference), todayKey) >= 2
  }).filter((prospect: any) => selectedView === 'team' || selectedView === 'unassigned' ? (selectedView === 'team' || !prospect.assigned_to) : selectedView.startsWith('user:') ? prospect.assigned_to === selectedView.slice(5) : prospect.assigned_to === context.userId || !prospect.assigned_to)
  const stateCount = (state: string) => processStates.filter((item: any) => item.state === state).length
  const workItems = [
    ...queue.map((event: any) => ({
      kind: 'agenda' as const,
      id: `agenda:${event.id}`,
      rank: String(event.automation_key || '').endsWith(':consulate-status') ? 0 : 3,
      event,
    })),
    ...stalled.map((item: any) => ({
      kind: 'stalled' as const,
      id: `stalled:${item.process.id}`,
      rank: item.inactive.days >= 7 ? 1 : 2,
      ...item,
    })),
  ].sort((a: any, b: any) => a.rank - b.rank)

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

      {personalGoal ? <PersonalGoalCard data={personalGoal} compact /> : null}

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
        {recommended ? (() => {
          const recommendedProcess = Array.isArray(recommended.processes) ? recommended.processes[0] : recommended.processes
          const isConsular = String(recommended.automation_key || '').endsWith(':consulate-status') && recommendedProcess?.id
          return <div className="recommendation-actions">
            {recommendedProcess?.id ? <Link className="secondary-button" href={`/admin/tramites/${recommendedProcess.id}`}>Abrir trámite</Link> : null}
            {isConsular ? <>
              <form action={resolveConsularStatus}><input type="hidden" name="event_id" value={recommended.id}/><input type="hidden" name="process_id" value={recommendedProcess.id}/><input type="hidden" name="result_status" value="Rechazada"/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton className="danger-button" pendingText="Guardando…">Rechazada</SubmitButton></form>
              <form action={resolveConsularStatus}><input type="hidden" name="event_id" value={recommended.id}/><input type="hidden" name="process_id" value={recommendedProcess.id}/><input type="hidden" name="result_status" value="Aprobada"/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton pendingText="Guardando…">Aprobada</SubmitButton></form>
            </> : <form action={completeAgendaEvent}><input type="hidden" name="event_id" value={recommended.id}/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton pendingText="Actualizando…">Marcar realizada</SubmitButton></form>}
          </div>
        })() : null}
      </section>

      <section className="smart-state-grid">
        {['Atender hoy','Esperando al cliente','Esperando cita','Esperando pago','Seguimiento pendiente','Sin movimiento'].map((state) => (
          <article key={state}><span>{state}</span><strong>{stateCount(state)}</strong></article>
        ))}
      </section>

      <section className="daily-operation-grid smart-operation-grid">
        <article className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Trabajo de hoy · Hermosillo</span><h3>Bandeja ordenada</h3></div><strong>{workItems.length}</strong></div>
          <div className="daily-work-list">
            {workItems.slice(0, 20).map((item: any) => {
              if (item.kind === 'stalled') {
                const process = item.process
                const client = Array.isArray(process.clients) ? process.clients[0] : process.clients
                return <article className="daily-work-item stalled-queue-item" key={item.id}>
                  <div><span className="work-category">SIN MOVIMIENTO</span><time>{item.inactive.days} días</time></div>
                  <div className="daily-work-copy"><strong>{client?.full_name || 'Cliente'} · {process.service_name}</strong><small>{process.current_stage || 'Inicio'} · {item.inactive.reason}</small></div>
                  <div className="daily-work-actions"><Link className="secondary-button mini-button" href={`/admin/tramites/${process.id}`}>Abrir</Link><form action={updateProcessStatus}><input type="hidden" name="process_id" value={process.id}/><input type="hidden" name="next_status" value="Concluido"/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton className="mini-button" pendingText="Concluyendo…">Concluir</SubmitButton></form></div>
                </article>
              }

              const event = item.event
              const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
              const process = Array.isArray(event.processes) ? event.processes[0] : event.processes
              const consularDecision = String(event.automation_key || '').endsWith(':consulate-status') && process?.id
              return <article className={`daily-work-item ${consularDecision ? 'consular-decision-item' : ''}`} key={item.id}>
                <div><span className="work-category">{consularDecision ? 'CITA CONSULAR' : agendaCategory(event)}</span><time>{dateTime(event.starts_at)}</time></div>
                <div className="daily-work-copy"><strong>{event.title}</strong><small>{client?.full_name || 'Actividad interna'}{process?.service_name ? ` · ${process.service_name}` : ''}</small></div>
                <div className="daily-work-actions">
                  {process?.id ? <Link className="secondary-button mini-button" href={`/admin/tramites/${process.id}`}>Abrir</Link> : null}
                  {consularDecision ? <>
                    <form action={resolveConsularStatus}><input type="hidden" name="event_id" value={event.id}/><input type="hidden" name="process_id" value={process.id}/><input type="hidden" name="result_status" value="Rechazada"/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton className="mini-button danger-button" pendingText="Guardando…">Rechazada</SubmitButton></form>
                    <form action={resolveConsularStatus}><input type="hidden" name="event_id" value={event.id}/><input type="hidden" name="process_id" value={process.id}/><input type="hidden" name="result_status" value="Aprobada"/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton className="mini-button" pendingText="Guardando…">Aprobada</SubmitButton></form>
                  </> : <form action={completeAgendaEvent}><input type="hidden" name="event_id" value={event.id}/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton className="mini-button" pendingText="Actualizando…">Realizada</SubmitButton></form>}
                </div>
              </article>
            })}
            {!workItems.length ? <div className="empty-state">Sin actividades para esta vista.</div> : null}
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
          <article className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Seguimiento comercial</span><h3>Prospectos por revisar</h3></div><strong>{prospectAlerts.length}</strong></div>
            <div className="stalled-list">
              {prospectAlerts.slice(0,8).map((prospect:any)=><Link href={`/admin/prospectos/${prospect.id}`} key={prospect.id} className="stalled-item level-atencion"><div><strong>{prospect.full_name}</strong><small>{prospect.service_interest} · Sin seguimiento reciente</small></div><span>Abrir →</span></Link>)}
              {!prospectAlerts.length?<div className="empty-state">Prospectos al corriente.</div>:null}
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
                <Link href={`/admin/tramites/${process.id}`} className="smart-process-main"><strong>{client?.full_name || 'Cliente'}</strong><small>{process.service_name} · {process.current_stage || 'Inicio'}</small><span className={`operational-state state-${state.toLowerCase().replaceAll(' ','-')}`}>{state}</span>{inactive.days >= 4 ? <em>{inactive.days} días sin movimiento</em> : null}</Link>
                <div className="smart-process-actions"><ProcessQuickControl processId={process.id} assignedTo={process.assigned_to} priority={process.priority} operationalStatus={process.operational_status} profiles={profiles ?? []} returnTo={`/admin?view=${encodeURIComponent(selectedView)}`} /><form action={updateProcessStatus}><input type="hidden" name="process_id" value={process.id}/><input type="hidden" name="next_status" value="Concluido"/><input type="hidden" name="return_to" value={`/admin?view=${encodeURIComponent(selectedView)}`}/><SubmitButton className="mini-button secondary-button" pendingText="Concluyendo…">Concluir</SubmitButton></form></div>
              </article>
            )
          })}
          {!processStates.length ? <div className="empty-state">No hay trámites en esta vista.</div> : null}
        </div>
      </section>
    </>
  )
}

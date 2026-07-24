import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { money, dateTime } from '@/lib/format'
import { createFollowup } from '../actions'
import SubmitButton from '@/components/submit-button'

type Params = Promise<{ id: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const query = await searchParams
  const context = await requireAuthContext()

  const { data: client } = await context.supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .single()

  if (!client) notFound()

  const [{ data: processes }, { data: followups }, { data: activity }, { data: payments }] =
    await Promise.all([
      context.supabase
        .from('processes')
        .select('id, service_name, status, priority, current_stage, created_at, process_charges(agreed_amount), process_steps(id, status)')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('followups')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      context.supabase
        .from('activity_log')
        .select('*')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      context.supabase
        .from('payments')
        .select('id, amount, payment_date, payment_method, process_id')
        .in(
          'process_id',
          (await context.supabase.from('processes').select('id').eq('client_id', id)).data?.map((p) => p.id) ?? [],
        )
        .order('payment_date', { ascending: false }),
    ])

  const totalAgreed = (processes ?? []).reduce((sum, process) => {
    const charge = Array.isArray(process.process_charges)
      ? process.process_charges[0]
      : process.process_charges
    return sum + Number(charge?.agreed_amount ?? 0)
  }, 0)

  const totalPaid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0)
  const balance = Math.max(0, totalAgreed - totalPaid)

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Expediente individual</span>
          <h1>{client.full_name}</h1>
          <p>{client.phone} · {client.email || 'Sin correo'} · {client.city}, {client.state}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href="/admin/clientes">← Clientes</Link>
          <Link className="primary-button" href={`/admin/tramites?client=${client.id}#nuevo`}>
            + Nuevo trámite
          </Link>
        </div>
      </header>

      {query.followup ? <div className="notice success">Seguimiento guardado.</div> : null}
      {query.error ? <div className="notice error">{String(query.error)}</div> : null}

      <section className="client-kpis">
        <article><span>Trámites</span><strong>{processes?.length ?? 0}</strong></article>
        <article><span>Total acordado</span><strong>{money(totalAgreed)}</strong></article>
        <article><span>Pagado</span><strong>{money(totalPaid)}</strong></article>
        <article><span>Saldo</span><strong>{money(balance)}</strong></article>
      </section>

      <section className="dossier-grid">
        <div className="dossier-main">
          <section className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Servicios</span><h3>Trámites</h3></div>
            </div>

            <div className="process-cards">
              {(processes ?? []).map((process) => {
                const completed = (process.process_steps ?? []).filter((step) => step.status === 'Completado').length
                const total = process.process_steps?.length ?? 0
                const percent = total ? Math.round((completed / total) * 100) : 0

                return (
                  <Link className="process-card dossier-process" href={`/admin/tramites/${process.id}`} key={process.id}>
                    <div className="client-card-head">
                      <div>
                        <strong>{process.service_name}</strong>
                        <small>{process.status} · {process.current_stage || 'Inicio'}</small>
                      </div>
                      <span className={`priority ${process.priority.toLowerCase()}`}>{process.priority}</span>
                    </div>
                    <div className="progress"><span style={{ width: `${percent}%` }} /></div>
                    <small>{completed} de {total} etapas · Creado {dateTime(process.created_at)}</small>
                  </Link>
                )
              })}
              {!processes?.length ? <div className="empty-state">Sin trámites registrados.</div> : null}
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Historial</span><h3>Seguimientos</h3></div>
            </div>
            <div className="timeline">
              {(followups ?? []).map((followup) => (
                <article key={followup.id}>
                  <span />
                  <div>
                    <strong>{followup.contact_method}</strong>
                    <p>{followup.summary}</p>
                    <small>{dateTime(followup.created_at)} · Próximo: {dateTime(followup.next_followup_at)}</small>
                  </div>
                </article>
              ))}
              {!followups?.length ? <div className="empty-state">Sin seguimientos todavía.</div> : null}
            </div>
          </section>
        </div>

        <aside className="dossier-side">
          <form action={createFollowup} className="form-card">
            <input type="hidden" name="client_id" value={client.id} />
            <div className="panel-heading">
              <div><span className="eyebrow">Nuevo movimiento</span><h3>Registrar seguimiento</h3></div>
            </div>
            <label>Medio
              <select name="contact_method" defaultValue="WhatsApp">
                <option>WhatsApp</option>
                <option>Llamada</option>
                <option>Presencial</option>
                <option>Correo</option>
                <option>Otro</option>
              </select>
            </label>
            <label>Resumen<textarea name="summary" rows={4} required /></label>
            <label>Próxima acción<input name="next_action" /></label>
            <label>Próximo seguimiento<input name="next_followup_at" type="datetime-local" /></label>
            <SubmitButton pendingText="Guardando…">Guardar seguimiento</SubmitButton>
          </form>

          <section className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Bitácora</span><h3>Actividad</h3></div>
            </div>
            <div className="activity-list">
              {(activity ?? []).map((item) => (
                <div key={item.id}>
                  <strong>{item.description || item.action}</strong>
                  <small>{dateTime(item.created_at)}</small>
                </div>
              ))}
              {!activity?.length ? <div className="empty-state">Sin actividad registrada.</div> : null}
            </div>
          </section>
        </aside>
      </section>
    </>
  )
}

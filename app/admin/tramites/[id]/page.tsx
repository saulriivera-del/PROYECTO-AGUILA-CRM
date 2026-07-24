import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import ProgressStepButton from '@/components/progress-step-button'

type Params = Promise<{ id: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ProcessDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const query = await searchParams
  const context = await requireAuthContext()

  const { data: process } = await context.supabase
    .from('processes')
    .select('*, clients(id, full_name, phone), process_charges(agreed_amount, payment_commitment_date), process_steps(*)')
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .single()

  if (!process) notFound()

  const client = Array.isArray(process.clients) ? process.clients[0] : process.clients
  const charge = Array.isArray(process.process_charges)
    ? process.process_charges[0]
    : process.process_charges

  const { data: payments } = await context.supabase
    .from('payments')
    .select('*')
    .eq('process_id', id)
    .order('payment_date', { ascending: false })

  const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0)
  const agreed = Number(charge?.agreed_amount ?? 0)
  const balance = Math.max(0, agreed - paid)

  const steps = [...(process.process_steps ?? [])].sort((a, b) => a.step_order - b.step_order)
  const completed = steps.filter((step) => step.status === 'Completado').length
  const percent = steps.length ? Math.round((completed / steps.length) * 100) : 0

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Control del trámite</span>
          <h1>{process.service_name}</h1>
          <p>{client?.full_name} · {client?.phone}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/admin/clientes/${client?.id}`}>Expediente</Link>
          <Link className="secondary-button" href="/admin/tramites">← Trámites</Link>
        </div>
      </header>

      {query.updated ? <div className="notice success">Etapa actualizada correctamente.</div> : null}
      {query.error ? <div className="notice error">{String(query.error)}</div> : null}

      <section className="client-kpis">
        <article><span>Avance</span><strong>{percent}%</strong></article>
        <article><span>Total</span><strong>{money(agreed)}</strong></article>
        <article><span>Pagado</span><strong>{money(paid)}</strong></article>
        <article><span>Saldo</span><strong>{money(balance)}</strong></article>
      </section>

      <section className="process-detail-grid">
        <section className="panel-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Pipeline</span><h3>Etapas del trámite</h3></div>
            <span className={`status-pill ${process.status.toLowerCase().replace(' ', '-')}`}>{process.status}</span>
          </div>

          <div className="large-progress"><span style={{ width: `${percent}%` }} /></div>

          <div className="step-list">
            {steps.map((step) => (
              <article className={step.status === 'Completado' ? 'step-row done' : 'step-row'} key={step.id}>
                <div>
                  <span className="step-number">{step.step_order}</span>
                  <div>
                    <strong>{step.step_name}</strong>
                    <small>{step.is_optional ? 'Opcional' : 'Obligatoria'} · {step.status}</small>
                  </div>
                </div>
                <ProgressStepButton processId={process.id} stepId={step.id} status={step.status} />
              </article>
            ))}
          </div>
        </section>

        <aside className="dossier-side">
          <section className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Información</span><h3>Resumen</h3></div>
            </div>
            <p><strong>Etapa actual:</strong> {process.current_stage || 'Inicio'}</p>
            <p><strong>Prioridad:</strong> {process.priority}</p>
            <p><strong>Cita:</strong> {dateTime(process.government_appointment_at)}</p>
            <p><strong>Compromiso de pago:</strong> {charge?.payment_commitment_date || 'Sin fecha'}</p>
            <p><strong>Notas:</strong> {process.notes || 'Sin notas'}</p>
          </section>

          <section className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Cobranza</span><h3>Pagos</h3></div>
            </div>
            <div className="activity-list">
              {(payments ?? []).map((payment) => (
                <div key={payment.id}>
                  <strong>{money(payment.amount)} · {payment.payment_method}</strong>
                  <small>{dateTime(payment.payment_date)}</small>
                </div>
              ))}
              {!payments?.length ? <div className="empty-state">Sin pagos registrados.</div> : null}
            </div>
          </section>
        </aside>
      </section>
    </>
  )
}

import { createProcess } from './actions'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import SubmitButton from '@/components/submit-button'
import PaymentNowFields from '@/components/payment-now-fields'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function TramitesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()

  const [{ data: clients }, { data: flows }, { data: processes }] = await Promise.all([
    context.supabase.from('clients').select('id, full_name').eq('organization_id', context.organizationId).order('full_name'),
    context.supabase.from('service_flows').select('id, service_name').eq('is_active', true).order('service_name'),
    context.supabase
      .from('processes')
      .select('id, service_name, status, priority, current_stage, government_appointment_at, created_at, clients(full_name), process_charges(agreed_amount), process_steps(id, status)')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Corazón del CRM</span>
          <h1>Trámites</h1>
          <p>Cada servicio inicia automáticamente su cadena de etapas.</p>
        </div>
      </header>

      {params.created ? <div className="notice success">Trámite creado y etapas generadas.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <section className="data-layout">
        <form action={createProcess} className="form-card" id="nuevo">
          <div className="panel-heading"><div><span className="eyebrow">Nuevo servicio</span><h3>Crear trámite</h3></div></div>
          {!clients?.length ? <div className="notice error">Primero registra o convierte al menos un cliente.</div> : null}

          <div className="form-grid">
            <label>Cliente
              <select name="client_id" required defaultValue="">
                <option value="" disabled>Selecciona</option>
                {(clients ?? []).map((client) => <option value={client.id} key={client.id}>{client.full_name}</option>)}
              </select>
            </label>
            <label>Tipo de trámite
              <select name="service_flow_id" required defaultValue="">
                <option value="" disabled>Selecciona</option>
                {(flows ?? []).map((flow) => <option value={flow.id} key={flow.id}>{flow.service_name}</option>)}
              </select>
            </label>
            <label>Prioridad
              <select name="priority" defaultValue="Media"><option>Alta</option><option>Media</option><option>Baja</option></select>
            </label>
            <label>Total acordado<input name="agreed_amount" type="number" min="0" step="0.01" /></label>
            <label>Compromiso de pago<input name="payment_commitment_date" type="date" /></label>
            <label>Cita gubernamental<input name="government_appointment_at" type="datetime-local" /></label>
          </div>
          <PaymentNowFields />
          <label>Observaciones<textarea name="notes" rows={3} /></label>
          <SubmitButton pendingText="Creando trámite…" disabled={!clients?.length}>Crear trámite</SubmitButton>
        </form>

        <section className="table-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Operación activa</span><h3>Trámites registrados</h3></div>
            <strong>{processes?.length ?? 0}</strong>
          </div>

          <div className="process-cards">
            {(processes ?? []).map((process) => {
              const client = Array.isArray(process.clients) ? process.clients[0] : process.clients
              const charge = Array.isArray(process.process_charges) ? process.process_charges[0] : process.process_charges
              const completed = (process.process_steps ?? []).filter((step) => step.status === 'Completado').length
              const totalSteps = process.process_steps?.length ?? 0
              const percent = totalSteps ? Math.round((completed / totalSteps) * 100) : 0

              return (
                <article className="process-card" key={process.id}>
                  <div className="client-card-head">
                    <div><strong>{client?.full_name ?? 'Cliente'}</strong><small>{process.service_name}</small></div>
                    <span className={`priority ${process.priority.toLowerCase()}`}>{process.priority}</span>
                  </div>
                  <div className="process-meta">
                    <span>Estado: <strong>{process.status}</strong></span>
                    <span>Etapa: <strong>{process.current_stage || 'Inicio'}</strong></span>
                    <span>Total: <strong>{money(charge?.agreed_amount)}</strong></span>
                  </div>
                  <div className="progress"><span style={{ width: `${percent}%` }} /></div>
                  <small>{completed} de {totalSteps} etapas · Cita: {dateTime(process.government_appointment_at)}</small>
                </article>
              )
            })}
            {!processes?.length ? <div className="empty-state">No hay trámites todavía.</div> : null}
          </div>
        </section>
      </section>
    </>
  )
}

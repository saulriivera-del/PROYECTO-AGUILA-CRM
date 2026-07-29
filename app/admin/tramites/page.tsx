import Link from 'next/link'
import { createProcess } from './actions'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import SubmitButton from '@/components/submit-button'
import PaymentNowFields from '@/components/payment-now-fields'
import NumberInput from '@/components/number-input'
import ClientSearchSelect from '@/components/client-search-select'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function TramitesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const defaultClientId = typeof params.client === 'string' ? params.client : ''
  const context = await requireAuthContext()

  const [{ data: clients }, { data: rawFlows }, { data: processes }, { data: profiles }] = await Promise.all([
    context.supabase.from('clients').select('id, full_name, phone, city, state, processes(id)').eq('organization_id', context.organizationId).order('full_name'),
    context.supabase.from('service_flows').select('id, service_name').eq('is_active', true).order('service_name'),
    context.supabase
      .from('processes')
      .select('id, service_name, status, priority, current_stage, government_appointment_at, priority_attention_at, assigned_to, created_at, clients(full_name), process_charges(agreed_amount), process_steps(id, status)')
      .eq('organization_id', context.organizationId)
      .neq('status', 'Concluido')
      .order('created_at', { ascending: false }),
    context.supabase.from('profiles').select('id, full_name, role').eq('organization_id', context.organizationId).eq('is_active', true).order('full_name'),
  ])

  const flowOrder = [
    'Visa americana',
    'Renovación Visa Americana',
    'Pasaporte mexicano',
    'Visa + Pasaporte',
    'Adelanto de cita',
    'Visa TN',
    'Visa TD',
    'Visa tipo H',
    'eTA Canadá',
    'I-94',
    'Reporte de extravío',
  ]

  const flows = [...(rawFlows ?? [])].sort((a, b) => {
    const aIndex = flowOrder.indexOf(a.service_name)
    const bIndex = flowOrder.indexOf(b.service_name)

    if (aIndex === -1 && bIndex === -1) {
      return a.service_name.localeCompare(b.service_name, 'es')
    }
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

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
            <label className="span-2">Cliente
              <ClientSearchSelect
                defaultClientId={defaultClientId}
                clients={(clients ?? []).map((client) => ({
                  id: client.id,
                  full_name: client.full_name,
                  phone: client.phone,
                  city: client.city,
                  state: client.state,
                  process_count: client.processes?.length ?? 0,
                }))}
              />
            </label>
            <label>Tipo de trámite
              <select name="service_flow_id" required defaultValue="">
                <option value="" disabled>Selecciona</option>
                {(flows ?? []).map((flow) => <option value={flow.id} key={flow.id}>{flow.service_name}</option>)}
              </select>
            </label>
            <label>Responsable
              <select name="assigned_to" defaultValue="">
                <option value="">General · visible para todos</option>
                {(profiles ?? []).map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name || 'Usuario'} · {profile.role}
                  </option>
                ))}
              </select>
            </label>
            <label>Prioridad
              <select name="priority" defaultValue="Media"><option>Alta</option><option>Media</option><option>Baja</option></select>
            </label>
            <label>Fecha prioritaria de atención<input name="priority_attention_at" type="datetime-local" /></label>
            <label>Total acordado<NumberInput name="agreed_amount" min="0" step="0.01" inputMode="decimal" /></label>
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
              const assigned = (profiles ?? []).find((profile) => profile.id === process.assigned_to)
              const charge = Array.isArray(process.process_charges) ? process.process_charges[0] : process.process_charges
              const completed = (process.process_steps ?? []).filter((step) => step.status === 'Completado').length
              const totalSteps = process.process_steps?.length ?? 0
              const percent = totalSteps ? Math.round((completed / totalSteps) * 100) : 0

              return (
                <Link
                  className="process-card process-card-link"
                  href={`/admin/tramites/${process.id}`}
                  key={process.id}
                >
                  <div className="client-card-head">
                    <div><strong>{client?.full_name ?? 'Cliente'}</strong><small>{process.service_name}</small></div>
                    <span className={`priority ${process.priority.toLowerCase()}`}>{process.priority}</span>
                  </div>
                  <div className="process-assignment-line">
                    <span>{assigned?.full_name ? `Asignado a ${assigned.full_name}` : 'Disponible para todo el equipo'}</span>
                    {process.priority_attention_at ? <strong>Atender: {dateTime(process.priority_attention_at)}</strong> : null}
                  </div>
                  <div className="process-meta">
                    <span>Estado: <strong>{process.status}</strong></span>
                    <span>Etapa: <strong>{process.current_stage || 'Inicio'}</strong></span>
                    <span>Total: <strong>{money(charge?.agreed_amount)}</strong></span>
                  </div>
                  <div className="progress"><span style={{ width: `${percent}%` }} /></div>
                  <small>{completed} de {totalSteps} etapas · Cita: {dateTime(process.government_appointment_at)}</small>
                  <span className="open-process-label">Abrir trámite →</span>
                </Link>
              )
            })}
            {!processes?.length ? <div className="empty-state">No hay trámites todavía.</div> : null}
          </div>
        </section>
      </section>
    </>
  )
}

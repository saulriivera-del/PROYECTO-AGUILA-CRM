import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { dateOnly, dateTime, money } from '@/lib/format'
import NewProcessModal from '@/components/new-process-modal'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function TramitesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const defaultClientId = typeof params.client === 'string' ? params.client : ''
  const context = await requireAuthContext()

  const [
    { data: clients },
    { data: rawFlows },
    { data: processes },
    { data: profiles },
  ] = await Promise.all([
    context.supabase
      .from('clients')
      .select('id, full_name, phone, city, state, processes(id)')
      .eq('organization_id', context.organizationId)
      .order('full_name'),
    context.supabase
      .from('service_flows')
      .select('id, service_name')
      .eq('is_active', true)
      .order('service_name'),
    context.supabase
      .from('processes')
      .select(
        'id, service_name, status, priority, current_stage, government_appointment_at, contact_phone, priority_attention_at, assigned_to, created_at, clients(full_name), process_charges(agreed_amount), process_steps(id, status)',
      )
      .eq('organization_id', context.organizationId)
      .not('status', 'in', '(Concluido,Cancelado)')
      .order('priority_attention_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    context.supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('organization_id', context.organizationId)
      .eq('is_active', true)
      .order('full_name'),
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
          <p>Operación activa, responsables, prioridades y progreso.</p>
        </div>
        <div className="header-actions">
          <NewProcessModal
            defaultClientId={defaultClientId}
            clients={(clients ?? []).map((client) => ({
              id: client.id,
              full_name: client.full_name,
              phone: client.phone || '',
              city: client.city,
              state: client.state,
              process_count: client.processes?.length ?? 0,
            }))}
            flows={flows}
            profiles={profiles ?? []}
          />
        </div>
      </header>

      {params.created ? (
        <div className="notice success">
          Trámite creado y etapas generadas.
        </div>
      ) : null}
      {params.error ? (
        <div className="notice error">{String(params.error)}</div>
      ) : null}
      {!clients?.length ? (
        <div className="notice error">
          Primero registra o convierte al menos un cliente.
        </div>
      ) : null}

      <section className="table-card process-operation-full">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Operación activa</span>
            <h3>Trámites registrados</h3>
          </div>
          <strong>{processes?.length ?? 0}</strong>
        </div>

        <div className="process-cards process-cards-desktop">
          {(processes ?? []).map((process) => {
            const client = Array.isArray(process.clients)
              ? process.clients[0]
              : process.clients
            const assigned = (profiles ?? []).find(
              (profile) => profile.id === process.assigned_to,
            )
            const charge = Array.isArray(process.process_charges)
              ? process.process_charges[0]
              : process.process_charges
            const completed = (process.process_steps ?? []).filter(
              (step) => step.status === 'Completado',
            ).length
            const totalSteps = process.process_steps?.length ?? 0
            const percent = totalSteps
              ? Math.round((completed / totalSteps) * 100)
              : 0
            const personal = process.assigned_to === context.userId

            return (
              <Link
                className={`process-card process-card-link ${
                  personal ? 'process-card-personal' : ''
                }`}
                href={`/admin/tramites/${process.id}`}
                key={process.id}
              >
                <div className="client-card-head">
                  <div>
                    <strong>{client?.full_name ?? 'Cliente'}</strong>
                    <small>{process.service_name}</small>
                  </div>
                  <div className="process-card-badges">
                    {personal ? <span className="personal-pill">Para mí</span> : null}
                    <span
                      className={`priority ${String(
                        process.priority || 'Media',
                      ).toLowerCase()}`}
                    >
                      {process.priority || 'Media'}
                    </span>
                  </div>
                </div>

                <div className="process-assignment-line">
                  <span>
                    {assigned?.full_name
                      ? `Asignado a ${assigned.full_name}`
                      : 'Disponible para todo el equipo'}
                  </span>
                  {process.priority_attention_at ? (
                    <strong>
                      Atender: {dateTime(process.priority_attention_at)}
                    </strong>
                  ) : null}
                </div>

                <div className="process-meta">
                  <span>
                    Estado: <strong>{process.status}</strong>
                  </span>
                  <span>
                    Etapa:{' '}
                    <strong>{process.current_stage || 'Inicio'}</strong>
                  </span>
                  <span>
                    Total: <strong>{money(charge?.agreed_amount)}</strong>
                  </span>
                </div>

                <div className="progress">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <small>
                  {completed} de {totalSteps} etapas · Cita:{' '}
                  {dateOnly(process.government_appointment_at)}
                </small>
                <span className="open-process-label">Abrir trámite →</span>
              </Link>
            )
          })}

          {!processes?.length ? (
            <div className="empty-state">No hay trámites activos.</div>
          ) : null}
        </div>
      </section>
    </>
  )
}

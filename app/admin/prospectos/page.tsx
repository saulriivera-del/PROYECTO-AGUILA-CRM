import { convertProspect, reactivateProspect } from './actions'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import SubmitButton from '@/components/submit-button'
import ProspectFormDrawer from '@/components/prospect-form-drawer'
import ProspectFilters from '@/components/prospect-filters'
import CloseProspectForm from '@/components/close-prospect-form'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function daysSince(value: string | null) {
  if (!value) return null
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
}

export default async function ProspectosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const context = await requireAuthContext()

  const query = typeof params.q === 'string' ? params.q.trim() : ''
  const service = typeof params.service === 'string' ? params.service : ''
  const temperature = typeof params.temperature === 'string' ? params.temperature : ''
  const status = typeof params.status === 'string' ? params.status : 'Activo'

  let prospectQuery = context.supabase
    .from('prospects')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })

  if (service) prospectQuery = prospectQuery.eq('service_interest', service)
  if (temperature) prospectQuery = prospectQuery.eq('temperature', temperature)
  if (status) prospectQuery = prospectQuery.eq('status', status)
  if (query) {
    const safeQuery = query.replace(/[%_,]/g, '')
    prospectQuery = prospectQuery.or(
      `full_name.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`,
    )
  }

  const { data: prospects } = await prospectQuery

  const { count: activeCount } = await context.supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId)
    .eq('status', 'Activo')

  const { count: lostCount } = await context.supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId)
    .eq('status', 'Perdido')

  const { count: convertedCount } = await context.supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId)
    .eq('status', 'Convertido')

  return (
    <>
      <header className="page-header prospects-header">
        <div>
          <span className="eyebrow">Embudo comercial</span>
          <h1>Prospectos</h1>
          <p>Activos, convertidos y perdidos en un solo flujo.</p>
        </div>
        <ProspectFormDrawer />
      </header>

      {params.created ? <div className="notice success">Prospecto guardado correctamente.</div> : null}
      {params.closed ? <div className="notice success">Prospecto cerrado y conservado para futuras campañas.</div> : null}
      {params.reactivated ? <div className="notice success">Prospecto reactivado.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <section className="pipeline-summary">
        <div><strong>{activeCount ?? 0}</strong><span>Activos</span></div>
        <div><strong>{convertedCount ?? 0}</strong><span>Convertidos</span></div>
        <div><strong>{lostCount ?? 0}</strong><span>Perdidos</span></div>
      </section>

      <ProspectFilters />

      <section className="prospect-summary">
        <div><strong>{prospects?.length ?? 0}</strong><span>resultados</span></div>
        <p>Prioriza a quienes llevan más días sin seguimiento.</p>
      </section>

      <section className="prospect-cards">
        {(prospects ?? []).map((prospect) => {
          const phoneForLink = String(prospect.phone ?? '').replace(/\D/g, '')
          const waUrl = phoneForLink
            ? `https://wa.me/52${phoneForLink}?text=${encodeURIComponent(
                `Hola ${prospect.full_name}, te escribimos de Visa Master para dar seguimiento a tu trámite.`,
              )}`
            : '#'

          const referenceDate =
            prospect.next_followup_at ?? prospect.internal_appointment_at ?? prospect.updated_at
          const days = daysSince(referenceDate)
          const agingClass = days === null ? 'neutral' : days <= 3 ? 'fresh' : days <= 7 ? 'warning' : 'late'

          return (
            <article className="prospect-card" key={prospect.id}>
              <div className="prospect-card-main">
                <div className="prospect-avatar">
                  {prospect.full_name
                    .split(' ')
                    .slice(0, 2)
                    .map((part: string) => part[0])
                    .join('')
                    .toUpperCase()}
                </div>

                <div className="prospect-primary">
                  <div className="prospect-title-row">
                    <div>
                      <strong>{prospect.full_name}</strong>
                      <small>{prospect.phone} · {prospect.origin}</small>
                    </div>
                    <span className={`status-pill ${prospect.status.toLowerCase()}`}>
                      {prospect.status}
                    </span>
                  </div>

                  <div className="prospect-tags">
                    <span>{prospect.service_interest}</span>
                    <span>{prospect.temperature}</span>
                    <span>{prospect.city}, {prospect.state}</span>
                  </div>
                </div>
              </div>

              <div className="prospect-details">
                <div>
                  <span>Cotización</span>
                  <strong>{money(prospect.quoted_amount)}</strong>
                </div>
                <div>
                  <span>Próximo movimiento</span>
                  <strong>{dateTime(prospect.next_followup_at || prospect.internal_appointment_at)}</strong>
                </div>
                <div>
                  <span>Antigüedad</span>
                  <strong className={`aging ${agingClass}`}>
                    {days === null ? 'Sin seguimiento' : `${days} día(s)`}
                  </strong>
                </div>
              </div>

              <div className="prospect-actions">
                <a className="secondary-button" href={`tel:${prospect.phone}`}>Llamar</a>
                <a className="secondary-button" href={waUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>

                {prospect.status === 'Perdido' ? (
                  <form action={reactivateProspect}>
                    <input type="hidden" name="prospect_id" value={prospect.id} />
                    <SubmitButton className="primary-button" pendingText="Reactivando…">
                      Reactivar
                    </SubmitButton>
                  </form>
                ) : prospect.status !== 'Convertido' ? (
                  <>
                    <form action={convertProspect}>
                      <input type="hidden" name="prospect_id" value={prospect.id} />
                      <SubmitButton className="primary-button" pendingText="Convirtiendo…">
                        Convertir
                      </SubmitButton>
                    </form>
                    <CloseProspectForm prospectId={prospect.id} />
                  </>
                ) : (
                  <span className="converted-label">Cliente creado</span>
                )}
              </div>
            </article>
          )
        })}

        {!prospects?.length ? (
          <div className="empty-state prospect-empty">
            <strong>No encontramos prospectos con esos filtros.</strong>
            <span>Prueba limpiar los filtros o registra uno nuevo.</span>
          </div>
        ) : null}
      </section>
    </>
  )
}

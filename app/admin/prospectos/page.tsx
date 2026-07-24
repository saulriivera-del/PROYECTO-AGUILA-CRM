import { convertProspect } from './actions'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import SubmitButton from '@/components/submit-button'
import ProspectFormDrawer from '@/components/prospect-form-drawer'
import ProspectFilters from '@/components/prospect-filters'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

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

  return (
    <>
      <header className="page-header prospects-header">
        <div>
          <span className="eyebrow">Primera etapa comercial</span>
          <h1>Prospectos</h1>
          <p>Consulta, filtra y convierte personas sin saturar la pantalla.</p>
        </div>
        <ProspectFormDrawer />
      </header>

      {params.created ? <div className="notice success">Prospecto guardado correctamente.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <ProspectFilters />

      <section className="prospect-summary">
        <div>
          <strong>{prospects?.length ?? 0}</strong>
          <span>resultados</span>
        </div>
        <p>
          El formulario ahora se abre únicamente cuando necesitas registrar a alguien.
        </p>
      </section>

      <section className="prospect-cards">
        {(prospects ?? []).map((prospect) => {
          const phoneForLink = String(prospect.phone ?? '').replace(/\D/g, '')
          const waUrl = phoneForLink
            ? `https://wa.me/52${phoneForLink}?text=${encodeURIComponent(
                `Hola ${prospect.full_name}, te escribimos de Visa Master para dar seguimiento a tu trámite.`,
              )}`
            : '#'

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
                  <span>Registro</span>
                  <strong>{dateTime(prospect.created_at)}</strong>
                </div>
              </div>

              <div className="prospect-actions">
                <a className="secondary-button" href={`tel:${prospect.phone}`}>Llamar</a>
                <a className="secondary-button" href={waUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>

                {prospect.status !== 'Convertido' ? (
                  <form action={convertProspect}>
                    <input type="hidden" name="prospect_id" value={prospect.id} />
                    <SubmitButton className="primary-button" pendingText="Convirtiendo…">
                      Convertir en cliente
                    </SubmitButton>
                  </form>
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

import { createClient } from './actions'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime } from '@/lib/format'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ClientesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()

  const { data: clients } = await context.supabase
    .from('clients')
    .select('id, full_name, phone, whatsapp, email, origin, city, state, created_at, processes(id, service_name, status)')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Relación formal</span>
          <h1>Clientes</h1>
          <p>Personas que ya iniciaron un servicio con Visa Master.</p>
        </div>
      </header>

      {params.created ? <div className="notice success">Cliente guardado correctamente.</div> : null}
      {params.converted ? <div className="notice success">Prospecto convertido en cliente.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <section className="data-layout">
        <form action={createClient} className="form-card" id="nuevo">
          <div className="panel-heading"><div><span className="eyebrow">Registro directo</span><h3>Nuevo cliente</h3></div></div>
          <p className="form-intro">Úsalo cuando ya se llenó el formulario, se agendó el pasaporte o se recibieron accesos para adelanto.</p>

          <div className="form-grid">
            <label>Nombre completo<input name="full_name" required /></label>
            <label>Apellido paterno<input name="paternal_surname" /></label>
            <label>Apellido materno<input name="maternal_surname" /></label>
            <label>Fecha de nacimiento<input name="birth_date" type="date" /></label>
            <label>CURP<input name="curp" /></label>
            <label>Teléfono<input name="phone" required /></label>
            <label>WhatsApp<input name="whatsapp" /></label>
            <label>Correo<input name="email" type="email" /></label>
            <label>Origen
              <select name="origin" defaultValue="Oficina">
                <option>Oficina</option><option>WhatsApp</option><option>Teléfono</option>
                <option>Facebook</option><option>Instagram</option><option>Google</option>
                <option>Recomendación</option><option>Formulario web</option>
              </select>
            </label>
            <label>Ciudad<input name="city" defaultValue="Hermosillo" /></label>
            <label>Estado<input name="state" defaultValue="Sonora" /></label>
          </div>
          <label>Observaciones<textarea name="notes" rows={4} /></label>
          <button className="primary-button">Guardar cliente</button>
        </form>

        <section className="table-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Expedientes reales</span><h3>Clientes registrados</h3></div>
            <strong>{clients?.length ?? 0}</strong>
          </div>

          <div className="client-cards">
            {(clients ?? []).map((client) => (
              <article className="client-card" key={client.id}>
                <div className="client-card-head">
                  <div><strong>{client.full_name}</strong><small>{client.whatsapp || client.phone}</small></div>
                  <span>{client.processes?.length ?? 0} trámite(s)</span>
                </div>
                <p>{client.email || 'Sin correo'} · {client.city}, {client.state}</p>
                <div className="tag-row">
                  {(client.processes ?? []).map((process) => (
                    <span className="service-tag" key={process.id}>{process.service_name} · {process.status}</span>
                  ))}
                  {!client.processes?.length ? <span className="muted">Sin trámites todavía</span> : null}
                </div>
                <small>Registrado {dateTime(client.created_at)} · Origen: {client.origin}</small>
              </article>
            ))}
            {!clients?.length ? <div className="empty-state">No hay clientes todavía.</div> : null}
          </div>
        </section>
      </section>
    </>
  )
}

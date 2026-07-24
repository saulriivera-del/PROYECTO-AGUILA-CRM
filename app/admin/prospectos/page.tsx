import { createProspect, convertProspect } from './actions'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import SubmitButton from '@/components/submit-button'
import MexicoStates from '@/components/mexico-states'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ProspectosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const context = await requireAuthContext()

  const { data: prospects } = await context.supabase
    .from('prospects')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Primera etapa comercial</span>
          <h1>Prospectos</h1>
          <p>Personas que cotizan, tienen cita para formato o siguen evaluando.</p>
        </div>
      </header>

      {params.created ? <div className="notice success">Prospecto guardado correctamente.</div> : null}
      {params.error ? <div className="notice error">{String(params.error)}</div> : null}

      <section className="data-layout prospects-layout">
        <form action={createProspect} className="form-card compact-form" id="nuevo">
          <div className="panel-heading">
            <div><span className="eyebrow">Nuevo registro</span><h3>Agregar prospecto</h3></div>
          </div>

          <div className="form-grid">
            <label className="span-2">Nombre completo<input name="full_name" required /></label>
            <label>Teléfono / WhatsApp<input name="phone" inputMode="tel" required /></label>
            <label>Correo<input name="email" type="email" /></label>
            <label>Servicio
              <select name="service_interest" required defaultValue="">
                <option value="" disabled>Selecciona</option>
                <option>Visa americana</option>
                <option>Pasaporte mexicano</option>
                <option>Visa + Pasaporte</option>
                <option>Adelanto de cita</option>
                <option>Visa TN</option>
                <option>Visa TD</option>
                <option>Visa tipo H</option>
                <option>eTA Canadá</option>
                <option>I-94</option>
                <option>Reporte de extravío</option>
              </select>
            </label>
            <label>Origen
              <select name="origin" defaultValue="WhatsApp">
                <option>WhatsApp</option><option>Oficina</option><option>Teléfono</option>
                <option>Facebook</option><option>Instagram</option><option>Google</option>
                <option>Recomendación</option><option>Formulario web</option>
              </select>
            </label>
            <label>Temperatura
              <select name="temperature" defaultValue="Seguimiento">
                <option>Caliente</option><option>Seguimiento</option><option>Frío</option>
              </select>
            </label>
            <label>Monto cotizado<input name="quoted_amount" type="number" min="0" step="0.01" /></label>
            <label>Cita para llenar formato<input name="internal_appointment_at" type="datetime-local" /></label>
            <label>Próximo seguimiento<input name="next_followup_at" type="datetime-local" /></label>
            <label>Ciudad<input name="city" defaultValue="Hermosillo" /></label>
            <label>Estado<MexicoStates /></label>
          </div>

          <label>Observaciones<textarea name="notes" rows={3} /></label>
          <SubmitButton pendingText="Guardando prospecto…">Guardar prospecto</SubmitButton>
        </form>

        <section className="table-card">
          <div className="panel-heading">
            <div><span className="eyebrow">Base real</span><h3>Prospectos registrados</h3></div>
            <strong>{prospects?.length ?? 0}</strong>
          </div>

          <div className="responsive-table">
            <table>
              <thead><tr><th>Persona</th><th>Servicio</th><th>Seguimiento</th><th>Cotización</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {(prospects ?? []).map((prospect) => (
                  <tr key={prospect.id}>
                    <td><strong>{prospect.full_name}</strong><small>{prospect.phone}<br />{prospect.origin}</small></td>
                    <td>{prospect.service_interest}<small>{prospect.temperature}</small></td>
                    <td>{dateTime(prospect.next_followup_at || prospect.internal_appointment_at)}</td>
                    <td>{money(prospect.quoted_amount)}</td>
                    <td><span className={`status-pill ${prospect.status.toLowerCase()}`}>{prospect.status}</span></td>
                    <td>
                      {prospect.status !== 'Convertido' ? (
                        <form action={convertProspect}>
                          <input type="hidden" name="prospect_id" value={prospect.id} />
                          <SubmitButton className="mini-button" pendingText="Convirtiendo…">
                            Convertir en cliente
                          </SubmitButton>
                        </form>
                      ) : <span className="muted">Convertido</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!prospects?.length ? <div className="empty-state">No hay prospectos todavía.</div> : null}
          </div>
        </section>
      </section>
    </>
  )
}

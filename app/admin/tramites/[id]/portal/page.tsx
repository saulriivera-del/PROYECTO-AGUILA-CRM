import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { dateTime } from '@/lib/format'
import SubmitButton from '@/components/submit-button'
import {
  addCorporatePortalDocument,
  publishCorporatePortalUpdate,
  removeCorporatePortalDocument,
  removeCorporatePortalUpdate,
  saveCorporateCompanyLink,
  saveCorporatePortalSettings,
  unlinkCorporateCompany,
} from './actions'
import './portal-admin.css'

type Params = Promise<{ id: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function CorporatePortalAdminPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const query = await searchParams
  const context = await requireAuthContext()
  requireAdministrator(context)

  const { data: process } = await context.supabase
    .from('processes')
    .select(`
      id,
      organization_id,
      service_name,
      current_stage,
      portal_visibility,
      public_status,
      public_status_label,
      public_note,
      public_next_step,
      requires_client_action,
      client_action_note,
      portal_group_label,
      portal_applicant_count,
      portal_last_updated_at,
      clients(id, full_name, phone, email)
    `)
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .single()

  if (!process) notFound()

  const client = Array.isArray(process.clients) ? process.clients[0] : process.clients

  const [
    { data: documents },
    { data: updates },
    { data: links },
    { data: companies },
  ] = await Promise.all([
    context.supabase
      .from('corporate_portal_documents')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('process_id', id)
      .order('created_at', { ascending: false }),
    context.supabase
      .from('corporate_portal_manual_updates')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('process_id', id)
      .order('event_date', { ascending: false }),
    context.supabase
      .from('process_company_links')
      .select('company_id, visible_in_portal, external_reference, companies(name, legal_name)')
      .eq('process_id', id),
    context.supabase
      .from('companies')
      .select('id, name, legal_name, slug, is_active')
      .eq('is_active', true)
      .order('name'),
  ])

  const linkedCompany = links?.[0]
  const company = Array.isArray(linkedCompany?.companies)
    ? linkedCompany?.companies?.[0]
    : linkedCompany?.companies

  return (
    <div className="corporate-portal-admin">
      <header className="page-header">
        <div>
          <span className="eyebrow">Portal Empresarial</span>
          <h1>{client?.full_name || 'Trámite'}</h1>
          <p>{process.service_name} · {company?.legal_name || company?.name || 'Sin empresa vinculada'}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/admin/tramites/${id}`}>← Volver al trámite</Link>
          {linkedCompany ? (
            <a className="secondary-button" href={`https://empresas.visamaster.com.mx/tramites/${id}`} target="_blank" rel="noreferrer">
              Ver portal ↗
            </a>
          ) : null}
        </div>
      </header>

      {query.saved ? <div className="notice success">Información pública actualizada.</div> : null}
      {query.company_linked ? <div className="notice success">Empresa vinculada correctamente.</div> : null}
      {query.company_unlinked ? <div className="notice success">Empresa desvinculada correctamente.</div> : null}
      {query.update_published ? <div className="notice success">Actualización publicada.</div> : null}
      {query.document_added ? <div className="notice success">Documento publicado.</div> : null}
      {query.document_removed ? <div className="notice success">Documento retirado.</div> : null}
      {query.update_removed ? <div className="notice success">Actualización eliminada.</div> : null}
      {query.error ? <div className="notice error">{String(query.error)}</div> : null}

      <section className="client-kpis">
        <article><span>Empresa</span><strong>{company?.name || 'Sin asignar'}</strong></article>
        <article><span>Visibilidad</span><strong>{process.portal_visibility && linkedCompany ? 'Publicado' : 'Oculto'}</strong></article>
        <article><span>Documentos</span><strong>{documents?.length ?? 0}</strong></article>
        <article><span>Actualizaciones</span><strong>{updates?.length ?? 0}</strong></article>
      </section>

      <section className="panel-card corporate-company-card">
        <div className="panel-heading">
          <div><span className="eyebrow">Asignación corporativa</span><h3>Empresa vinculada</h3></div>
          {linkedCompany ? <span className="status-pill activo">{company?.legal_name || company?.name}</span> : <span className="status-pill">Sin empresa</span>}
        </div>

        <div className="corporate-company-grid">
          <form action={saveCorporateCompanyLink} className="corporate-inline-form">
            <input type="hidden" name="process_id" value={process.id} />
            <label>
              Empresa
              <select name="company_id" defaultValue={linkedCompany?.company_id || ''} required>
                <option value="">Seleccionar empresa…</option>
                {(companies ?? []).map((item: any) => (
                  <option key={item.id} value={item.id}>{item.legal_name || item.name}</option>
                ))}
              </select>
            </label>
            <label>
              Referencia interna
              <input name="external_reference" defaultValue={linkedCompany?.external_reference || ''} placeholder="Ej. JUAN-TN" />
            </label>
            <SubmitButton className="primary-button" pendingText="Vinculando…">
              {linkedCompany ? 'Cambiar / actualizar empresa' : 'Vincular empresa'}
            </SubmitButton>
          </form>

          {linkedCompany ? (
            <form action={unlinkCorporateCompany} className="corporate-unlink-form">
              <input type="hidden" name="process_id" value={process.id} />
              <p>Al desvincular, este trámite dejará de mostrarse en el Portal Empresarial.</p>
              <SubmitButton className="danger-outline-button" pendingText="Desvinculando…">Desvincular empresa</SubmitButton>
            </form>
          ) : (
            <div className="corporate-unlinked-help">
              <strong>Este trámite aún no pertenece a una empresa.</strong>
              <p>Selecciona una empresa para poder publicarlo.</p>
            </div>
          )}
        </div>
      </section>

      <section className="corporate-portal-grid">
        <div className="corporate-portal-column">
          <form action={saveCorporatePortalSettings} className="form-card corporate-static-card">
            <input type="hidden" name="process_id" value={process.id} />
            <div className="panel-heading">
              <div><span className="eyebrow">Lo que verá la empresa</span><h3>Información pública</h3></div>
            </div>

            <label className="corporate-check-row">
              <input name="portal_visibility" type="checkbox" defaultChecked={Boolean(process.portal_visibility)} disabled={!linkedCompany} />
              <span><strong>Mostrar este trámite en el Portal Empresarial</strong>{!linkedCompany ? <small>Primero vincula una empresa.</small> : null}</span>
            </label>

            <label>Código de estado<input name="public_status" defaultValue={process.public_status || ''} placeholder="Ej. SEARCHING_APPOINTMENT" /></label>
            <label>Estado visible<input name="public_status_label" defaultValue={process.public_status_label || ''} placeholder="Ej. Buscando cita" /></label>
            <label>Nota pública<textarea name="public_note" rows={4} defaultValue={process.public_note || ''} /></label>
            <label>Próximo paso<textarea name="public_next_step" rows={3} defaultValue={process.public_next_step || ''} /></label>

            <div className="form-grid two-columns">
              <label>Número de solicitantes<input name="portal_applicant_count" type="number" min="1" defaultValue={process.portal_applicant_count || ''} /></label>
              <label>Nombre del grupo<input name="portal_group_label" defaultValue={process.portal_group_label || ''} placeholder="Ej. Grupo familiar · 4 solicitantes" /></label>
            </div>

            <label className="corporate-check-row">
              <input name="requires_client_action" type="checkbox" defaultChecked={Boolean(process.requires_client_action)} />
              <span><strong>Requiere acción de la empresa</strong></span>
            </label>

            <label>Instrucción para la empresa<textarea name="client_action_note" rows={3} defaultValue={process.client_action_note || ''} /></label>

            <SubmitButton className="primary-button" pendingText="Guardando…" disabled={!linkedCompany}>
              Guardar información pública
            </SubmitButton>
          </form>

          <form action={publishCorporatePortalUpdate} className="form-card corporate-static-card">
            <input type="hidden" name="process_id" value={process.id} />
            <div className="panel-heading">
              <div><span className="eyebrow">Historial público</span><h3>Publicar actualización</h3></div>
            </div>
            <label>Título<input name="title" required placeholder="Ej. Cita actualizada" /></label>
            <label>Descripción<textarea name="description" rows={4} required /></label>
            <SubmitButton className="primary-button" pendingText="Publicando…" disabled={!linkedCompany}>Publicar actualización</SubmitButton>
          </form>
        </div>

        <aside className="corporate-portal-column">
          <form action={addCorporatePortalDocument} className="form-card corporate-static-card">
            <input type="hidden" name="process_id" value={process.id} />
            <div className="panel-heading">
              <div><span className="eyebrow">Archivos públicos</span><h3>Agregar documento</h3></div>
            </div>
            <label>Nombre visible<input name="title" required placeholder="Confirmación de cita" /></label>
            <label>Tipo<select name="document_type" defaultValue="Confirmación"><option>Confirmación</option><option>DS-160</option><option>Carta</option><option>Recibo</option><option>PDF</option><option>Otro</option></select></label>
            <label>Descripción<textarea name="description" rows={3} /></label>
            <label>Enlace del documento<input name="external_url" type="url" required placeholder="https://..." /></label>
            <p className="corporate-form-help">Google Drive, Supabase Storage u otra URL accesible para la empresa.</p>
            <SubmitButton className="primary-button" pendingText="Agregando…" disabled={!linkedCompany}>Publicar documento</SubmitButton>
          </form>

          <section className="panel-card corporate-static-card">
            <div className="panel-heading"><div><span className="eyebrow">Documentos publicados</span><h3>Archivos visibles</h3></div></div>
            <div className="activity-list">
              {(documents ?? []).map((doc: any) => (
                <div key={doc.id}>
                  <strong>{doc.title}</strong>
                  <small>{doc.document_type} · {dateTime(doc.created_at)}</small>
                  {doc.description ? <p>{doc.description}</p> : null}
                  <div className="header-actions">
                    <a className="secondary-button mini-button" href={doc.external_url} target="_blank" rel="noreferrer">Abrir</a>
                    <form action={removeCorporatePortalDocument}>
                      <input type="hidden" name="process_id" value={process.id} />
                      <input type="hidden" name="document_id" value={doc.id} />
                      <SubmitButton className="danger-outline-button mini-button" pendingText="Quitando…">Retirar</SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
              {!documents?.length ? <div className="empty-state">No hay documentos publicados.</div> : null}
            </div>
          </section>

          <section className="panel-card corporate-static-card">
            <div className="panel-heading"><div><span className="eyebrow">Actualizaciones publicadas</span><h3>Historial manual</h3></div></div>
            <div className="activity-list">
              {(updates ?? []).map((update: any) => (
                <div key={update.id}>
                  <strong>{update.title}</strong>
                  <small>{dateTime(update.event_date)}</small>
                  <p>{update.description}</p>
                  <form action={removeCorporatePortalUpdate}>
                    <input type="hidden" name="process_id" value={process.id} />
                    <input type="hidden" name="update_id" value={update.id} />
                    <SubmitButton className="danger-outline-button mini-button" pendingText="Eliminando…">Eliminar</SubmitButton>
                  </form>
                </div>
              ))}
              {!updates?.length ? <div className="empty-state">Sin actualizaciones manuales.</div> : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}

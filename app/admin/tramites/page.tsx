import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { dateOnly, dateTime, money } from '@/lib/format'
import { inactivityAlert } from '@/lib/operational'
import NewProcessModal from '@/components/new-process-modal'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
const text = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default async function TramitesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const defaultClientId = typeof params.client === 'string' ? params.client : ''
  const query = typeof params.q === 'string' ? params.q.trim() : ''
  const statusFilter = typeof params.status === 'string' ? params.status : 'activos'
  const serviceFilter = typeof params.service === 'string' ? params.service : ''
  const ownerFilter = typeof params.owner === 'string' ? params.owner : ''
  const sort = typeof params.sort === 'string' ? params.sort : 'priority'
  const context = await requireAuthContext()

  const [{ data: clients }, { data: rawFlows }, { data: processData }, { data: profiles }] = await Promise.all([
    context.supabase.from('clients').select('id, full_name, phone, email, city, state, processes(id)').eq('organization_id', context.organizationId).order('full_name'),
    context.supabase.from('service_flows').select('id, service_name').eq('is_active', true).order('service_name'),
    context.supabase.from('processes').select('id, service_name, status, priority, operational_status, current_stage, government_appointment_at, cas_appointment_at, consulate_appointment_at, contact_phone, priority_attention_at, assigned_to, created_at, last_movement_at, clients(full_name, phone, email), process_charges(agreed_amount), process_steps(id, status)').eq('organization_id', context.organizationId).order('created_at', { ascending: false }),
    context.supabase.from('profiles').select('id, full_name, role').eq('organization_id', context.organizationId).eq('is_active', true).order('full_name'),
  ])

  const flowOrder = ['Visa americana','Renovación Visa Americana','Pasaporte mexicano','Visa + Pasaporte','Adelanto de cita','Visa TN','Visa TD','Visa tipo H','eTA Canadá','I-94','Reporte de extravío']
  const flows = [...(rawFlows ?? [])].sort((a,b) => {
    const ai=flowOrder.indexOf(a.service_name), bi=flowOrder.indexOf(b.service_name)
    if(ai<0&&bi<0)return a.service_name.localeCompare(b.service_name,'es'); if(ai<0)return 1;if(bi<0)return -1;return ai-bi
  })

  let processes = (processData ?? []).filter((process:any) => {
    const client = Array.isArray(process.clients) ? process.clients[0] : process.clients
    const final = ['concluido','cancelado','aprobada','aprobado','rechazada','rechazado'].some((word) => text(process.status).includes(word) || text(process.current_stage).includes(word))
    if (statusFilter === 'activos' && final) return false
    if (statusFilter === 'concluidos' && !final) return false
    if (statusFilter === 'sin-movimiento' && !inactivityAlert(process)) return false
    if (statusFilter === 'esperando-cita' && !text(process.current_stage).includes('cita') && !text(process.operational_status).includes('cita')) return false
    if (statusFilter === 'prioridad' && process.priority !== 'Alta') return false
    if (serviceFilter && process.service_name !== serviceFilter) return false
    if (ownerFilter === 'mine' && process.assigned_to !== context.userId) return false
    if (ownerFilter === 'unassigned' && process.assigned_to) return false
    if (ownerFilter && !['mine','unassigned'].includes(ownerFilter) && process.assigned_to !== ownerFilter) return false
    if (!query) return true
    const haystack = [client?.full_name, client?.phone, client?.email, process.contact_phone, process.service_name, process.current_stage, process.status, process.id].map(text).join(' ')
    return haystack.includes(text(query))
  })

  processes.sort((a:any,b:any) => {
    if (sort === 'name') {
      const ac=Array.isArray(a.clients)?a.clients[0]:a.clients, bc=Array.isArray(b.clients)?b.clients[0]:b.clients
      return String(ac?.full_name??'').localeCompare(String(bc?.full_name??''),'es')
    }
    if (sort === 'recent') return new Date(b.created_at).getTime()-new Date(a.created_at).getTime()
    if (sort === 'inactive') return (inactivityAlert(b)?.days??0)-(inactivityAlert(a)?.days??0)
    if (sort === 'appointment') return new Date(a.consulate_appointment_at||a.government_appointment_at||'2999-01-01').getTime()-new Date(b.consulate_appointment_at||b.government_appointment_at||'2999-01-01').getTime()
    const rank:any={Alta:0,Media:1,Baja:2}; return (rank[a.priority]??1)-(rank[b.priority]??1)
  })

  return <>
    <header className="page-header"><div><span className="eyebrow">Operación organizada</span><h1>Trámites</h1><p>Busca, filtra y atiende expedientes sin perder seguimiento.</p></div><div className="header-actions"><NewProcessModal defaultClientId={defaultClientId} clients={(clients??[]).map((c:any)=>({id:c.id,full_name:c.full_name,phone:c.phone||'',email:c.email,city:c.city,state:c.state,process_count:c.processes?.length??0}))} flows={flows} profiles={profiles??[]}/></div></header>
    {params.error ? <div className="notice error">{String(params.error)}</div> : null}

    <form className="process-filter-bar" method="get">
      <input name="q" defaultValue={query} placeholder="Nombre, teléfono, correo, etapa o expediente" />
      <select name="status" defaultValue={statusFilter}><option value="activos">Activos</option><option value="sin-movimiento">Sin movimiento</option><option value="esperando-cita">Esperando cita</option><option value="prioridad">Prioridad alta</option><option value="concluidos">Concluidos</option><option value="todos">Todos</option></select>
      <select name="service" defaultValue={serviceFilter}><option value="">Todos los servicios</option>{flows.map((f:any)=><option key={f.id} value={f.service_name}>{f.service_name}</option>)}</select>
      <select name="owner" defaultValue={ownerFilter}><option value="">Todos los responsables</option><option value="mine">Asignados a mí</option><option value="unassigned">Sin asignar</option>{(profiles??[]).map((p:any)=><option key={p.id} value={p.id}>{p.full_name||'Usuario'}</option>)}</select>
      <select name="sort" defaultValue={sort}><option value="priority">Prioridad</option><option value="inactive">Más días sin movimiento</option><option value="appointment">Cita más próxima</option><option value="recent">Más recientes</option><option value="name">Nombre</option></select>
      <button className="primary-button" type="submit">Aplicar</button><Link className="secondary-button" href="/admin/tramites">Limpiar</Link>
    </form>

    <section className="table-card process-operation-full"><div className="panel-heading"><div><span className="eyebrow">Resultados</span><h3>Expedientes encontrados</h3></div><strong>{processes.length}</strong></div>
      <div className="process-cards process-cards-desktop">{processes.map((process:any)=>{
        const client=Array.isArray(process.clients)?process.clients[0]:process.clients
        const assigned=(profiles??[]).find((p:any)=>p.id===process.assigned_to)
        const charge=Array.isArray(process.process_charges)?process.process_charges[0]:process.process_charges
        const completed=(process.process_steps??[]).filter((s:any)=>s.status==='Completado').length,total=process.process_steps?.length??0,percent=total?Math.round(completed/total*100):0
        const inactive=inactivityAlert(process)
        return <Link className={`process-card process-card-link ${process.assigned_to===context.userId?'process-card-personal':''} ${inactive?'process-card-stalled':''}`} href={`/admin/tramites/${process.id}`} key={process.id}>
          <div className="client-card-head"><div><strong>{client?.full_name??'Cliente'}</strong><small>{process.service_name}</small></div><div className="process-card-badges">{inactive?<span className="urgent-pill">{inactive.days} días</span>:null}<span className={`priority ${String(process.priority||'Media').toLowerCase()}`}>{process.priority||'Media'}</span></div></div>
          <div className="process-contact-line"><span>{process.contact_phone||client?.phone||'Sin teléfono'}</span><span>{client?.email||'Sin correo'}</span></div>
          <div className="process-assignment-line"><span>{assigned?.full_name?`Asignado a ${assigned.full_name}`:'Disponible para el equipo'}</span>{process.priority_attention_at?<strong>Atender: {dateTime(process.priority_attention_at)}</strong>:null}</div>
          <div className="process-meta"><span>Estado: <strong>{process.status}</strong></span><span>Etapa: <strong>{process.current_stage||'Inicio'}</strong></span><span>Total: <strong>{money(charge?.agreed_amount)}</strong></span></div>
          <div className="progress"><span style={{width:`${percent}%`}}/></div><small>{completed} de {total} etapas · Cita: {dateOnly(process.consulate_appointment_at||process.government_appointment_at)}</small>{inactive?<small className="stalled-reason">Revisar: {inactive.reason}</small>:null}<span className="open-process-label">Abrir trámite →</span>
        </Link>})}{!processes.length?<div className="empty-state">No hay trámites que coincidan con los filtros.</div>:null}</div>
    </section>
  </>
}

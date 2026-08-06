import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import ProspectFormDrawer from '@/components/prospect-form-drawer'
import ProspectFilters from '@/components/prospect-filters'
import ProspectCalendar from '@/components/prospect-calendar'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
const dayMs = 86400000

function startOfDay(value = new Date()) { const d = new Date(value); d.setHours(0,0,0,0); return d }
function daysSince(value: string | null) { return value ? Math.max(0, Math.floor((Date.now()-new Date(value).getTime())/dayMs)) : null }

export default async function ProspectosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()
  const query = typeof params.q === 'string' ? params.q.trim() : ''
  const view = typeof params.view === 'string' ? params.view : 'agenda'
  const service = typeof params.service === 'string' ? params.service : ''
  const temperature = typeof params.temperature === 'string' ? params.temperature : ''
  const status = typeof params.status === 'string' ? params.status : 'Activo'

  let prospectQuery = context.supabase.from('prospects').select('*').eq('organization_id', context.organizationId).order('next_followup_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false})
  if (service) prospectQuery=prospectQuery.eq('service_interest',service)
  if (temperature) prospectQuery=prospectQuery.eq('temperature',temperature)
  if (status) prospectQuery=prospectQuery.eq('status',status)
  if (query) { const safe=query.replace(/[%_,]/g,''); prospectQuery=prospectQuery.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`) }
  const {data: prospects}=await prospectQuery

  const today=startOfDay(); const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1); const afterTomorrow=new Date(tomorrow); afterTomorrow.setDate(afterTomorrow.getDate()+1)
  const active=(prospects??[]).filter((p:any)=>p.status==='Activo')
  const due=(p:any)=>p.next_followup_at?new Date(p.next_followup_at):null
  const overdue=active.filter((p:any)=>{ const d=due(p); return Boolean(d && d < today) })
  const todayItems=active.filter((p:any)=>{const d=due(p);return d&&d>=today&&d<tomorrow})
  const tomorrowItems=active.filter((p:any)=>{const d=due(p);return d&&d>=tomorrow&&d<afterTomorrow})
  const upcoming=active.filter((p:any)=>{const d=due(p);return d&&d>=afterTomorrow})
  const noDate=active.filter((p:any)=>!p.next_followup_at)
  const neglected=active.filter((p:any)=>{
    const next=due(p); if(next&&next>=today) return false
    const days = daysSince(p.last_followup_at||p.updated_at||p.created_at); return days !== null && days >= 2
  })

  return <>
    <header className="page-header prospects-header"><div><span className="eyebrow">Prospectos 2.0</span><h1>Agenda comercial</h1><p>Expedientes, anotaciones y próximos seguimientos en un solo flujo.</p></div><ProspectFormDrawer /></header>
    {params.created?<div className="notice success">Prospecto guardado correctamente.</div>:null}
    {params.error?<div className="notice error">{String(params.error)}</div>:null}

    <section className="pipeline-summary prospect-kpis">
      <Link href="/admin/prospectos?view=overdue"><strong>{overdue.length}</strong><span>Atrasados</span></Link>
      <Link href="/admin/prospectos?view=today"><strong>{todayItems.length}</strong><span>Hoy</span></Link>
      <Link href="/admin/prospectos?view=tomorrow"><strong>{tomorrowItems.length}</strong><span>Mañana</span></Link>
      <Link href="/admin/prospectos?view=upcoming"><strong>{upcoming.length}</strong><span>Próximos</span></Link>
      <Link href="/admin/prospectos?view=nodate"><strong>{noDate.length}</strong><span>Sin fecha</span></Link>
      <Link href="/admin/prospectos?view=neglected"><strong>{neglected.length}</strong><span>Sin seguimiento</span></Link>
    </section>

    <ProspectFilters />
    <nav className="prospect-view-tabs"><Link className={view==='agenda'?'active':''} href="/admin/prospectos?view=agenda">Calendario</Link><Link className={view==='all'?'active':''} href="/admin/prospectos?view=all">Todos</Link></nav>

    {view==='agenda'?<ProspectCalendar prospects={active.map((p:any)=>({id:p.id,full_name:p.full_name,phone:p.phone,service_interest:p.service_interest,temperature:p.temperature,next_followup_at:p.next_followup_at,internal_appointment_at:p.internal_appointment_at,last_followup_at:p.last_followup_at}))}/>:null}

    {view!=='agenda'?<section className="prospect-cards prospect-cards-2">
      {((view==='overdue'?overdue:view==='today'?todayItems:view==='tomorrow'?tomorrowItems:view==='upcoming'?upcoming:view==='nodate'?noDate:view==='neglected'?neglected:prospects)||[]).map((p:any)=>{
        const phone=String(p.phone||'').replace(/\D/g,''); const wa=phone?`https://wa.me/${phone.startsWith('52')?phone:`52${phone}`}?text=${encodeURIComponent(`Hola ${p.full_name}, te escribimos de Visa Master para dar seguimiento a tu trámite.`)}`:'#'
        const days=daysSince(p.last_followup_at||p.updated_at||p.created_at)
        return <article className={`prospect-card ${days!==null&&days>=2?'prospect-needs-followup':''}`} key={p.id}>
          <Link className="prospect-card-open" href={`/admin/prospectos/${p.id}`}><div><strong>{p.full_name}</strong><small>{p.phone}{p.email?` · ${p.email}`:''}</small></div><span className={`status-pill ${p.status.toLowerCase()}`}>{p.status}</span></Link>
          <div className="prospect-tags"><span>{p.service_interest}</span><span>{p.temperature}</span><span>{p.origin}</span></div>
          <div className="prospect-details"><div><span>Cotización</span><strong>{money(p.quoted_amount)}</strong></div><div><span>Próximo seguimiento</span><strong>{dateTime(p.next_followup_at)}</strong></div><div><span>Último movimiento</span><strong>{days===null?'Sin registro':`${days} día(s)`}</strong></div></div>
          <div className="prospect-actions"><a className="secondary-button" href={`tel:${p.phone}`}>Llamar</a><a className="secondary-button" href={wa} target="_blank" rel="noreferrer">WhatsApp</a><Link className="primary-button" href={`/admin/prospectos/${p.id}`}>Abrir expediente</Link></div>
        </article>
      })}
    </section>:null}
  </>
}

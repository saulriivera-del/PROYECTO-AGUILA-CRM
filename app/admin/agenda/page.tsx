import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { dateOnly, dateTime, hermosilloDateKey, hermosilloTodayKey } from '@/lib/format'
import AgendaModal from '@/components/agenda-modal'
import SubmitButton from '@/components/submit-button'
import { completeAgendaEvent } from './actions'

type SearchParams = Promise<Record<string,string|string[]|undefined>>
const pad=(n:number)=>String(n).padStart(2,'0')

export default async function AgendaPage({searchParams}:{searchParams:SearchParams}){
 const params=await searchParams, context=await requireAuthContext()
 const todayKey=hermosilloTodayKey(), selected=typeof params.date==='string'?params.date:todayKey
 const [sy,sm]=selected.split('-').map(Number), month=typeof params.month==='string'?params.month:`${sy}-${pad(sm)}`
 const [year,monthNumber]=month.split('-').map(Number)
 const [{data:events},{data:profiles}]=await Promise.all([
  context.supabase.from('agenda_events').select('*, profiles!agenda_events_assigned_to_fkey(full_name), clients(full_name, phone), processes(id, service_name, contact_phone)').eq('organization_id',context.organizationId).order('starts_at'),
  context.supabase.from('profiles').select('id, full_name, role').eq('organization_id',context.organizationId).eq('is_active',true).order('full_name')
 ])
 const pending=(events??[]).filter((e:any)=>e.status==='Pendiente'), done=(events??[]).filter((e:any)=>e.status==='Realizado')
 const byDate=new Map<string,any[]>(); pending.forEach((e:any)=>{const k=hermosilloDateKey(e.starts_at);byDate.set(k,[...(byDate.get(k)??[]),e])})
 const selectedEvents=byDate.get(selected)??[]
 const overdue=pending.filter((e:any)=>hermosilloDateKey(e.starts_at)<todayKey), today=byDate.get(todayKey)??[]
 const tomorrowDate=new Date(`${todayKey}T12:00:00-07:00`);tomorrowDate.setDate(tomorrowDate.getDate()+1);const tomorrowKey=hermosilloDateKey(tomorrowDate),tomorrow=byDate.get(tomorrowKey)??[]
 const first=new Date(year,monthNumber-1,1), days=new Date(year,monthNumber,0).getDate(), offset=(first.getDay()+6)%7
 const cells=[...Array(offset).fill(null),...Array.from({length:days},(_,i)=>i+1)]
 const previous=new Date(year,monthNumber-2,1), next=new Date(year,monthNumber,1)
 const monthLabel=new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric',timeZone:'America/Hermosillo'}).format(new Date(`${month}-15T12:00:00-07:00`))
 function EventCard({event}:{event:any}){const client=Array.isArray(event.clients)?event.clients[0]:event.clients,process=Array.isArray(event.processes)?event.processes[0]:event.processes,phone=String(process?.contact_phone||client?.phone||'').replace(/\D/g,''),wa=event.whatsapp_message&&phone?`https://wa.me/${phone.startsWith('52')?phone:`52${phone}`}?text=${encodeURIComponent(event.whatsapp_message)}`:null;return <article className="agenda-item"><div className="agenda-item-top"><span className="assignment-pill general">{event.event_type}</span><time>{dateTime(event.starts_at)}</time></div><strong>{event.title}</strong><p>{event.description||'Sin descripción'}</p><small>{client?.full_name||'Actividad interna'}{process?.service_name?` · ${process.service_name}`:''}</small><div className="agenda-item-actions">{wa?<a className="whatsapp-action" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>:null}{process?.id?<Link className="secondary-button mini-button" href={`/admin/tramites/${process.id}`}>Abrir trámite</Link>:null}<form action={completeAgendaEvent}><input type="hidden" name="event_id" value={event.id}/><input type="hidden" name="return_to" value={`/admin/agenda?month=${month}&date=${selected}`}/><SubmitButton className="mini-button" pendingText="Actualizando…">Realizada</SubmitButton></form></div></article>}
 return <><header className="page-header"><div><span className="eyebrow">Horario oficial: Hermosillo</span><h1>Agenda</h1><p>Consulta hoy, atrasadas y próximas actividades desde el calendario.</p></div><div className="header-actions"><AgendaModal profiles={profiles??[]}/></div></header>
 {params.created?<div className="notice success">Actividad guardada.</div>:null}{params.updated?<div className="notice success">Actividad completada.</div>:null}
 <section className="agenda-kpis"><article><span>Atrasadas</span><strong>{overdue.length}</strong></article><article><span>Hoy</span><strong>{today.length}</strong></article><article><span>Mañana</span><strong>{tomorrow.length}</strong></article><article><span>Pendientes</span><strong>{pending.length}</strong></article></section>
 <section className="agenda-calendar-layout"><article className="panel-card monthly-calendar"><div className="calendar-toolbar"><Link href={`/admin/agenda?month=${previous.getFullYear()}-${pad(previous.getMonth()+1)}&date=${previous.getFullYear()}-${pad(previous.getMonth()+1)}-01`}>←</Link><h3>{monthLabel}</h3><Link href={`/admin/agenda?month=${next.getFullYear()}-${pad(next.getMonth()+1)}&date=${next.getFullYear()}-${pad(next.getMonth()+1)}-01`}>→</Link></div><div className="calendar-weekdays">{['L','M','M','J','V','S','D'].map((d,i)=><span key={i}>{d}</span>)}</div><div className="calendar-grid">{cells.map((day,i)=>{if(!day)return <span className="calendar-empty" key={`e${i}`}/>;const key=`${year}-${pad(monthNumber)}-${pad(day)}`,count=byDate.get(key)?.length??0;return <Link key={key} href={`/admin/agenda?month=${month}&date=${key}`} className={`calendar-day ${key===selected?'selected':''} ${key===todayKey?'today':''}`}><strong>{day}</strong>{count?<span>{count}</span>:null}</Link>})}</div></article>
 <article className="panel-card selected-day-panel"><div className="panel-heading"><div><span className="eyebrow">Día seleccionado</span><h3>{dateOnly(`${selected}T12:00:00-07:00`)}</h3></div><strong>{selectedEvents.length}</strong></div><div className="agenda-list">{selectedEvents.map((e:any)=><EventCard key={e.id} event={e}/>)}{!selectedEvents.length?<div className="empty-state">Sin actividades para este día.</div>:null}</div></article></section>
 <section className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Atención inmediata</span><h3>Atrasadas</h3></div><strong>{overdue.length}</strong></div><div className="agenda-history-grid">{overdue.slice(0,12).map((e:any)=><EventCard key={e.id} event={e}/>)}{!overdue.length?<div className="empty-state">Sin actividades atrasadas.</div>:null}</div></section>
 </>
}

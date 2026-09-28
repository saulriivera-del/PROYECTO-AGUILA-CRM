import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, FileText, Flag } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PortalShell } from '@/components/PortalShell'
import { StatusPill } from '@/components/StatusPill'
import { formatDate } from '@/lib/format'
import type { PortalProcess, PortalUpdate } from '@/lib/types'

const progress = ['Información recibida','Documentación','DS-160','Pago consular','Búsqueda de cita','CAS','Consulado','Resultado']

export default async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: companyUser }, { data: process }, { data: updates }] = await Promise.all([
    supabase.from('company_users').select('name, companies(name, legal_name)').eq('auth_user_id', user.id).single(),
    supabase.from('corporate_portal_processes').select('*').eq('process_id', id).single(),
    supabase.from('corporate_portal_updates').select('*').eq('process_id', id).order('event_date', { ascending: false }),
  ])
  if (!process) notFound()

  const item = process as PortalProcess
  const history = (updates || []) as PortalUpdate[]
  const rel = companyUser?.companies as unknown as { name?: string; legal_name?: string } | null
  const company = rel?.legal_name || rel?.name || item.company_legal_name || 'Empresa'
  const name = companyUser?.name || 'Gabriela'
  const stageIndex = item.public_status === 'SEARCHING_APPOINTMENT' ? 4 : item.public_status?.includes('CAS') ? 5 : item.public_status?.includes('CONSULAR') || item.public_status === 'APPOINTMENT_FOUND' ? 6 : item.public_status === 'COMPLETED' ? 7 : 3

  return <PortalShell name={name} company={company}><main className="portal-content detail-page">
    <Link href="/portal" className="back-link"><ArrowLeft size={18}/>Todos los trámites</Link>
    <div className="detail-header"><div><span className="eyebrow">{item.service_name}</span><h1>{item.client_name}</h1><StatusPill status={item.public_status} label={item.public_status_label}/></div><div className="detail-dates"><div><CalendarDays size={17}/><span>CAS</span><strong>{formatDate(item.cas_appointment_at)}</strong></div><div><CalendarDays size={17}/><span>Consulado</span><strong>{formatDate(item.consulate_appointment_at)}</strong></div></div></div>

    <div className="detail-grid">
      <section className="detail-card"><h3>Estado del trámite</h3><p>{item.public_note}</p><div className="next-step big"><Flag size={18}/><div><strong>Próximo paso</strong><span>{item.public_next_step}</span></div></div>{item.requires_client_action && <div className="action-alert"><strong>Acción requerida:</strong> {item.client_action_note}</div>}</section>
      <section className="detail-card"><h3>Progreso</h3><div className="progress-list">{progress.map((label, idx) => <div key={label} className={`progress-item ${idx <= stageIndex ? 'done' : ''}`}>{idx <= stageIndex ? <CheckCircle2 size={20}/> : <Circle size={20}/>}<span>{label}</span></div>)}</div></section>
      <section className="detail-card full"><h3>Actividad</h3><div className="timeline large">{history.map((u,i)=><div className="timeline-item" key={u.update_id}><div className={`timeline-dot ${i===0?'blue':'green'}`}/><div><div className="timeline-head"><strong>{u.title}</strong><span>{formatDate(u.event_date,true)}</span></div><p>{u.description}</p></div></div>)}</div></section>
      <section className="detail-card full"><h3>Documentos</h3><div className="docs-placeholder"><FileText size={24}/><div><strong>Módulo preparado</strong><p>Los documentos autorizados aparecerán aquí cuando conectemos Drive y AIS.</p></div></div></section>
    </div>
  </main></PortalShell>
}

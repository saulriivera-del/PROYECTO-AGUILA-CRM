import { redirect } from 'next/navigation'
import { Search, FileCheck2, CalendarCheck2, AlertCircle, Headphones } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { PortalProcess, PortalUpdate } from '@/lib/types'
import { PortalShell } from '@/components/PortalShell'
import { CaseCard } from '@/components/CaseCard'
import { formatDate } from '@/lib/format'

export default async function PortalPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: companyUser }, { data: processes }, { data: updates }] = await Promise.all([
    supabase.from('company_users').select('name, company_id, companies(name, legal_name)').eq('auth_user_id', user.id).eq('is_active', true).single(),
    supabase.from('corporate_portal_processes').select('*').order('client_name'),
    supabase.from('corporate_portal_updates').select('*').order('event_date', { ascending: false }).limit(8),
  ])

  const processList = (processes || []) as PortalProcess[]
  const updateList = (updates || []) as PortalUpdate[]
  const companyRelation = companyUser?.companies as unknown as { name?: string; legal_name?: string } | null
  const company = companyRelation?.legal_name || companyRelation?.name || processList[0]?.company_legal_name || 'Empresa'
  const name = companyUser?.name || 'Gabriela'
  const requiresAttention = processList.filter(x => x.requires_client_action).length
  const futureAppointments = processList.filter(x => x.cas_appointment_at || x.consulate_appointment_at).length

  return (
    <PortalShell name={name} company={company}>
      <main className="portal-content">
        <div className="dashboard-grid">
          <section className="dashboard-main">
            <div className="hero-copy"><h1>Hola, {name}</h1><p>Aquí puedes dar seguimiento a los trámites de tus candidatos.</p></div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon blue"><FileCheck2/></div><div><span>Trámites activos</span><strong>{processList.length}</strong></div></div>
              <div className="stat-card"><div className="stat-icon red"><AlertCircle/></div><div><span>Requieren atención</span><strong>{requiresAttention}</strong></div></div>
              <div className="stat-card"><div className="stat-icon blue"><CalendarCheck2/></div><div><span>Próximas citas</span><strong>{futureAppointments}</strong></div></div>
            </div>

            <div className="filters" id="tramites"><div className="search-box"><Search size={18}/><span>Buscar candidato por nombre...</span></div><div className="tabs"><span className="active">Todos ({processList.length})</span><span>En proceso ({processList.length})</span><span>Atención ({requiresAttention})</span><span>Terminados (0)</span></div></div>

            <div className="case-list">
              {processList.length ? processList.map(item => <CaseCard key={item.process_id} item={item}/>) : <div className="empty-card">No hay trámites disponibles para esta cuenta.</div>}
            </div>

            <section id="documentos" className="placeholder-module"><h3>Documentos</h3><p>El módulo ya está preparado. La integración automática con Drive y AIS se conectará en una fase posterior.</p></section>
          </section>

          <aside className="dashboard-side" id="actividad">
            <section className="side-card activity-card"><div className="side-title"><h3>Actividad reciente</h3><span>Ver toda</span></div><div className="timeline">
              {updateList.map((u, i) => <div className="timeline-item" key={u.update_id}><div className={`timeline-dot ${i === 0 ? 'blue' : 'green'}`}/><div><div className="timeline-head"><strong>{processList.find(p=>p.process_id===u.process_id)?.client_name || 'Trámite'}</strong><span>{formatDate(u.event_date, true)}</span></div><h4>{u.title}</h4><p>{u.description}</p></div></div>)}
            </div></section>
            <section className="side-card help-card"><Headphones size={24}/><h3>¿Necesitas apoyo?</h3><p>Si tienes alguna duda sobre un trámite, puedes contactarnos directamente.</p><a className="outline-button" href="https://wa.me/" target="_blank">Contactar a Visa Master</a></section>
          </aside>
        </div>
      </main>
    </PortalShell>
  )
}

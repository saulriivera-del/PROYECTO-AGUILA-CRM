import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { countProgress, cleanAnswers, cleanPeople } from '@/lib/trade-in-motion'
import { inviteCandidate, revokeInvite, revokeFolioAccess } from './actions'
import TnFolioGenerator from '@/components/tn-folio-generator'

export const dynamic = 'force-dynamic'

type Search = Promise<Record<string, string | string[] | undefined>>
export default async function TradeInMotionIntakePage({ searchParams }: { searchParams: Search }) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') redirect('/admin?error=Acceso%20restringido')
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q.trim().toLowerCase().slice(0, 100) : ''
  const filter = typeof params.status === 'string' ? params.status : 'todos'
  const db = createAdminClient()
  const { data: rawDrafts, error } = await db.from('vm_trade_in_motion_drafts')
    .select('id, access_id, applicant_email, answers, people, submission_id, status, created_at, updated_at, submitted_at')
    .eq('organization_id', context.organizationId)
    .order('updated_at', { ascending: false })
    .limit(500)
  const { data: invitationRecords } = await db.from('vm_trade_in_motion_invites')
    .select('id, applicant_email, applicant_name, created_at')
    .eq('organization_id', context.organizationId).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(500)
  const { data: accessRecords } = await db.from('vm_trade_in_motion_access')
    .select('id,folio,applicant_name,created_at,is_active')
    .eq('organization_id',context.organizationId).eq('is_active',true)
    .order('created_at',{ascending:false}).limit(500)
  const accesses = accessRecords ?? []
  const accessById = new Map(accesses.map(a => [a.id,a]))
  const invitations = invitationRecords ?? []
  const drafts = rawDrafts ?? []
  const ids = drafts.filter(d => d.status === 'Enviado').map(d => d.submission_id)
  const { data: submissions } = ids.length
    ? await db.from('vm_form_submissions')
      .select('submission_id, status, process_id')
      .eq('organization_id', context.organizationId)
      .in('submission_id', ids)
    : { data: [] }
  const submissionsById = new Map((submissions ?? []).map(s => [s.submission_id, s]))
  const existing = drafts.map(d => {
    const answers = cleanAnswers(d.answers)
    const status = d.status === 'Borrador' ? 'Borrador' : submissionsById.get(d.submission_id)?.status === 'En revisión' ? 'En revisión' : 'Recibido'
    return {
      id: d.id, name: answers.full_name || accessById.get(d.access_id)?.applicant_name || 'Sin nombre todavía', email: d.applicant_email || '',
      folio: accessById.get(d.access_id)?.folio || '', isFolio: Boolean(d.access_id), accessId: d.access_id || '',
      status, processId: submissionsById.get(d.submission_id)?.process_id || '',
      progress: countProgress(answers, cleanPeople(d.people)),
      updatedAt: d.updated_at, submittedAt: d.submitted_at,
    }
  })
  const emailsStarted = new Set(existing.map(d => d.email))
  const pending = invitations.filter(i => !emailsStarted.has(i.applicant_email)).map(i => ({
    id: i.id, name: i.applicant_name || 'Candidato autorizado', email: i.applicant_email,
    status: 'Pendiente', processId: '', progress: 0, updatedAt: i.created_at, submittedAt: null,
    folio:'', isFolio:false, accessId:'',
  }))
  const startedIds = new Set(existing.map(d => d.accessId).filter(Boolean))
  const pendingFolio = accesses.filter(a => !startedIds.has(a.id)).map(a => ({
    id:a.id,name:a.applicant_name,email:'',folio:a.folio,isFolio:true,accessId:a.id,
    status:'Pendiente',processId:'',progress:0,updatedAt:a.created_at,submittedAt:null,
  }))
  const all = [...existing, ...pending, ...pendingFolio]
  const filtered = all.filter(d =>
    (!query || (d.name + ' ' + d.email + ' ' + d.folio).toLowerCase().includes(query)) &&
    (filter === 'todos' || d.status === filter))
  const statusFilters = [
    { value: 'todos', label: 'Todos' },
    { value: 'Pendiente', label: 'Sin comenzar' },
    { value: 'Borrador', label: 'Borradores' },
    { value: 'Recibido', label: 'Recibidos' },
    { value: 'En revisión', label: 'En revisión' },
  ]
  const date = (value: string) => new Intl.DateTimeFormat('es-MX',
    { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Hermosillo' }).format(new Date(value))

  return <div style={{ maxWidth: 1100, margin: '0 auto', padding: '25px 20px 60px' }}>
    <div style={{ color: '#54708b', fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>VISA MASTER · TRADE IN MOTION</div>
    <h1 style={{ marginBottom: 6 }}>Respuestas del formulario DS-160</h1>
    <p style={{ color: '#5b738c', lineHeight: 1.6 }}>Bandeja privada de candidatos. Revisa borradores y formularios terminados antes de preparar la solicitud consular oficial.</p>
    <p><Link className="secondary-button" href="/formularios/trade-in-motion" target="_blank">Abrir formulario para compartir con candidatos ↗</Link></p>
    <TnFolioGenerator />
    <details style={{marginBottom:22}}><summary style={{cursor:'pointer',color:'#627d95'}}>Acceso anterior por correo (solo transición)</summary>
    <section style={{ background: '#fff', padding: 20, border: '1px solid #dbe5ef', borderRadius: 13, margin: '18px 0 22px' }}>
      <h3 style={{ margin: '0 0 5px' }}>Autorizar a un nuevo candidato</h3>
      <p style={{ color: '#647d95', fontSize: 13 }}>Primero registra el correo que te envíe Gabriela. Solo esos candidatos podrán guardar y enviar el DS-160.</p>
      {params.invited ? <p className="notice success">Correo autorizado. Ya puedes compartir el formulario.</p> : null}
      {params.invite_error ? <p className="notice error">Revisa que el correo sea válido.</p> : null}
      <form action={inviteCandidate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input name="name" aria-label="Nombre del candidato" placeholder="Nombre (opcional)" maxLength={180} style={{ flex: 1, minWidth: 180, border: '1px solid #bfcfdf', borderRadius: 8, padding: 12 }} />
        <input name="email" aria-label="Correo personal del candidato" placeholder="Correo personal del candidato" type="email" required style={{ flex: 1, minWidth: 210, border: '1px solid #bfcfdf', borderRadius: 8, padding: 12 }} />
        <button className="primary-button" type="submit">Autorizar correo</button>
      </form>
    </section></details>
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '24px 0' }}>
      {[
        { title: 'Todos', value: all.length },
        { title: 'Sin comenzar', value: all.filter(d => d.status === 'Pendiente').length },
        { title: 'Borradores', value: all.filter(d => d.status === 'Borrador').length },
        { title: 'Recibidos', value: all.filter(d => d.status === 'Recibido').length },
        { title: 'En revisión', value: all.filter(d => d.status === 'En revisión').length },
      ].map(d => <div key={d.title} style={{ background: 'white', border: '1px solid #dae5ef', borderRadius: 12, padding: '15px 24px', minWidth: 140 }}>
        <strong style={{ display: 'block', fontSize: 28, color: '#174c85' }}>{d.value}</strong>
        <span style={{ color: '#668099', fontSize: 13 }}>{d.title}</span>
      </div>)}
    </div>
    <form method="get" style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 22 }}>
      <input name="q" aria-label="Buscar candidato" defaultValue={query} placeholder="Buscar por nombre, folio o correo" style={{ padding: 12, border: '1px solid #cbd6e1', borderRadius: 9, minWidth: 230, flex: 1 }} />
      <select name="status" defaultValue={filter} aria-label="Estado" style={{ padding: 12, border: '1px solid #cbd6e1', borderRadius: 9 }}>
        {statusFilters.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <button type="submit" className="primary-button">Filtrar</button>
      <Link href="/admin/formularios/trade-in-motion" className="secondary-button">Limpiar</Link>
    </form>
    {error ? <div className="notice error">No pudimos consultar los formularios guardados. Revisa los permisos y la migración.</div> : null}
    <div style={{ display: 'grid', gap: 10 }}>
      {filtered.map(d => <div key={d.id} style={{ background: 'white', padding: 18, border: '1px solid #dbe5ef', borderRadius: 13 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div><h3 style={{ margin: 0 }}>{d.name}</h3><div style={{ color: '#617a92', fontSize: 13, marginTop: 6 }}>{d.folio ? 'Folio: ' + d.folio : d.email}</div></div>
          <span style={{ borderRadius: 99, border: '1px solid #b5cde2', color: '#205681', padding: '5px 13px', fontSize: 12, fontWeight: 700 }}>{d.status}</span>
        </div>
        <div style={{ background: '#ecf1f8', height: 7, borderRadius: 9, margin: '16px 0 8px', overflow: 'hidden' }}>
          <div style={{ background: '#2c77b9', width: d.progress + '%', height: '100%' }} />
        </div>
        <p style={{ color: '#657d94', fontSize: 12 }}> {d.progress}% de campos esenciales · Último movimiento: {date(d.updatedAt)}</p>
        <div style={{ display: 'flex', gap: 19, flexWrap: 'wrap' }}>
          {d.status === 'Pendiente' ? <form action={d.isFolio ? revokeFolioAccess : revokeInvite}><input type="hidden" name="id" value={d.id} /><button className="secondary-button" type="submit">Revocar autorización</button></form>
            : <Link href={'/admin/formularios/trade-in-motion/' + d.id}>Ver respuestas por sección →</Link>}
          {d.processId ? <Link href={'/admin/tramites/' + d.processId}>Abrir expediente TN →</Link> : null}
        </div>
      </div>)}
      {!filtered.length && !error ? <div className="empty-state">No hay candidatos con estos filtros. Autoriza un correo para comenzar.</div> : null}
    </div>
  </div>
}

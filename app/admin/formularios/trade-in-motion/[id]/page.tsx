import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanAnswers, cleanPeople, countProgress } from '@/lib/trade-in-motion'
import TnResponseReview from '@/components/tn-response-review'
import Ds160CorrectionEditor from '@/components/ds160-correction-editor'
import { markReview, markFolioReview } from './actions'

export const dynamic = 'force-dynamic'
export default async function CandidateResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') redirect('/admin?error=Acceso%20restringido')
  const db = createAdminClient()
  const { data: draft } = await db.from('vm_trade_in_motion_drafts')
    .select('id, access_id, applicant_email, organization_id, answers, people, submission_id, status, reviewed_at, created_at, updated_at, submitted_at, consent_at')
    .eq('id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (!draft) notFound()
  const [{ data: correction }, { data: editHistory }] = await Promise.all([
    db.from('vm_ds160_corrections').select('answers,people,version,updated_at').eq('draft_id',id).eq('organization_id',context.organizationId).maybeSingle(),
    db.from('vm_ds160_correction_history').select('version,editor_id,reason,created_at').eq('draft_id',id).eq('organization_id',context.organizationId).order('created_at',{ascending:false}).limit(30),
  ])
  const editorIds = [...new Set((editHistory ?? []).map(h=>h.editor_id))]
  const { data: editors } = editorIds.length
    ? await db.from('profiles').select('id,full_name').eq('organization_id',context.organizationId).in('id',editorIds)
    : { data: [] }
  const editorNames = new Map((editors ?? []).map(p => [p.id,p.full_name]))
  const { data: access } = draft.access_id ? await db.from('vm_trade_in_motion_access')
    .select('folio,applicant_name').eq('id',draft.access_id).eq('organization_id',context.organizationId).maybeSingle() : {data:null}
  const { data: submission } = draft.status === 'Enviado'
    ? await db.from('vm_form_submissions')
      .select('process_id, status, received_at')
      .eq('submission_id', draft.submission_id)
      .eq('organization_id', context.organizationId).maybeSingle()
    : { data: null }
  const originalAnswers = cleanAnswers(draft.answers)
  const originalPeople = cleanPeople(draft.people)
  const answers = cleanAnswers(correction?.answers ?? draft.answers)
  const people = cleanPeople(correction?.people ?? draft.people)
  const progress = countProgress(answers, people)
  const state = draft.status === 'Borrador' ? 'Borrador' : correction ? 'Corregido · Pendiente de aprobación' : draft.reviewed_at || submission?.status === 'En revisión' ? 'En revisión' : 'Recibido'
  const date = (value: string) => new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))

  return <div style={{ maxWidth: 1120, margin: '0 auto', padding: '25px 20px 60px' }}>
    <p><Link href="/admin/formularios/trade-in-motion">← Volver a todos los candidatos</Link></p>
    <small style={{ fontWeight: 800, letterSpacing: 1.7, color: '#59768e' }}>TRADE IN MOTION · RESPUESTAS PRIVADAS</small>
    <h1 style={{ margin: '12px 0 5px' }}>{answers.full_name || access?.applicant_name || 'Candidato sin nombre'}</h1>
    <p style={{ color: '#60778a' }}>{access ? 'Folio: ' + access.folio : draft.applicant_email}</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', margin: '18px 0 28px' }}>
      <span style={{ color: '#245987', background: '#e8f2fa', padding: '7px 13px', borderRadius: 30, fontWeight: 700 }}>{state}</span>
      <span style={{ color: '#60778a' }}>{progress}% campos esenciales</span>
      <span style={{ color: '#60778a' }}>Actualizado: {date(draft.updated_at)}</span>
      {submission?.process_id ? <Link href={'/admin/tramites/' + submission.process_id}>Abrir trámite TN →</Link> : null}
      {draft.status === 'Enviado' && state === 'Recibido' ? <form action={draft.access_id ? markFolioReview : markReview}>
        <input type="hidden" name="id" value={draft.id} />
        <button className="primary-button" type="submit">Marcar en revisión</button>
      </form> : null}
    </div>
    <p style={{ background: '#f4f7fa', borderLeft: '3px solid #256ba9', padding: 14, fontSize: 13, color: '#536e88' }}>
      Información confidencial. Las respuestas son aportadas por el candidato y deben verificarse con documentación antes de presentar el DS-160 oficial. {draft.consent_at ? 'Aceptó el aviso de privacidad al enviar.' : 'Aún no ha enviado ni aceptado el aviso de privacidad.'}
    </p>
    {draft.status === 'Enviado' && <Ds160CorrectionEditor draftId={draft.id}
      originalAnswers={originalAnswers} initialAnswers={answers} initialPeople={people}
      initialVersion={correction?.version ?? 0} />}
    <h2 style={{ marginTop: 28 }}>{correction ? 'Respuestas corregidas para automatización' : 'Respuestas recibidas'}</h2>
    <TnResponseReview answers={answers} people={people} />
    {correction && <details style={{ marginTop: 20, padding: 16, background: '#f7f9fb', borderRadius: 11 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Ver las respuestas originales del cliente (sin modificaciones)</summary>
      <div style={{ marginTop: 16 }}><TnResponseReview answers={originalAnswers} people={originalPeople} /></div>
    </details>}
    {(editHistory ?? []).length > 0 && <section style={{ marginTop: 25 }}>
      <h2>Historial de correcciones</h2>
      <p style={{ fontSize: 13, color: '#647c90' }}>Se conserva cada versión para conocer los cambios realizados y su responsable.</p>
      <div style={{ display: 'grid', gap: 9 }}>{(editHistory ?? []).map(entry => (
        <div key={entry.version} style={{ padding: 12, border: '1px solid #dce6ef', borderRadius: 9, background: '#fff' }}>
          <strong>Versión {entry.version}</strong> · {date(entry.created_at)} · {editorNames.get(entry.editor_id) || 'Operador de Visa Master'}
          <div style={{ marginTop: 5, color: '#5a7186' }}>{entry.reason}</div>
        </div>
      ))}</div>
    </section>}
  </div>
}

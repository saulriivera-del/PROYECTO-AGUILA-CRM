import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanAnswers, cleanPeople, countProgress } from '@/lib/trade-in-motion'
import TnResponseReview from '@/components/tn-response-review'
import { markReview } from './actions'

export const dynamic = 'force-dynamic'
export default async function CandidateResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') redirect('/admin?error=Acceso%20restringido')
  const db = createAdminClient()
  const { data: draft } = await db.from('vm_trade_in_motion_drafts')
    .select('id, applicant_email, organization_id, answers, people, submission_id, status, created_at, updated_at, submitted_at, consent_at')
    .eq('id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (!draft) notFound()
  const { data: submission } = draft.status === 'Enviado'
    ? await db.from('vm_form_submissions')
      .select('process_id, status, received_at')
      .eq('submission_id', draft.submission_id)
      .eq('organization_id', context.organizationId).maybeSingle()
    : { data: null }
  const answers = cleanAnswers(draft.answers)
  const people = cleanPeople(draft.people)
  const progress = countProgress(answers, people)
  const state = draft.status === 'Borrador' ? 'Borrador' : submission?.status === 'En revisión' ? 'En revisión' : 'Recibido'
  const date = (value: string) => new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))

  return <div style={{ maxWidth: 1120, margin: '0 auto', padding: '25px 20px 60px' }}>
    <p><Link href="/admin/formularios/trade-in-motion">← Volver a todos los candidatos</Link></p>
    <small style={{ fontWeight: 800, letterSpacing: 1.7, color: '#59768e' }}>TRADE IN MOTION · RESPUESTAS PRIVADAS</small>
    <h1 style={{ margin: '12px 0 5px' }}>{answers.full_name || 'Candidato sin nombre'}</h1>
    <p style={{ color: '#60778a' }}>{draft.applicant_email}</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', margin: '18px 0 28px' }}>
      <span style={{ color: '#245987', background: '#e8f2fa', padding: '7px 13px', borderRadius: 30, fontWeight: 700 }}>{state}</span>
      <span style={{ color: '#60778a' }}>{progress}% campos esenciales</span>
      <span style={{ color: '#60778a' }}>Actualizado: {date(draft.updated_at)}</span>
      {submission?.process_id ? <Link href={'/admin/tramites/' + submission.process_id}>Abrir trámite TN →</Link> : null}
      {draft.status === 'Enviado' && submission?.status === 'Recibido' ? <form action={markReview}>
        <input type="hidden" name="id" value={draft.id} />
        <button className="primary-button" type="submit">Marcar en revisión</button>
      </form> : null}
    </div>
    <p style={{ background: '#f4f7fa', borderLeft: '3px solid #256ba9', padding: 14, fontSize: 13, color: '#536e88' }}>
      Información confidencial. Las respuestas son aportadas por el candidato y deben verificarse con documentación antes de presentar el DS-160 oficial. {draft.consent_at ? 'Aceptó el aviso de privacidad al enviar.' : 'Aún no ha enviado ni aceptado el aviso de privacidad.'}
    </p>
    <TnResponseReview answers={answers} people={people} />
  </div>
}

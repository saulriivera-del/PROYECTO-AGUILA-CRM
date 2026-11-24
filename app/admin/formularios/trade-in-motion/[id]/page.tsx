import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanAnswers, cleanPeople, countProgress } from '@/lib/trade-in-motion'
import TnResponseReview from '@/components/tn-response-review'
import { markReview, markFolioReview, approveDs160Personal } from './actions'
import { personalDigest, personalProblems } from '@/lib/ds160-personal-transfer'

export const dynamic = 'force-dynamic'
export default async function CandidateResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role !== 'reception') redirect('/admin?error=Acceso%20restringido')
  const db = createAdminClient()
  const { data: draft, error: draftError } = await db.from('vm_trade_in_motion_drafts')
    .select('id, access_id, applicant_email, organization_id, answers, people, submission_id, status, reviewed_at, created_at, updated_at, submitted_at, consent_at, ds160_personal_approved_at, ds160_personal_approved_by, ds160_personal_approved_digest')
    .eq('id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (draftError) throw new Error("No se pudo consultar el expediente DS-160.")
  if (!draft) notFound()
  const { data: access } = draft.access_id ? await db.from('vm_trade_in_motion_access')
    .select('folio,applicant_name').eq('id',draft.access_id).eq('organization_id',context.organizationId).maybeSingle() : {data:null}
  const { data: submission } = draft.status === 'Enviado'
    ? await db.from('vm_form_submissions')
      .select('process_id, status, received_at')
      .eq('submission_id', draft.submission_id)
      .eq('organization_id', context.organizationId).maybeSingle()
    : { data: null }
  const answers = cleanAnswers(draft.answers)
  const people = cleanPeople(draft.people)
  const progress = countProgress(answers, people)
  const personalMissing = personalProblems(answers)
  const personallyApproved = Boolean(
    draft.ds160_personal_approved_at && draft.ds160_personal_approved_by &&
    draft.ds160_personal_approved_digest === personalDigest(answers) &&
    new Date(draft.updated_at).getTime() <= new Date(draft.ds160_personal_approved_at).getTime() &&
    personalMissing.length === 0,
  )
  const canApprovePersonal = draft.status === 'Enviado' && Boolean(draft.consent_at) &&
    personalMissing.length === 0 && !personallyApproved
  const state = draft.status === 'Borrador' ? 'Borrador' : draft.reviewed_at || submission?.status === 'En revisión' ? 'En revisión' : 'Recibido'
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
    <section style={{ margin: '22px 0', padding: 18, border: '1px solid #bfd1e4', borderRadius: 12 }}>
      <h2>DS-160 · Revisión de datos personales (primera etapa)</h2>
      <p>Esta aprobación autoriza preparar la transferencia de datos personales a la extensión de Chrome; no presenta, guarda ni firma el DS-160 oficial.</p>
      {personalMissing.length > 0 ? <div role="alert">
        <strong>Pendiente de corrección antes de autorizar:</strong>
        <ul>{personalMissing.slice(0, 12).map(problem =>
          <li key={problem.key}>{problem.label}</li>)}</ul>
        {personalMissing.length > 12 ? <p>Hay más campos pendientes.</p> : null}
      </div> : null}
      {personallyApproved
        ? <p style={{ fontWeight: 700, color: '#176541' }}>Datos personales aprobados. En Chrome, abre este expediente y la página oficial DS-160 para usar la extensión.</p>
        : canApprovePersonal
          ? <form action={approveDs160Personal}>
              <input type="hidden" name="id" value={draft.id} />
              <label style={{ display: 'block', marginBottom: 12 }}>
                <input type="checkbox" name="confirmed_documents" value="yes" required />
                He cotejado los datos personales con los documentos y confirmo que están correctos.
              </label>
              <button type="submit" className="primary-button">Aprobar datos personales para extensión</button>
            </form>
          : <p>Primero recibe el cuestionario, verifica consentimiento y corrige los campos señalados.</p>}
    </section>
    <TnResponseReview answers={answers} people={people} />
  </div>
}

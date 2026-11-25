import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanAnswers, cleanPeople } from '@/lib/trade-in-motion'
import CandidateForm from '@/components/tn-candidate-form'
import '@/app/formularios/trade-in-motion/form.css'

export const dynamic = 'force-dynamic'
const MARIANA_DEMO_ID = 'f3ce197a-34f9-4675-85af-7d6cc2d02208'

/** Vista con componentes y estilos exactos del cliente, sin guardar ni enviar.
 * Solo administradores/recepción de la organización y solo el expediente marcado TEST.
 */
export default async function MarianaClientPreview() {
  const ctx = await requireAuthContext()
  if (!isAdministrator(ctx.role) && ctx.role.trim().toLowerCase() !== 'reception')
    redirect('/admin?error=Acceso%20restringido')
  const db = createAdminClient()
  const {data:draft} = await db.from('vm_trade_in_motion_drafts')
    .select('id,organization_id,answers,people')
    .eq('id',MARIANA_DEMO_ID).eq('organization_id',ctx.organizationId).maybeSingle()
  if (!draft || draft.answers?.vm_test_only !== true) notFound()
  const {data:correction} = await db.from('vm_ds160_corrections')
    .select('answers,people').eq('draft_id',MARIANA_DEMO_ID)
    .eq('organization_id',ctx.organizationId).maybeSingle()
  const answers=cleanAnswers(correction?.answers ?? draft.answers)
  const people=cleanPeople(correction?.people ?? draft.people)
  return <>
    <nav style={{maxWidth:1160,margin:'16px auto 0',padding:'0 20px',display:'flex',gap:14,alignItems:'center'}}>
      <Link href={'/admin/formularios/trade-in-motion/'+MARIANA_DEMO_ID}
        style={{color:'#205f95',fontWeight:700}}>← Volver al expediente de prueba</Link>
      <span style={{fontSize:12,color:'#6a7d91'}}>Simulación sin guardado ni envío</span>
    </nav>
    <CandidateForm preview previewIdentity="Mariana Bustamante Baca · PRUEBA"
      previewAnswers={answers} previewPeople={people}/>
  </>
}

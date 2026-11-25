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

// Datos inventados exclusivamente para revisar la experiencia del cliente.
// Nunca se consultan, sustituyen, aprueban ni escriben respuestas reales.
const syntheticTNAnswers: Record<string, string> = {
  visa_profile: 'TN', full_name: 'Mariana', curp_paterno: 'Ejemplo',
  curp_materno: 'Ficticia', curp_sexo: 'Mujer', birth_date: '1990-08-15',
  birth_city: 'Hermosillo', birth_state: 'Sonora', birth_country: 'MX',
  marital_status: 'Soltero(a)', nationality: 'Mexicana',
  other_names_used: 'No', name_telecode: 'No',
  travel_plans_specific: 'No', travel_date: '2027-02-10',
  travel_duration_unit: 'Meses', travel_duration_amount: '36',
  travel_stay_city: 'Phoenix', travel_stay_address: '100 Calle de Ejemplo (ficticia)',
  travel_payer: 'Empresa en Estados Unidos', travel_payer_organization: 'Desert Sample LLC (ficticia)',
  travel_with_someone: 'No',
  visited_us: 'No', prior_visa: 'No', visa_denial: 'No',
  visa_lost: 'No', us_immigration_problem: 'No',
  home_street: 'Calle Ejemplo 123 (ficticia)', home_neighborhood: 'Colonia Prueba',
  home_city: 'Hermosillo', home_state: 'Sonora', home_postal: '83000',
  email: 'mariana.demo@example.com', phone: '6620000000',
  social_media_used: 'Facebook|Instagram|LinkedIn',
  social_facebook: 'demo_facebook_no_real', social_instagram: 'demo_instagram_no_real',
  social_linkedin: 'demo_linkedin_no_real', social_media_public: 'Sí, todos están públicos o abiertos',
  passport_number: 'PASAPORTE-FICTICIO-NO-VALIDO',
  passport_issue_city: 'Hermosillo', passport_issued: '2024-05-10',
  passport_expires: '2034-05-09', passport_lost: 'No',
  father_name: 'Juan Ejemplo', father_birth_date: '1960-01-12',
  mother_name: 'Ana Ficticia', mother_birth_date: '1962-06-21',
  family_us: 'Sí',
  employer: 'Empresa de Prueba Sonora', employer_street: 'Calle de Ejemplo 5',
  employer_city: 'Hermosillo', employer_state: 'Sonora', employer_postal: '83000',
  employer_country: 'México', job_title: 'Analista de sistemas',
  job_start: '2022-04-01', monthly_income: '32000', previous_job: 'No',
  school_name: 'Universidad de Ejemplo', school_street: 'Avenida Ficticia 1',
  school_city: 'Hermosillo', school_state: 'Sonora', school_postal: '83000',
  school_country: 'México', school_course: 'Ingeniería', school_start: '2008-08-01',
  school_end: '2012-06-30',
  tn_employer: 'Desert Sample LLC (ficticia)', tn_employer_street: '100 Example Avenue',
  tn_employer_city: 'Phoenix', tn_employer_state: 'Arizona', tn_employer_postal: '85001',
  tn_employer_country: 'Estados Unidos', tn_employer_phone: '6020000000',
  tn_position: 'Systems Engineer', tn_profession: 'Engineer',
  tn_duties: 'Análisis y diseño de sistemas de muestra, solo para la demostración.',
  tn_salary: '5500', tn_start_date: '2027-02-15',
  tn_worksite: 'Phoenix, Arizona', tn_qualifications: 'Licenciatura ficticia para fines de prueba.'
}

const syntheticPeople = {
  companions: [],
  relatives: [
    {id: 1, fullName: 'Carlos Ejemplo', relationship: 'Hermano(a)', immigrationStatus: 'Residente permanente legal (LPR)'},
    {id: 2, fullName: 'Lucía Ficticia', relationship: 'Primo(a)', immigrationStatus: 'Ciudadano(a) estadounidense'}
  ]
}

/** Vista del mismo cuestionario del cliente, con datos inventados.
 * Protegida por rol y por expediente TEST; nunca guarda ni envía.
 */
export default async function MarianaClientPreview() {
  const ctx = await requireAuthContext()
  if (!isAdministrator(ctx.role) && ctx.role.trim().toLowerCase() !== 'reception')
    redirect('/admin?error=Acceso%20restringido')
  const db = createAdminClient()
  const {data:draft} = await db.from('vm_trade_in_motion_drafts')
    .select('id,organization_id,answers')
    .eq('id',MARIANA_DEMO_ID).eq('organization_id',ctx.organizationId).maybeSingle()
  if (!draft || draft.answers?.vm_test_only !== true) notFound()
  const answers = cleanAnswers(syntheticTNAnswers)
  const people = cleanPeople(syntheticPeople)
  return <>
    <nav style={{maxWidth:1160,margin:'16px auto 0',padding:'0 20px',display:'flex',gap:14,alignItems:'center'}}>
      <Link href={'/admin/formularios/trade-in-motion/'+MARIANA_DEMO_ID}
        style={{color:'#205f95',fontWeight:700}}>← Volver al expediente de prueba</Link>
      <span style={{fontSize:12,color:'#6a7d91'}}>Simulación sin guardado ni envío</span>
    </nav>
    <div role="note" style={{maxWidth:1090,margin:'14px auto',padding:'12px 18px',border:'1px solid #d6e3ef',borderRadius:10,background:'#f4f8fc',color:'#294160',fontSize:13,lineHeight:1.5}}>
      <strong>Prueba TN de Mariana:</strong> las respuestas que ves son 100% inventadas y no pertenecen al expediente real.
      Puedes recorrer y modificar los nueve pasos para evaluar su facilidad de uso; no se guardará ni enviará nada.
      La extensión Chrome actual solo rellena las pantallas Personal Information 1 y 2 con datos aprobados desde el expediente, no desde esta vista de demostración.
      El mapeo de seguridad y de las otras pantallas todavía requiere validación técnica.
    </div>
    <CandidateForm preview previewIdentity="Prueba de Mariana · Candidata TN ficticia"
      previewAnswers={answers} previewPeople={people}/>
  </>
}

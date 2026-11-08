export type VisaMode = 'B1B2' | 'TN'
export type FieldType = 'text' | 'date' | 'email' | 'tel' | 'textarea' | 'select'
export type SectionId = 'personal' | 'passport' | 'travel' | 'history' | 'family' | 'work' | 'tn'

export type DraftField = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  help?: string
  options?: string[]
  required?: boolean
  /** Only ask follow-ups when the answer is actually relevant. */
  when?: { key: string; equals: string }
  reviewFlag?: boolean
}

export type DraftSection = {
  id: SectionId
  title: string
  description: string
  fields: DraftField[]
  mode?: VisaMode
}

// Preguntas de referencia: cuestionario histórico DS-160 de Visa Master.
// Se deben contrastar con el Google Forms vigente antes de considerarlas definitivas.
// Nunca se asignan respuestas negativas predeterminadas a antecedentes migratorios o de seguridad.
export const draftSections: DraftSection[] = [
  {
    id: 'personal',
    title: 'Datos personales',
    description: 'Empecemos con la información que aparece en tus documentos.',
    fields: [
      { key: 'full_name', label: 'Nombre completo como aparece en tu pasaporte', type: 'text', required: true },
      { key: 'birth_date', label: 'Fecha de nacimiento', type: 'date', required: true },
      { key: 'birth_place', label: 'Ciudad y estado donde naciste', type: 'text', required: true },
      { key: 'marital_status', label: 'Estado civil', type: 'select', options: ['Soltero(a)', 'Casado(a)', 'Unión libre', 'Divorciado(a)', 'Viudo(a)', 'Separado(a)'], required: true },
      { key: 'nationality', label: 'Nacionalidad', type: 'text', placeholder: 'Por ejemplo, mexicana', required: true },
      { key: 'address', label: 'Dirección donde vives actualmente', type: 'textarea', required: true },
      { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
      { key: 'phone', label: 'Teléfono celular', type: 'tel', required: true },
    ],
  },
  {
    id: 'passport',
    title: 'Pasaporte',
    description: 'Ten tu pasaporte a la mano para verificar números y fechas.',
    fields: [
      { key: 'passport_number', label: 'Número de pasaporte', type: 'text', required: true },
      { key: 'passport_issue_city', label: 'Ciudad donde tramitaste tu pasaporte', type: 'text' },
      { key: 'passport_issued', label: 'Fecha de expedición', type: 'date', required: true },
      { key: 'passport_expires', label: 'Fecha de vencimiento', type: 'date', required: true },
      { key: 'passport_lost', label: '¿Alguna vez perdiste o te robaron un pasaporte?', type: 'select', options: ['Sí', 'No'], required: true, reviewFlag: true },
      { key: 'passport_lost_details', label: 'Cuéntanos cuándo y qué sucedió', type: 'textarea', when: { key: 'passport_lost', equals: 'Sí' } },
    ],
  },
  {
    id: 'travel',
    title: 'Tu próximo viaje',
    description: 'Un estimado es suficiente si todavía no tienes planes definitivos.',
    fields: [
      { key: 'travel_date', label: 'Fecha aproximada de tu viaje', type: 'date' },
      { key: 'travel_duration', label: '¿Cuánto tiempo planeas permanecer en EE. UU.?', type: 'text', placeholder: 'Por ejemplo, dos semanas' },
      { key: 'travel_destination', label: 'Ciudad o dirección donde te hospedarías', type: 'textarea', help: 'Si aún no lo sabes, puedes dejarlo pendiente.' },
      { key: 'travel_payer', label: '¿Quién pagará los gastos de tu viaje?', type: 'text' },
      { key: 'travel_companions', label: '¿Viajarás con alguien? ¿Con quién?', type: 'textarea', help: 'Incluye nombres y parentescos, si aplica.' },
    ],
  },
  {
    id: 'history',
    title: 'Historial migratorio',
    description: 'Responde con precisión. Estas respuestas necesitan revisión especial.',
    fields: [
      { key: 'visited_us', label: '¿Has visitado Estados Unidos antes?', type: 'select', options: ['Sí', 'No'], required: true, reviewFlag: true },
      { key: 'last_visit', label: '¿Cuándo fue tu última visita y cuánto duró?', type: 'text', when: { key: 'visited_us', equals: 'Sí' } },
      { key: 'prior_visa', label: '¿Has tenido una visa estadounidense?', type: 'select', options: ['Sí', 'No'], required: true },
      { key: 'prior_visa_details', label: '¿Dónde y cuándo te la expidieron? ¿Cuándo venció?', type: 'textarea', when: { key: 'prior_visa', equals: 'Sí' } },
      { key: 'visa_denial', label: '¿Alguna vez te negaron o cancelaron una visa, o te negaron la entrada a EE. UU.?', type: 'select', options: ['Sí', 'No'], required: true, reviewFlag: true },
      { key: 'visa_denial_details', label: 'Indica la fecha aproximada y lo que ocurrió', type: 'textarea', when: { key: 'visa_denial', equals: 'Sí' }, reviewFlag: true },
      { key: 'visa_lost', label: '¿Alguna vez perdiste o te robaron una visa?', type: 'select', options: ['Sí', 'No'], required: true, reviewFlag: true },
      { key: 'visa_lost_details', label: 'Describe lo sucedido y la fecha', type: 'textarea', when: { key: 'visa_lost', equals: 'Sí' } },
    ],
  },
  {
    id: 'family',
    title: 'Familia',
    description: 'Necesitamos información básica de tu familia, aunque no viaje contigo.',
    fields: [
      { key: 'father_name', label: 'Nombre completo de tu padre', type: 'text' },
      { key: 'mother_name', label: 'Nombre completo de tu madre', type: 'text' },
      { key: 'spouse_name', label: 'Nombre completo de tu pareja o cónyuge', type: 'text', when: { key: 'has_spouse', equals: 'Sí' } },
      { key: 'has_spouse', label: '¿Tienes pareja o cónyuge que deba declararse?', type: 'select', options: ['Sí', 'No'] },
      { key: 'family_us', label: '¿Tienes familiares viviendo en EE. UU.?', type: 'select', options: ['Sí', 'No'], required: true },
      { key: 'family_us_details', label: '¿Qué familiares son y cuál es su situación migratoria, si la conoces?', type: 'textarea', when: { key: 'family_us', equals: 'Sí' } },
    ],
  },
  {
    id: 'work',
    title: 'Trabajo y estudios',
    description: 'Estos datos ayudan a preparar tus antecedentes laborales y académicos.',
    fields: [
      { key: 'employer', label: 'Empresa donde trabajas o actividad que realizas', type: 'text' },
      { key: 'employer_address', label: 'Dirección del lugar de trabajo', type: 'textarea' },
      { key: 'job_title', label: 'Puesto o actividad principal', type: 'text' },
      { key: 'job_start', label: 'Fecha en que comenzaste', type: 'date' },
      { key: 'monthly_income', label: 'Ingreso mensual bruto aproximado (MXN)', type: 'text' },
      { key: 'education_level', label: 'Último nivel de estudios terminado', type: 'text' },
      { key: 'school_name', label: 'Institución donde estudiaste', type: 'text' },
    ],
  },
  {
    id: 'tn',
    title: 'Información para visa TN',
    description: 'Estas preguntas adicionales son para revisar la oferta y el perfil profesional.',
    mode: 'TN',
    fields: [
      { key: 'tn_employer', label: 'Nombre de la empresa que te contratará en EE. UU.', type: 'text', required: true },
      { key: 'tn_employer_address', label: 'Domicilio de esa empresa', type: 'textarea' },
      { key: 'tn_position', label: 'Puesto ofrecido', type: 'text', required: true },
      { key: 'tn_profession', label: 'Profesión o categoría TN propuesta', type: 'text', required: true, help: 'El equipo revisará si la categoría es adecuada.' },
      { key: 'tn_duties', label: 'Principales actividades que realizarás', type: 'textarea', required: true },
      { key: 'tn_salary', label: 'Sueldo ofrecido y periodicidad (USD)', type: 'text' },
      { key: 'tn_start_date', label: 'Fecha prevista para comenzar', type: 'date' },
      { key: 'tn_worksite', label: 'Lugar donde desempeñarás el trabajo', type: 'text' },
      { key: 'tn_qualifications', label: 'Estudios o experiencia relacionados con el puesto', type: 'textarea' },
    ],
  },
]

export const sectionsForMode = (mode: VisaMode) => draftSections.filter((s) => !s.mode || s.mode === mode)

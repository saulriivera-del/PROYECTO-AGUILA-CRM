export type VisaMode = 'B1B2' | 'TN'
export type FieldType = 'text' | 'date' | 'email' | 'tel' | 'textarea' | 'select' | 'number'
export type SectionId = 'personal' | 'passport' | 'travel' | 'history' | 'family' | 'work' | 'tn'

export type DraftField = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  /** Render the label as an accessible placeholder inside the input. */
  inlinePrompt?: boolean
  help?: string
  options?: string[]
  required?: boolean
  requiredWhen?: { key: string; equals: string | string[] }
  /** A conditional answer may match one or several selected values. */
  when?: { key: string; equals: string | string[] }
  reviewFlag?: boolean
}

export type DraftSection = {
  id: SectionId
  title: string
  description: string
  fields: DraftField[]
  mode?: VisaMode
}

const yesNo = ['Sí', 'No']

// Entidades federativas de México; incluye Ciudad de México (32).
export const mexicoStates = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán',
  'Zacatecas',
]
export const outsideMexico = 'Fuera de México / otro estado o provincia'
export const familyPayerRelationships = [
  'Cónyuge / pareja', 'Padre', 'Madre', 'Hijo(a)', 'Hermano(a)',
  'Abuelo(a)', 'Nieto(a)', 'Tío(a)', 'Primo(a)', 'Otro familiar',
]
export const otherPayerRelationships = [
  'Amigo(a)', 'Colega / compañero(a)', 'Conocido(a)', 'Otro',
]
const currentSpouseStatuses = ['Casado(a)', 'Unión libre', 'Separado(a)']
const formerSpouseStatuses = ['Divorciado(a)', 'Viudo(a)']

// Lugares de atención consular en México confirmados en la web oficial de la Embajada.
// "Otra ciudad/país" cubre visas expedidas fuera de México y casos históricos.
const consularCities = [
  'Ciudad de México', 'Ciudad Juárez', 'Guadalajara', 'Hermosillo',
  'Matamoros', 'Mérida', 'Monterrey', 'Nogales', 'Nuevo Laredo',
  'Tijuana', 'Otra ciudad o país',
]

export const companionRelationships = [
  'Cónyuge / pareja', 'Padre', 'Madre', 'Hijo(a)', 'Hermano(a)',
  'Otro familiar', 'Amigo(a)', 'Colega / compañero(a)', 'Otro',
]
export const relativeRelationships = [
  'Cónyuge / pareja', 'Prometido(a)', 'Hijo(a)', 'Hermano(a)',
  'Padre', 'Madre', 'Otro familiar',
]
export const immigrationStatuses = [
  'Ciudadano(a) estadounidense', 'Residente permanente legal (LPR)',
  'No inmigrante (estatus temporal)', 'Otro / No lo sé',
]

// Los nombres de las claves son estables y separados por dato para una futura
// correspondencia (mapping) con los campos del DS-160. Aún no hay envío oficial.
function addressFields(
  prefix: string,
  who: string,
  required = false,
  when?: DraftField['when'],
): DraftField[] {
  const fields: DraftField[] = [
    { key: `${prefix}_street`, label: `Calle y número · ${who}`, placeholder: 'Calle y número', inlinePrompt: true, type: 'text', required, when },
    { key: `${prefix}_neighborhood`, label: `Colonia · ${who}`, placeholder: 'Colonia', inlinePrompt: true, type: 'text', when },
    { key: `${prefix}_city`, label: `Ciudad · ${who}`, placeholder: 'Ciudad', inlinePrompt: true, type: 'text', required, when },
    { key: `${prefix}_state`, label: `Estado · ${who}`, placeholder: 'Selecciona un estado', inlinePrompt: true, type: 'select', options: [...mexicoStates, outsideMexico], required, when },
    { key: `${prefix}_state_other`, label: `Estado o provincia fuera de México · ${who}`, placeholder: 'Escribe el estado o provincia', inlinePrompt: true, type: 'text',
      requiredWhen: { key: `${prefix}_state`, equals: outsideMexico }, when: { key: `${prefix}_state`, equals: outsideMexico } },
    { key: `${prefix}_postal`, label: `Código postal · ${who}`, placeholder: 'Código postal', inlinePrompt: true, type: 'text', required: prefix === 'home', when },
  ]
  if (prefix === 'home') {
    // Evitar mostrar País en domicilios mexicanos. Se pregunta si se marca domicilio extranjero.
    fields.push({
      key: 'home_country',
      label: 'País de tu domicilio fuera de México',
      placeholder: 'Escribe el país',
      inlinePrompt: true, type: 'text',
      when: { key: 'home_state', equals: outsideMexico },
      required: true,
    })
  } else {
    fields.push({ key: `${prefix}_country`, label: `País · ${who}`, placeholder: 'País', inlinePrompt: true, type: 'text', required, when })
  }
  return fields
}

// Basado en el cuestionario histórico de Visa Master y observaciones del
// propietario del 8-nov-2026; NO es una réplica oficial ni exhaustiva del DS-160.
// Las categorías y preguntas deberán cotejarse en el sistema consular vigente.
// Nunca se predeterminan respuestas sobre antecedentes o seguridad.
export const draftSections: DraftSection[] = [
  {
    id: 'personal',
    title: 'Datos personales',
    description: 'Escribe los datos como aparecen en tus documentos. Las direcciones se capturan por partes.',
    fields: [
      { key: 'full_name', label: 'Nombre completo como aparece en tu pasaporte', type: 'text', required: true },
      { key: 'birth_date', label: 'Fecha de nacimiento', type: 'date', required: true },
      { key: 'birth_city', label: 'Ciudad donde naciste', type: 'text', required: true },
      { key: 'birth_state', label: 'Estado / provincia donde naciste', type: 'select', options: [...mexicoStates, outsideMexico], required: true },
      { key: 'birth_state_other', label: 'Estado o provincia donde naciste (fuera de México)', type: 'text', when: { key: 'birth_state', equals: outsideMexico }, required: true },
      { key: 'birth_country', label: 'País donde naciste', type: 'text', required: true },
      { key: 'marital_status', label: 'Estado civil', type: 'select', options: ['Soltero(a)', 'Casado(a)', 'Unión libre', 'Divorciado(a)', 'Viudo(a)', 'Separado(a)'], required: true },
      { key: 'nationality', label: 'Nacionalidad', type: 'text', placeholder: 'Por ejemplo, mexicana', required: true },
      { key: 'spouse_name', label: 'Nombre completo de tu cónyuge / pareja', type: 'text', required: true, when: { key: 'marital_status', equals: currentSpouseStatuses } },
      { key: 'spouse_birth_date', label: 'Fecha de nacimiento de tu cónyuge / pareja', type: 'date', required: true, when: { key: 'marital_status', equals: currentSpouseStatuses } },
      { key: 'spouse_birth_city', label: 'Ciudad donde nació tu cónyuge / pareja', type: 'text', when: { key: 'marital_status', equals: currentSpouseStatuses } },
      { key: 'spouse_birth_state', label: 'Estado donde nació tu cónyuge / pareja', type: 'text', when: { key: 'marital_status', equals: currentSpouseStatuses } },
      { key: 'spouse_birth_country', label: 'País donde nació tu cónyuge / pareja', type: 'text', when: { key: 'marital_status', equals: currentSpouseStatuses } },
      { key: 'former_spouse_name', label: 'Nombre completo del cónyuge anterior', type: 'text', required: true, when: { key: 'marital_status', equals: formerSpouseStatuses }, help: 'Para divorcio o viudez se solicitan datos de matrimonio anterior, no de pareja actual.' },
      { key: 'former_spouse_birth_date', label: 'Fecha de nacimiento del cónyuge anterior', type: 'date', when: { key: 'marital_status', equals: formerSpouseStatuses } },
      { key: 'former_spouse_birth_city', label: 'Ciudad donde nació el cónyuge anterior', type: 'text', when: { key: 'marital_status', equals: formerSpouseStatuses } },
      { key: 'former_spouse_birth_state', label: 'Estado donde nació el cónyuge anterior', type: 'text', when: { key: 'marital_status', equals: formerSpouseStatuses } },
      ...addressFields('home', 'domicilio actual', true),
      { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
      { key: 'phone', label: 'Teléfono celular', type: 'tel', required: true },
      { key: 'employer_phone', label: 'Teléfono del trabajo (opcional)', type: 'tel' },
    ],
  },
  {
    id: 'passport',
    title: 'Pasaporte',
    description: 'Ten a la mano el pasaporte para verificar números y fechas exactas.',
    fields: [
      { key: 'passport_number', label: 'Número de pasaporte', type: 'text', required: true },
      { key: 'passport_issue_city', label: 'Ciudad donde tramitaste tu pasaporte', type: 'text' },
      { key: 'passport_issued', label: 'Fecha de expedición del pasaporte', type: 'date', required: true },
      { key: 'passport_expires', label: 'Fecha de vencimiento del pasaporte', type: 'date', required: true },
      { key: 'passport_lost', label: '¿Alguna vez perdiste o te robaron un pasaporte?', type: 'select', options: yesNo, required: true, reviewFlag: true },
      { key: 'passport_lost_date', label: 'Fecha aproximada de pérdida o robo del pasaporte', type: 'date', when: { key: 'passport_lost', equals: 'Sí' } },
      { key: 'passport_lost_details', label: 'Explica lo ocurrido con el pasaporte', type: 'textarea', when: { key: 'passport_lost', equals: 'Sí' } },
    ],
  },
  {
    id: 'travel',
    title: 'Tu próximo viaje',
    description: 'Contesta lo que sabes; Visa Master revisará los datos requeridos para el DS-160.',
    fields: [
      { key: 'travel_date', label: 'Fecha aproximada de tu viaje', type: 'date' },
      { key: 'travel_more_than_24h', label: '¿Planeas quedarte más de 24 horas?', type: 'select', options: yesNo, required: true },
      { key: 'travel_duration_amount', label: '¿Cuánto tiempo planeas permanecer en EE. UU.? (cantidad)', type: 'number', help: 'Escribe solo el número, por ejemplo 7.' },
      { key: 'travel_duration_unit', label: 'Unidad de tiempo', type: 'select', options: ['Días', 'Semanas', 'Meses'] },
      { key: 'travel_stay_city', label: 'Ciudad donde te hospedarás', type: 'text', when: { key: 'travel_more_than_24h', equals: 'Sí' }, required: true, help: 'No inventes una dirección si todavía no sabes dónde te hospedarás.' },
      { key: 'travel_stay_address', label: 'Dirección donde te hospedarás', type: 'text', when: { key: 'travel_more_than_24h', equals: 'Sí' }, required: true, help: 'Obligatorio en Visa Master cuando planeas quedarte más de 24 horas.' },
      { key: 'travel_payer', label: '¿Quién pagará los gastos de tu viaje?', type: 'select', options: ['Yo mismo(a)', 'Un familiar', 'Otra persona', 'Mi empleador actual', 'Empresa en Estados Unidos', 'Otra empresa u organización'], required: true },
      { key: 'travel_payer_person_name', label: 'Nombre completo de la persona que pagará', type: 'text', when: { key: 'travel_payer', equals: ['Un familiar', 'Otra persona'] }, required: true },
      { key: 'travel_payer_relationship', label: 'Parentesco o relación con quien pagará', type: 'select', options: familyPayerRelationships, when: { key: 'travel_payer', equals: ['Un familiar', 'Otra persona'] }, required: true },
      { key: 'travel_payer_organization', label: 'Nombre de la empresa u organización que pagará', type: 'text', when: { key: 'travel_payer', equals: ['Mi empleador actual', 'Empresa en Estados Unidos', 'Otra empresa u organización'] }, required: true },
      { key: 'travel_with_someone', label: '¿Viajarás con alguien?', type: 'select', options: yesNo, required: true },
    ],
  },
  {
    id: 'history',
    title: 'Historial migratorio',
    description: 'Las fechas se seleccionan en calendarios. Nunca respondas por suposición.',
    fields: [
      { key: 'visited_us', label: '¿Has visitado Estados Unidos antes?', type: 'select', options: yesNo, required: true, reviewFlag: true },
      { key: 'last_visit_date', label: 'Fecha de tu última visita a EE. UU.', type: 'date', when: { key: 'visited_us', equals: 'Sí' }, required: true },
      { key: 'last_visit_duration_days', label: '¿Cuántos días duró tu última visita?', type: 'number', when: { key: 'visited_us', equals: 'Sí' }, required: true },
      { key: 'prior_visa', label: '¿Has tenido una visa estadounidense?', type: 'select', options: yesNo, required: true },
      { key: 'prior_visa_issued_city', label: 'Ciudad donde te expidieron la visa', type: 'select', options: consularCities, when: { key: 'prior_visa', equals: 'Sí' }, required: true },
      { key: 'prior_visa_issued_other', label: 'Indica la ciudad y país de expedición', type: 'text', when: { key: 'prior_visa_issued_city', equals: 'Otra ciudad o país' }, required: true },
      { key: 'prior_visa_issue_date', label: 'Fecha de expedición de la visa', type: 'date', when: { key: 'prior_visa', equals: 'Sí' }, required: true },
      { key: 'prior_visa_expiration_date', label: 'Fecha de vencimiento de la visa', type: 'date', when: { key: 'prior_visa', equals: 'Sí' }, required: true },
      { key: 'visa_denial', label: '¿Te han negado o cancelado una visa o negado la entrada a EE. UU.?', type: 'select', options: yesNo, required: true, reviewFlag: true },
      { key: 'visa_denial_kind', label: '¿Qué ocurrió?', type: 'select', options: ['Negación de visa', 'Cancelación / revocación de visa', 'Negación de entrada a Estados Unidos', 'Más de una de las anteriores'], when: { key: 'visa_denial', equals: 'Sí' }, required: true, reviewFlag: true },
      { key: 'visa_denial_date', label: 'Fecha aproximada del incidente', type: 'date', when: { key: 'visa_denial', equals: 'Sí' }, required: true },
      { key: 'visa_denial_details', label: 'Explica qué ocurrió', type: 'textarea', when: { key: 'visa_denial', equals: 'Sí' }, required: true, reviewFlag: true },
      { key: 'visa_lost', label: '¿Alguna vez perdiste o te robaron una visa?', type: 'select', options: yesNo, required: true, reviewFlag: true },
      { key: 'visa_lost_date', label: 'Fecha aproximada de pérdida o robo de visa', type: 'date', when: { key: 'visa_lost', equals: 'Sí' } },
      { key: 'visa_lost_details', label: 'Describe lo sucedido', type: 'textarea', when: { key: 'visa_lost', equals: 'Sí' }, required: true, reviewFlag: true },
      { key: 'us_immigration_problem', label: '¿Has tenido algún problema con migración o autoridades en EE. UU.?', type: 'select', options: yesNo, required: true, reviewFlag: true },
      { key: 'us_immigration_problem_type', label: 'Tipo de situación', type: 'select', options: ['Detención migratoria', 'Deportación / expulsión', 'Permanencia mayor a la autorizada', 'Problema en el puerto de entrada', 'Otro'], when: { key: 'us_immigration_problem', equals: 'Sí' }, required: true, reviewFlag: true },
      { key: 'us_immigration_problem_date', label: 'Fecha aproximada de la situación', type: 'date', when: { key: 'us_immigration_problem', equals: 'Sí' }, required: true },
      { key: 'us_immigration_problem_details', label: 'Describe qué ocurrió', type: 'textarea', when: { key: 'us_immigration_problem', equals: 'Sí' }, required: true, reviewFlag: true },
    ],
  },
  {
    id: 'family',
    title: 'Familia',
    description: 'Los datos de la pareja aparecen en Datos personales según el estado civil.',
    fields: [
      { key: 'father_name', label: 'Nombre completo de tu padre', type: 'text' },
      { key: 'father_birth_date', label: 'Fecha de nacimiento de tu padre', type: 'date' },
      { key: 'mother_name', label: 'Nombre completo de tu madre', type: 'text' },
      { key: 'mother_birth_date', label: 'Fecha de nacimiento de tu madre', type: 'date' },
      { key: 'family_us', label: '¿Tienes familiares viviendo en Estados Unidos?', type: 'select', options: yesNo, required: true },
    ],
  },
  {
    id: 'work',
    title: 'Trabajo y estudios',
    description: 'Incluye datos de tu empleo actual, empleos anteriores y escuela, con domicilios separados.',
    fields: [
      { key: 'employer', label: 'Empresa donde trabajas o actividad que realizas', type: 'text' },
      ...addressFields('employer', 'trabajo actual'),
      { key: 'job_title', label: 'Puesto o actividad principal', type: 'text' },
      { key: 'job_start', label: 'Fecha en que comenzaste en tu empleo actual', type: 'date' },
      { key: 'monthly_income', label: 'Ingreso mensual bruto aproximado (MXN)', type: 'number' },
      { key: 'previous_job', label: '¿Has tenido un trabajo anterior?', type: 'select', options: yesNo },
      { key: 'previous_employer', label: 'Empresa donde trabajabas anteriormente', type: 'text', when: { key: 'previous_job', equals: 'Sí' } },
      ...addressFields('previous_employer', 'trabajo anterior', false, { key: 'previous_job', equals: 'Sí' }),
      { key: 'previous_employer_phone', label: 'Teléfono del trabajo anterior', type: 'tel', when: { key: 'previous_job', equals: 'Sí' } },
      { key: 'previous_job_title', label: 'Puesto del trabajo anterior', type: 'text', when: { key: 'previous_job', equals: 'Sí' } },
      { key: 'previous_job_start', label: 'Fecha de inicio en el trabajo anterior', type: 'date', when: { key: 'previous_job', equals: 'Sí' } },
      { key: 'previous_job_end', label: 'Fecha de término del trabajo anterior', type: 'date', when: { key: 'previous_job', equals: 'Sí' } },
      { key: 'education_level', label: 'Último nivel de estudios terminado', type: 'select', options: ['Primaria', 'Secundaria', 'Preparatoria / Bachillerato', 'Carrera técnica', 'Licenciatura', 'Maestría', 'Doctorado', 'Otro'] },
      { key: 'school_name', label: 'Institución donde estudiaste', type: 'text' },
      ...addressFields('school', 'institución educativa'),
      { key: 'school_course', label: 'Carrera o curso realizado', type: 'text' },
      { key: 'school_start', label: 'Fecha de inicio de estudios', type: 'date' },
      { key: 'school_end', label: 'Fecha de término de estudios', type: 'date' },
    ],
  },
  {
    id: 'tn',
    title: 'Información para visa TN',
    description: 'Preguntas adicionales para revisar oferta, puesto y perfil profesional.',
    mode: 'TN',
    fields: [
      { key: 'tn_employer', label: 'Nombre de la empresa que te contratará en EE. UU.', type: 'text', required: true },
      ...addressFields('tn_employer', 'empresa en EE. UU.'),
      { key: 'tn_employer_phone', label: 'Teléfono de esa empresa', type: 'tel' },
      { key: 'tn_position', label: 'Puesto ofrecido', type: 'text', required: true },
      { key: 'tn_profession', label: 'Profesión o categoría TN propuesta', type: 'text', required: true, help: 'El equipo de Visa Master verificará si corresponde a una categoría admitida.' },
      { key: 'tn_duties', label: 'Principales actividades que realizarás', type: 'textarea', required: true },
      { key: 'tn_salary', label: 'Sueldo ofrecido (USD)', type: 'number' },
      { key: 'tn_salary_period', label: 'Periodicidad del sueldo', type: 'select', options: ['Hora', 'Semana', 'Quincena', 'Mes', 'Año'] },
      { key: 'tn_start_date', label: 'Fecha prevista para comenzar', type: 'date' },
      { key: 'tn_worksite', label: 'Ciudad donde desempeñarás el trabajo', type: 'text' },
      { key: 'tn_qualifications', label: 'Estudios o experiencia relacionados con el puesto', type: 'textarea' },
    ],
  },
]

export const sectionsForMode = (mode: VisaMode) => draftSections.filter((section) => !section.mode || section.mode === mode)

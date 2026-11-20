import config from './trade-in-motion-config.json'

export type AnswerMap = Record<string, string>
export type Person = { id: number; fullName: string; relationship: string; immigrationStatus?: string }
export type GroupedPeople = { companions: Person[]; relatives: Person[] }
type Condition = { key: string; equals: string | string[] }
export type Question = {
  key: string; label: string; type: string; required?: boolean; requiredWhen?: Condition;
  when?: Condition; options?: string[]; help?: string; placeholder?: string; inlinePrompt?: boolean
}
export type Section = { id: string; title: string; description: string; fields: Question[] }
export const sections = config.sections as Section[]
export const questionMap = new Map(sections.flatMap(s => s.fields.map(f => [f.key, f] as const)))
export const emptyPeople: GroupedPeople = { companions: [], relatives: [] }

export function conditionMatches(condition: Condition | undefined, answers: AnswerMap) {
  if (!condition) return true
  const expected = condition.equals
  return Array.isArray(expected) ? expected.includes(answers[condition.key]) : expected === answers[condition.key]
}
export function isVisible(field: Question, answers: AnswerMap) {
  return conditionMatches(field.when, answers)
}
export function isRequired(field: Question, answers: AnswerMap) {
  return !!field.required || (!!field.requiredWhen && conditionMatches(field.requiredWhen, answers))
}
export function cleanAnswers(raw: unknown): AnswerMap {
  const provided = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const answers: AnswerMap = {}
  for (const field of questionMap.values()) {
    const value = provided[field.key]
    if (typeof value !== 'string') continue
    const clean = value.trim().slice(0, field.type === 'textarea' ? 4000 : 500)
    if (clean) answers[field.key] = clean
  }
  // No conservar datos de ramas condicionales que el solicitante descartó.
  for (let pass = 0; pass < 4; pass++)
    for (const field of questionMap.values()) if (!isVisible(field, answers)) delete answers[field.key]
  return answers
}
export function cleanPeople(raw: unknown): GroupedPeople {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const normalize = (list: unknown): Person[] => Array.isArray(list)
    ? list.slice(0, 20).map((p, i) => {
        const obj = p && typeof p === 'object' && !Array.isArray(p) ? p as Record<string, unknown> : {}
        const val = (key: string) => typeof obj[key] === 'string' ? (obj[key] as string).trim().slice(0, 250) : ''
        return { id: i + 1, fullName: val('fullName'), relationship: val('relationship'), immigrationStatus: val('immigrationStatus') }
      })
    : []
  return { companions: normalize(value.companions), relatives: normalize(value.relatives) }
}
export function validateSubmission(answers: AnswerMap, people: GroupedPeople): string[] {
  const problems: string[] = []
  for (const section of sections) for (const field of section.fields) {
    if (!isVisible(field, answers)) continue
    const value = answers[field.key] ?? ''
    if (isRequired(field, answers) && !value) problems.push(field.label)
    if (!value) continue
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) problems.push(field.label + ' (correo inválido)')
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) problems.push(field.label + ' (fecha inválida)')
    if (field.type === 'number' && !Number.isFinite(Number(value))) problems.push(field.label + ' (número inválido)')
    if (field.type === 'select' && field.options?.length && field.key !== 'travel_payer_relationship' && !field.options.includes(value)) problems.push(field.label + ' (opción inválida)')
  }
  if (answers.social_media_used === 'Sí' &&
    !['social_facebook','social_instagram','social_x','social_tiktok','social_linkedin','social_youtube','social_snapchat','social_reddit','social_other']
      .some(key => Boolean(answers[key]?.trim())))
    problems.push('Indica por lo menos un usuario o identificador de las redes sociales que has utilizado')
  if (!answers.full_name || !answers.phone || !answers.email) problems.push('Nombre, teléfono y correo son necesarios')
  if (!/^\d{10,15}$/.test((answers.phone || '').replace(/\D/g, ''))) problems.push('Teléfono: de 10 a 15 dígitos')
  if (answers.travel_with_someone === 'Sí') {
    if (!people.companions.length || people.companions.some(p => !p.fullName || !p.relationship))
      problems.push('Completa los acompañantes de viaje')
  }
  if (answers.family_us === 'Sí') {
    if (!people.relatives.length || people.relatives.some(p => !p.fullName || !p.relationship || !p.immigrationStatus))
      problems.push('Completa los familiares en Estados Unidos')
  }
  return [...new Set(problems)]
}
export function countProgress(answers: AnswerMap, people: GroupedPeople) {
  const required = sections.flatMap(s => s.fields).filter(f => isVisible(f, answers) && isRequired(f, answers))
  let total = required.length, complete = required.filter(f => Boolean(answers[f.key])).length
  if (answers.travel_with_someone === 'Sí') {
    total += 2 * Math.max(1, people.companions.length)
    complete += people.companions.reduce((n, p) => n + Number(!!p.fullName) + Number(!!p.relationship), 0)
  }
  if (answers.family_us === 'Sí') {
    total += 3 * Math.max(1, people.relatives.length)
    complete += people.relatives.reduce((n, p) => n + Number(!!p.fullName) + Number(!!p.relationship) + Number(!!p.immigrationStatus), 0)
  }
  return total ? Math.min(100, Math.round(100 * complete / total)) : 0
}

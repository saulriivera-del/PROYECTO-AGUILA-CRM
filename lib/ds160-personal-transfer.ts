/**
 * Primera fase del puente CRM Águila -> extensión DS-160.
 * Este archivo NO contiene selectores CEAC ni automatiza el envío consular.
 * Solo se importa desde código de servidor (usa node:crypto).
 */
import { createHash } from 'node:crypto'
import {
  cleanAnswers, getSelectedSocialPlatforms, isRequired, isVisible,
  sections, type AnswerMap,
} from '@/lib/trade-in-motion'

const personal = sections.find(section => section.id === 'personal')
if (!personal) throw new Error('No está configurada la sección personal de Águila')

export const PERSONAL_TRANSFER_SCHEMA = 'vm-ds160-personal-v1'
export type PersonalProblem = { key: string; label: string }

export function personalAnswers(raw: unknown): AnswerMap {
  const answers = cleanAnswers(raw)
  const result: AnswerMap = {}
  for (const field of personal!.fields) {
    if (!isVisible(field, answers)) continue
    const value = answers[field.key]
    if (value) result[field.key] = value
  }
  return result
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T00:00:00.000Z')
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Confirma integridad y formato de ESTA sección; no equivale a validación consular. */
export function personalProblems(raw: unknown): PersonalProblem[] {
  const answers = personalAnswers(raw)
  const problems: PersonalProblem[] = []
  for (const field of personal!.fields) {
    if (!isVisible(field, answers)) continue
    const value = answers[field.key] || ''
    if (isRequired(field, answers) && !value) {
      problems.push({ key: field.key, label: field.label })
      continue
    }
    if (!value) continue
    if (field.type === 'date' && !validDate(value)) problems.push({ key: field.key, label: field.label + ' (fecha inválida)' })
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) problems.push({ key: field.key, label: field.label + ' (correo inválido)' })
    if (field.type === 'tel' && !/^\d{10,15}$/.test(value.replace(/\D/g,''))) problems.push({ key: field.key, label: field.label + ' (teléfono inválido)' })
    if (field.type === 'select' && field.options?.length && !field.options.includes(value))
      problems.push({ key: field.key, label: field.label + ' (opción inválida)' })
    if (field.type === 'multiselect' && (getSelectedSocialPlatforms(value).join('|') !== value || !getSelectedSocialPlatforms(value).length))
      problems.push({ key: field.key, label: field.label + ' (selección inválida)' })
  }
  return problems
}

/** Cualquier cambio en respuestas personales anula el sello de aprobación. */
export function personalDigest(raw: unknown): string {
  const ordered = Object.entries(personalAnswers(raw)).sort(([a],[b]) => a.localeCompare(b))
  return createHash('sha256').update(JSON.stringify([PERSONAL_TRANSFER_SCHEMA, ordered])).digest('hex')
}

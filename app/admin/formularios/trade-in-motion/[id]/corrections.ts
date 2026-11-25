'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanAnswers, cleanPeople, validateSubmission, type AnswerMap, type GroupedPeople } from '@/lib/trade-in-motion'

export async function saveDs160Correction(
  draftId: string, expectedVersion: number, rawAnswers: AnswerMap,
  rawPeople: GroupedPeople, reasonInput: string,
): Promise<{ ok: boolean; error?: string; version?: number; warnings?: string[] }> {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role.trim().toLowerCase() !== 'reception')
    return { ok: false, error: 'No tienes permiso para corregir formularios.' }
  if (!/^[a-f0-9-]{36}$/i.test(draftId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
    return { ok: false, error: 'Identificador o versión inválidos.' }
  const reason = String(reasonInput || '').trim().slice(0, 500)
  if (reason.length < 3) return { ok: false, error: 'Escribe el motivo de la corrección (mínimo tres caracteres).' }
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers) ||
    !rawPeople || typeof rawPeople !== 'object' || Array.isArray(rawPeople))
    return { ok: false, error: 'Contenido inválido.' }

  const answers = cleanAnswers(rawAnswers)
  const people = cleanPeople(rawPeople)
  if (answers.travel_with_someone !== 'Sí' || answers.travel_companions_group !== 'No') people.companions = []
  if (answers.family_us !== 'Sí') people.relatives = []
  const db = createAdminClient()
  // RPC privado: compara versión y escribe corrección e historial en una sola transacción.
  // No se modifica el formulario original del solicitante ni sus credenciales.
  const { data, error } = await db.rpc('vm_ds160_save_correction', {
    p_draft_id: draftId,
    p_organization_id: context.organizationId,
    p_editor_id: context.userId,
    p_expected_version: expectedVersion,
    p_answers: answers,
    p_people: people,
    p_reason: reason,
  })
  if (error) {
    if (/versi[oó]n desactualizada/i.test(error.message))
      return { ok: false, error: 'Otro operador guardó cambios. Actualiza la página antes de volver a editar.' }
    console.error('DS-160 correction error', error.code)
    return { ok: false, error: 'No se guardó la corrección. Vuelve a intentarlo.' }
  }
  revalidatePath('/admin/formularios/trade-in-motion')
  revalidatePath('/admin/formularios/trade-in-motion/' + draftId)
  revalidatePath('/admin/demo-automatizacion-ds160')
  return { ok: true, version: Number(data), warnings: validateSubmission(answers, people).slice(0, 12) }
}

'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()
const number = (form: FormData, name: string) => Number(text(form, name) || 0)

async function audit(context: Awaited<ReturnType<typeof requireAuthContext>>, action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await context.supabase.from('insight_audit_log').insert({ organization_id: context.organizationId, actor_id: context.userId, action, entity_type: entityType, entity_id: entityId, details })
}

export async function saveGoal(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const id = text(form, 'id')
  const payload = {
    organization_id: context.organizationId,
    name: text(form, 'name'),
    metric: text(form, 'metric'),
    period: text(form, 'period'),
    target_value: number(form, 'target_value'),
    assigned_to: text(form, 'assigned_to') || null,
    is_active: true,
    updated_by: context.userId,
  }
  if (!payload.name || payload.target_value <= 0) redirect('/admin/insights/metas?error=Captura%20una%20meta%20válida')
  const query = id
    ? context.supabase.from('insight_goals').update(payload).eq('id', id).eq('organization_id', context.organizationId)
    : context.supabase.from('insight_goals').insert(payload)
  const { error } = await query
  if (error) redirect('/admin/insights/metas?error=' + encodeURIComponent(error.message))
  await audit(context, id ? 'goal.updated' : 'goal.created', 'insight_goal', id || null, payload)
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/metas')
  redirect('/admin/insights/metas?saved=1')
}

export async function saveBonusRule(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const id = text(form, 'id')
  const payload = {
    organization_id: context.organizationId,
    user_id: text(form, 'user_id'),
    name: text(form, 'name') || 'Bono semanal',
    period: 'Semanal',
    revenue_source: 'Dinero cobrado',
    threshold_amount: number(form, 'threshold_amount'),
    base_bonus: number(form, 'base_bonus'),
    step_amount: number(form, 'step_amount'),
    step_bonus: number(form, 'step_bonus'),
    is_active: true,
    updated_by: context.userId,
  }
  if (!payload.user_id || payload.threshold_amount <= 0 || payload.step_amount <= 0) redirect('/admin/insights/bonos?error=Revisa%20la%20configuración%20del%20bono')
  const query = id
    ? context.supabase.from('bonus_rules').update(payload).eq('id', id).eq('organization_id', context.organizationId)
    : context.supabase.from('bonus_rules').insert(payload)
  const { error } = await query
  if (error) redirect('/admin/insights/bonos?error=' + encodeURIComponent(error.message))
  await audit(context, id ? 'bonus_rule.updated' : 'bonus_rule.created', 'bonus_rule', id || null, payload)
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/bonos')
  redirect('/admin/insights/bonos?saved=1')
}


export async function toggleGoal(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const id = text(form, 'id')
  if (!id) redirect('/admin/insights/metas?error=Meta%20no%20válida')
  const { error } = await context.supabase.from('insight_goals').update({is_active:false, updated_by:context.userId}).eq('id',id).eq('organization_id',context.organizationId)
  if (error) redirect('/admin/insights/metas?error='+encodeURIComponent(error.message))
  await audit(context, 'goal.archived', 'insight_goal', id)
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/metas')
  redirect('/admin/insights/metas?disabled=1')
}

export async function closeCurrentBonusWeek(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const ruleId = text(form, 'rule_id')
  const periodStart = text(form, 'period_start')
  const periodEnd = text(form, 'period_end')
  const userId = text(form, 'user_id')
  if (!ruleId || !userId || !periodStart || !periodEnd) redirect('/admin/insights/bonos?error=No%20fue%20posible%20cerrar%20la%20semana')

  const { data: existing } = await context.supabase.from('bonus_history').select('id,status').eq('organization_id', context.organizationId).eq('bonus_rule_id', ruleId).eq('period_start', periodStart).maybeSingle()
  if (existing) redirect('/admin/insights/bonos?already_closed=1')

  const { data: rule, error: ruleError } = await context.supabase.from('bonus_rules').select('threshold_amount,base_bonus,step_amount,step_bonus').eq('id', ruleId).eq('organization_id', context.organizationId).single()
  if (ruleError || !rule) redirect('/admin/insights/bonos?error=No%20se%20encontró%20la%20regla%20del%20bono')

  const periodEndExclusive = new Date(`${periodEnd}T00:00:00`)
  periodEndExclusive.setDate(periodEndExclusive.getDate() + 1)
  const { data: weekPayments, error: paymentsError } = await context.supabase.from('payments').select('amount').eq('organization_id', context.organizationId).gte('payment_date', `${periodStart}T00:00:00`).lt('payment_date', periodEndExclusive.toISOString())
  if (paymentsError) redirect('/admin/insights/bonos?error=' + encodeURIComponent(paymentsError.message))
  const revenue = (weekPayments ?? []).reduce((sum: number, payment: { amount: number | string | null }) => sum + Number(payment.amount ?? 0), 0)
  const threshold = Number(rule.threshold_amount)
  const stepAmount = Number(rule.step_amount)
  const bonus = revenue < threshold ? 0 : Number(rule.base_bonus) + Math.floor((revenue - threshold) / stepAmount) * Number(rule.step_bonus)
  const payload = {
    organization_id: context.organizationId,
    bonus_rule_id: ruleId,
    user_id: userId,
    period_start: periodStart,
    period_end: periodEnd,
    collected_revenue: revenue,
    calculated_bonus: bonus,
    threshold_snapshot: Number(rule.threshold_amount),
    base_bonus_snapshot: Number(rule.base_bonus),
    step_amount_snapshot: Number(rule.step_amount),
    step_bonus_snapshot: Number(rule.step_bonus),
    status: 'Pendiente',
    closed_at: new Date().toISOString(),
    closed_by: context.userId,
  }
  const { data: history, error } = await context.supabase.from('bonus_history').insert(payload).select('id').single()
  if (error) redirect('/admin/insights/bonos?error=' + encodeURIComponent(error.message))
  await audit(context, 'bonus_week.closed', 'bonus_history', history?.id ?? null, payload)
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/bonos')
  redirect('/admin/insights/bonos?closed=1')
}

export async function markBonusPaid(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const id = text(form, 'id')
  if (!id) redirect('/admin/insights/bonos?error=Bono%20no%20válido')
  const { data: current } = await context.supabase.from('bonus_history').select('status').eq('id', id).eq('organization_id', context.organizationId).maybeSingle()
  if (!current) redirect('/admin/insights/bonos?error=Bono%20no%20encontrado')
  if (current.status === 'Pagado') redirect('/admin/insights/bonos?already_paid=1')
  const { error } = await context.supabase.from('bonus_history').update({ status: 'Pagado', paid_at: new Date().toISOString(), paid_by: context.userId }).eq('id', id).eq('organization_id', context.organizationId)
  if (error) redirect('/admin/insights/bonos?error=' + encodeURIComponent(error.message))
  await audit(context, 'bonus.paid', 'bonus_history', id)
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/bonos')
  redirect('/admin/insights/bonos?paid=1')
}

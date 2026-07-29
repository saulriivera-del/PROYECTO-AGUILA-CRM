'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()
const number = (form: FormData, name: string) => Number(text(form, name) || 0)

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
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/bonos')
  redirect('/admin/insights/bonos?saved=1')
}


export async function toggleGoal(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const id = text(form, 'id')
  if (!id) redirect('/admin/insights/metas?error=Meta%20no%20válida')
  const { error } = await context.supabase.from('insight_goals').update({is_active:false, updated_by:context.userId}).eq('id',id).eq('organization_id',context.organizationId)
  if (error) redirect('/admin/insights/metas?error='+encodeURIComponent(error.message))
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/metas')
  redirect('/admin/insights/metas?disabled=1')
}

export async function closeCurrentBonusWeek(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const ruleId = text(form, 'rule_id')
  const revenue = number(form, 'collected_revenue')
  const bonus = number(form, 'calculated_bonus')
  const periodStart = text(form, 'period_start')
  const periodEnd = text(form, 'period_end')
  const userId = text(form, 'user_id')
  if (!ruleId || !userId || !periodStart || !periodEnd) redirect('/admin/insights/bonos?error=No%20fue%20posible%20cerrar%20la%20semana')
  const { error } = await context.supabase.from('bonus_history').upsert({
    organization_id: context.organizationId,
    bonus_rule_id: ruleId,
    user_id: userId,
    period_start: periodStart,
    period_end: periodEnd,
    collected_revenue: revenue,
    calculated_bonus: bonus,
    status: 'Pendiente',
  }, { onConflict: 'bonus_rule_id,period_start' })
  if (error) redirect('/admin/insights/bonos?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/bonos')
  redirect('/admin/insights/bonos?closed=1')
}

export async function markBonusPaid(form: FormData) {
  const context = await requireAuthContext(); requireAdministrator(context)
  const id = text(form, 'id')
  if (!id) redirect('/admin/insights/bonos?error=Bono%20no%20válido')
  const { error } = await context.supabase.from('bonus_history').update({ status: 'Pagado', paid_at: new Date().toISOString() }).eq('id', id).eq('organization_id', context.organizationId)
  if (error) redirect('/admin/insights/bonos?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/insights'); revalidatePath('/admin/insights/bonos')
  redirect('/admin/insights/bonos?paid=1')
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim()
}

export async function createProcess(formData: FormData) {
  const context = await requireAuthContext()
  const clientId = value(formData, 'client_id')
  const serviceFlowId = value(formData, 'service_flow_id')
  const agreedAmount = Number(value(formData, 'agreed_amount') || 0)
  const paidNow = formData.get('paid_now') === 'on'
  const paidAmount = paidNow
    ? Number(value(formData, 'paid_amount') || agreedAmount)
    : 0
  const paymentMethod = value(formData, 'payment_method') || 'Efectivo'

  const { data: flow } = await context.supabase
    .from('service_flows')
    .select('id, service_name')
    .eq('id', serviceFlowId)
    .single()

  if (!clientId || !flow) {
    redirect('/admin/tramites?error=Selecciona%20cliente%20y%20servicio')
  }

  const { data: process, error } = await context.supabase
    .from('processes')
    .insert({
      organization_id: context.organizationId,
      client_id: clientId,
      service_flow_id: flow.id,
      service_name: flow.service_name,
      status: 'Activo',
      priority: value(formData, 'priority') || 'Media',
      current_stage: 'Inicio',
      government_appointment_at: value(formData, 'government_appointment_at') || null,
      notes: value(formData, 'notes') || null,
      assigned_to: context.userId,
      created_by: context.userId,
    })
    .select('id')
    .single()

  if (error) redirect(`/admin/tramites?error=${encodeURIComponent(error.message)}`)

  if (agreedAmount > 0) {
    await context.supabase.from('process_charges').insert({
      organization_id: context.organizationId,
      process_id: process.id,
      agreed_amount: agreedAmount,
      discount_amount: 0,
      payment_commitment_date: value(formData, 'payment_commitment_date') || null,
      created_by: context.userId,
    })
  }

  if (paidNow && paidAmount > 0) {
    await context.supabase.from('payments').insert({
      organization_id: context.organizationId,
      process_id: process.id,
      amount: paidAmount,
      payment_method: paymentMethod,
      reference: value(formData, 'payment_reference') || null,
      notes: 'Pago registrado al crear el trámite',
      recorded_by: context.userId,
    })
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: process.id,
    action: 'created',
    description: `Trámite creado: ${flow.service_name}`,
    metadata: paidNow ? { payment_registered: true, paid_amount: paidAmount } : {},
  })

  revalidatePath('/admin')
  revalidatePath('/admin/clientes')
  revalidatePath('/admin/tramites')
  redirect('/admin/tramites?created=1')
}


export async function updateProcessStep(formData: FormData) {
  const context = await requireAuthContext()
  const processId = value(formData, 'process_id')
  const stepId = value(formData, 'step_id')
  const nextStatus = value(formData, 'next_status')

  const { data: step, error } = await context.supabase
    .from('process_steps')
    .update({
      status: nextStatus,
      completed_at: nextStatus === 'Completado' ? new Date().toISOString() : null,
      completed_by: nextStatus === 'Completado' ? context.userId : null,
    })
    .eq('id', stepId)
    .eq('process_id', processId)
    .select('step_name')
    .single()

  if (error) {
    redirect(`/admin/tramites/${processId}?error=${encodeURIComponent(error.message)}`)
  }

  const { data: allSteps } = await context.supabase
    .from('process_steps')
    .select('step_order, step_name, status')
    .eq('process_id', processId)
    .order('step_order')

  const nextPending = allSteps?.find((item) => item.status !== 'Completado')
  const allCompleted = allSteps?.length && allSteps.every((item) => item.status === 'Completado')

  await context.supabase
    .from('processes')
    .update({
      current_stage: allCompleted ? 'Concluido' : nextPending?.step_name ?? 'Inicio',
      status: allCompleted ? 'Concluido' : 'Activo',
      closed_at: allCompleted ? new Date().toISOString() : null,
    })
    .eq('id', processId)

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: processId,
    action: nextStatus === 'Completado' ? 'step_completed' : 'step_reopened',
    description: `${step.step_name}: ${nextStatus}`,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/tramites')
  revalidatePath(`/admin/tramites/${processId}`)
  redirect(`/admin/tramites/${processId}?updated=1`)
}

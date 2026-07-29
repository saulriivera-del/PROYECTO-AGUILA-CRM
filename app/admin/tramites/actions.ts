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
  const assignedTo = value(formData, 'assigned_to') || null
  const priorityAttentionAt = value(formData, 'priority_attention_at') || null

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
      assigned_to: assignedTo,
      priority_attention_at: priorityAttentionAt || null,
      created_by: context.userId,
      operational_status: 'Automático',
      last_movement_at: new Date().toISOString(),
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

  if (assignedTo && priorityAttentionAt) {
    await upsertAutomatedAgendaEvent(context, {
      processId: process.id,
      clientId,
      title: `Prioridad asignada · ${flow.service_name}`,
      description: 'Trámite asignado para atención prioritaria en esta fecha.',
      startsAt: new Date(priorityAttentionAt),
      automationKey: `${process.id}:assigned-priority`,
      eventType: 'Tarea prioritaria',
      assignedTo,
      priority: 'Urgente',
    })
  }

  revalidatePath('/admin')
  revalidatePath('/admin/clientes')
  revalidatePath('/admin/tramites')
  redirect('/admin/tramites?created=1')
}


function localDateParts(value: string) {
  const date = new Date(value)
  return {
    date,
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  }
}

function atLocalTime(base: Date, hour: number, minute = 0) {
  const result = new Date(base)
  result.setHours(hour, minute, 0, 0)
  return result
}

function reminderBeforeAppointment(appointment: Date) {
  const result = new Date(appointment)
  if (appointment.getDay() === 1) {
    result.setDate(result.getDate() - 2)
  } else {
    result.setDate(result.getDate() - 1)
  }
  return atLocalTime(result, 10, 0)
}

function addDaysAt(base: Date, days: number, hour = 10, minute = 0) {
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return atLocalTime(result, hour, minute)
}

function etaFollowupDate() {
  const now = new Date()
  const hours = [5, 6, 0].includes(now.getDay()) ? 72 : 24
  return new Date(now.getTime() + hours * 60 * 60 * 1000)
}

function whatsappReminder(clientName: string, appointmentType: string, appointment: Date) {
  const formatted = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(appointment)

  return `Hola ${clientName}, Visa Master te recuerda que tu cita de ${appointmentType} es ${formatted}. Estamos a la orden para cualquier duda.`
}

async function upsertAutomatedAgendaEvent(
  context: Awaited<ReturnType<typeof requireAuthContext>>,
  input: {
    processId: string
    clientId: string
    title: string
    description: string
    startsAt: Date
    automationKey: string
    whatsappMessage?: string | null
    eventType?: string
    assignedTo?: string | null
    priority?: string
  },
) {
  const payload = {
    organization_id: context.organizationId,
    process_id: input.processId,
    client_id: input.clientId,
    title: input.title,
    event_type: input.eventType ?? 'Seguimiento',
    description: input.description,
    starts_at: input.startsAt.toISOString(),
    assignment_scope: input.assignedTo ? 'Específico' : 'General',
    assigned_to: input.assignedTo ?? null,
    priority: input.priority ?? 'Normal',
    status: 'Pendiente',
    created_by: context.userId,
    whatsapp_message: input.whatsappMessage ?? null,
    automation_key: input.automationKey,
  }

  const { data: existing } = await context.supabase
    .from('agenda_events')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('automation_key', input.automationKey)
    .maybeSingle()

  if (existing?.id) {
    await context.supabase
      .from('agenda_events')
      .update(payload)
      .eq('id', existing.id)
      .eq('organization_id', context.organizationId)
  } else {
    await context.supabase.from('agenda_events').insert(payload)
  }
}

async function createAppointmentAutomations(
  context: Awaited<ReturnType<typeof requireAuthContext>>,
  process: any,
  stepName: string,
  dates: {
    cas?: Date | null
    consulate?: Date | null
    interview?: Date | null
  },
) {
  const service = String(process.service_name)
  const processClientRelation = (process as any).clients as
    | { full_name?: string | null; phone?: string | null }
    | { full_name?: string | null; phone?: string | null }[]
    | null
  const processClient = Array.isArray(processClientRelation)
    ? processClientRelation[0]
    : processClientRelation
  const clientName = processClient?.full_name ?? 'cliente'
  const processId = process.id
  const clientId = process.client_id

  if (dates.cas) {
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Recordar cita CAS · ${clientName}`,
      description: `Enviar recordatorio de la cita CAS de ${clientName}.`,
      startsAt: reminderBeforeAppointment(dates.cas),
      automationKey: `${processId}:cas-reminder`,
      whatsappMessage: whatsappReminder(clientName, 'CAS', dates.cas),
      eventType: 'Cita gubernamental',
    })
  }

  if (dates.consulate) {
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Recordar cita Consulado · ${clientName}`,
      description: `Enviar recordatorio de la cita consular de ${clientName}.`,
      startsAt: reminderBeforeAppointment(dates.consulate),
      automationKey: `${processId}:consulate-reminder`,
      whatsappMessage: whatsappReminder(clientName, 'Consulado', dates.consulate),
      eventType: 'Cita gubernamental',
    })

    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Verificar resultado consular · ${clientName}`,
      description: 'Verificar si el trámite fue aprobado o rechazado.',
      startsAt: atLocalTime(dates.consulate, 17, 0),
      automationKey: `${processId}:consulate-status`,
      eventType: 'Seguimiento',
    })
  }

  if (dates.interview) {
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Preparación de entrevista · ${clientName}`,
      description: 'Revisar documentación y preparar al cliente para su entrevista.',
      startsAt: dates.interview,
      automationKey: `${processId}:interview-preparation`,
      eventType: 'Cita con cliente',
    })
  }

  if (dates.cas && service === 'Renovación Visa Americana') {
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Verificar estatus de renovación · ${clientName}`,
      description: 'Han transcurrido 20 días desde la cita CAS. Verificar el estatus.',
      startsAt: addDaysAt(dates.cas, 20),
      automationKey: `${processId}:renewal-status-20`,
    })
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Verificar llegada de visa · ${clientName}`,
      description: 'Han transcurrido 40 días desde la cita CAS. Verificar si la visa está lista para recolección.',
      startsAt: addDaysAt(dates.cas, 40),
      automationKey: `${processId}:renewal-status-40`,
    })
  }

  if (dates.cas && service === 'Visa tipo H') {
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Verificar estatus Visa H · ${clientName}`,
      description: 'Verificar el estatus del trámite dos días después de la cita CAS.',
      startsAt: addDaysAt(dates.cas, 2),
      automationKey: `${processId}:h-status-2`,
    })
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Seguimiento Visa H · ${clientName}`,
      description: 'Confirmar con el tramitante que todo haya salido bien.',
      startsAt: addDaysAt(dates.cas, 10),
      automationKey: `${processId}:h-status-10`,
      whatsappMessage: `Hola ${clientName}, te escribimos de Visa Master para confirmar que todo haya salido bien con tu trámite de Visa H. Estamos a la orden.`,
    })
  }

  if (dates.cas && service === 'Pasaporte mexicano') {
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Recordar cita en Relaciones Exteriores · ${clientName}`,
      description: 'Recordar al cliente su cita ante la Secretaría de Relaciones Exteriores.',
      startsAt: reminderBeforeAppointment(dates.cas),
      automationKey: `${processId}:passport-reminder`,
      whatsappMessage: whatsappReminder(clientName, 'Relaciones Exteriores', dates.cas),
      eventType: 'Cita gubernamental',
    })
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId,
      title: `Ofrecer seguimiento de Visa Americana · ${clientName}`,
      description: 'Contactar al cliente después de su cita de pasaporte para ofrecer seguimiento de visa.',
      startsAt: atLocalTime(dates.cas, 15, 30),
      automationKey: `${processId}:passport-visa-followup`,
      whatsappMessage: `Hola ${clientName}, esperamos que todo haya salido bien en tu cita de pasaporte. En Visa Master estamos a la orden para ayudarte con tu trámite de Visa Americana cuando lo desees.`,
    })
  }
}

export async function updateProcessStep(formData: FormData) {
  const context = await requireAuthContext()
  const processId = value(formData, 'process_id')
  const stepId = value(formData, 'step_id')
  const nextStatus = value(formData, 'next_status')

  const { data: step, error: stepError } = await context.supabase
    .from('process_steps')
    .select('id, step_order, step_name')
    .eq('id', stepId)
    .eq('process_id', processId)
    .single()

  if (stepError || !step) {
    redirect(`/admin/tramites/${processId}?error=No%20se%20encontró%20la%20etapa`)
  }

  const { data: process, error: processError } = await context.supabase
    .from('processes')
    .select('id, client_id, service_name, clients(full_name, phone)')
    .eq('id', processId)
    .eq('organization_id', context.organizationId)
    .single()

  if (processError || !process) {
    redirect(`/admin/tramites/${processId}?error=No%20se%20encontró%20el%20trámite`)
  }

  const casValue = value(formData, 'cas_appointment_at')
  const consulateValue = value(formData, 'consulate_appointment_at')
  const interviewValue = value(formData, 'interview_preparation_at')
  const resultStatus = value(formData, 'result_status')

  const normalizedStep = step.step_name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (
    nextStatus === 'Completado' &&
    (normalizedStep.includes('cita encontrada') || normalizedStep === 'cita agendada') &&
    (!casValue || !consulateValue)
  ) {
    redirect(`/admin/tramites/${processId}?error=Captura%20las%20dos%20citas`)
  }

  if (
    nextStatus === 'Completado' &&
    (normalizedStep.includes('cita ante el cas') || normalizedStep.includes('programacion de cita')) &&
    !casValue
  ) {
    redirect(`/admin/tramites/${processId}?error=Captura%20la%20fecha%20de%20la%20cita`)
  }

  if (
    nextStatus === 'Completado' &&
    normalizedStep.includes('preparacion entrevista') &&
    !interviewValue
  ) {
    redirect(`/admin/tramites/${processId}?error=Captura%20la%20fecha%20de%20preparación`)
  }

  if (
    nextStatus === 'Completado' &&
    normalizedStep.includes('aprobada o rechazada') &&
    !resultStatus
  ) {
    redirect(`/admin/tramites/${processId}?error=Selecciona%20el%20resultado`)
  }

  const now = new Date().toISOString()

  if (nextStatus === 'Completado') {
    const { error } = await context.supabase
      .from('process_steps')
      .update({
        status: 'Completado',
        completed_at: now,
        completed_by: context.userId,
      })
      .eq('process_id', processId)
      .lte('step_order', step.step_order)

    if (error) {
      redirect(`/admin/tramites/${processId}?error=${encodeURIComponent(error.message)}`)
    }
  } else {
    const { error } = await context.supabase
      .from('process_steps')
      .update({
        status: 'Pendiente',
        completed_at: null,
        completed_by: null,
      })
      .eq('process_id', processId)
      .gte('step_order', step.step_order)

    if (error) {
      redirect(`/admin/tramites/${processId}?error=${encodeURIComponent(error.message)}`)
    }
  }

  const processUpdates: Record<string, string | null> = {}
  if (casValue) processUpdates.cas_appointment_at = new Date(casValue).toISOString()
  if (consulateValue) processUpdates.consulate_appointment_at = new Date(consulateValue).toISOString()
  if (interviewValue) processUpdates.interview_preparation_at = new Date(interviewValue).toISOString()
  if (resultStatus) processUpdates.result_status = resultStatus

  if (Object.keys(processUpdates).length) {
    await context.supabase
      .from('processes')
      .update(processUpdates)
      .eq('id', processId)
      .eq('organization_id', context.organizationId)
  }

  if (nextStatus === 'Completado') {
    await createAppointmentAutomations(context, process, step.step_name, {
      cas: casValue ? new Date(casValue) : null,
      consulate: consulateValue ? new Date(consulateValue) : null,
      interview: interviewValue ? new Date(interviewValue) : null,
    })

    if (process.service_name === 'eTA Canadá' && normalizedStep === 'pagar eta') {
      const clientRelation = (process as any).clients as
        | { full_name?: string | null }
        | { full_name?: string | null }[]
        | null
      const clientName = Array.isArray(clientRelation)
        ? clientRelation[0]?.full_name
        : clientRelation?.full_name

      await upsertAutomatedAgendaEvent(context, {
        processId,
        clientId: process.client_id,
        title: `Verificar recepción de eTA · ${clientName ?? 'Cliente'}`,
        description: 'Confirmar con el cliente que la eTA llegó correctamente a su correo.',
        startsAt: etaFollowupDate(),
        automationKey: `${processId}:eta-followup`,
        whatsappMessage: `Hola ${clientName ?? ''}, te escribimos de Visa Master para confirmar que tu eTA haya llegado correctamente a tu correo electrónico.`,
      })
    }
  }

  const { data: allSteps } = await context.supabase
    .from('process_steps')
    .select('step_order, step_name, status')
    .eq('process_id', processId)
    .order('step_order')

  const nextPending = allSteps?.find((item) => item.status !== 'Completado')
  const allCompleted = Boolean(
    allSteps?.length && allSteps.every((item) => item.status === 'Completado'),
  )

  await context.supabase
    .from('processes')
    .update({
      current_stage: allCompleted ? 'Concluido' : nextPending?.step_name ?? 'Inicio',
      status: allCompleted ? 'Concluido' : 'Activo',
      closed_at: allCompleted ? now : null,
      last_movement_at: now,
      operational_status: allCompleted ? 'En orden' : 'Automático',
    })
    .eq('id', processId)

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: processId,
    action: nextStatus === 'Completado' ? 'step_completed' : 'step_reopened',
    description:
      nextStatus === 'Completado'
        ? `${step.step_name} y etapas anteriores: Completado`
        : `${step.step_name} y etapas posteriores: Pendiente`,
    metadata: resultStatus ? { result_status: resultStatus } : {},
  })

  revalidatePath('/admin')
  revalidatePath('/admin/agenda')
  revalidatePath('/admin/tramites')
  revalidatePath(`/admin/tramites/${processId}`)
  redirect(`/admin/tramites/${processId}?updated=1`)
}

export async function createVisaFollowup(formData: FormData) {
  const context = await requireAuthContext()
  const processId = value(formData, 'process_id')

  const { data: process } = await context.supabase
    .from('processes')
    .select('id, client_id, clients(full_name)')
    .eq('id', processId)
    .eq('organization_id', context.organizationId)
    .single()

  if (!process) {
    redirect(`/admin/tramites/${processId}?error=No%20se%20encontró%20el%20trámite`)
  }

  const clientRelation = (process as any).clients as
    | { full_name?: string | null }
    | { full_name?: string | null }[]
    | null
  const client = Array.isArray(clientRelation) ? clientRelation[0] : clientRelation

  await upsertAutomatedAgendaEvent(context, {
    processId,
    clientId: process.client_id,
    title: `Seguimiento para Visa Americana · ${client?.full_name ?? 'Cliente'}`,
    description: 'Contactar al cliente para iniciar o cotizar su trámite de Visa Americana.',
    startsAt: new Date(),
    automationKey: `${processId}:manual-visa-followup`,
    whatsappMessage: `Hola ${client?.full_name ?? ''}, en Visa Master estamos a la orden para ayudarte a iniciar tu trámite de Visa Americana.`,
  })

  revalidatePath('/admin/agenda')
  revalidatePath(`/admin/tramites/${processId}`)
  redirect(`/admin/tramites/${processId}?visa_followup=1`)
}


export async function updateProcessAssignment(formData: FormData) {
  const context = await requireAuthContext()
  const processId = value(formData, 'process_id')
  const assignedTo = value(formData, 'assigned_to') || null
  const priority = value(formData, 'priority') || 'Media'
  const priorityAttentionAt = value(formData, 'priority_attention_at') || null
  const operationalStatus = value(formData, 'operational_status') || 'Automático'

  const { data: process, error } = await context.supabase
    .from('processes')
    .update({
      assigned_to: assignedTo,
      priority,
      priority_attention_at: priorityAttentionAt || null,
      operational_status: operationalStatus,
      last_movement_at: new Date().toISOString(),
    })
    .eq('id', processId)
    .eq('organization_id', context.organizationId)
    .select('id, client_id, service_name')
    .single()

  if (error || !process) {
    redirect(`/admin/tramites/${processId}?error=${encodeURIComponent(error?.message ?? 'No se pudo guardar la asignación')}`)
  }

  const { data: existingEvent } = await context.supabase
    .from('agenda_events')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('automation_key', `${processId}:assigned-priority`)
    .maybeSingle()

  if (assignedTo && priorityAttentionAt) {
    await upsertAutomatedAgendaEvent(context, {
      processId,
      clientId: process.client_id,
      title: `Prioridad asignada · ${process.service_name}`,
      description: 'Trámite asignado para atención prioritaria en esta fecha.',
      startsAt: new Date(priorityAttentionAt),
      automationKey: `${processId}:assigned-priority`,
      eventType: 'Tarea prioritaria',
      assignedTo,
      priority: 'Urgente',
    })
  } else if (existingEvent?.id) {
    await context.supabase
      .from('agenda_events')
      .delete()
      .eq('id', existingEvent.id)
      .eq('organization_id', context.organizationId)
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: processId,
    action: 'assignment_updated',
    description: assignedTo
      ? `Trámite asignado con prioridad ${priority}`
      : 'Trámite disponible para todo el equipo',
    metadata: {
      assigned_to: assignedTo,
      priority,
      priority_attention_at: priorityAttentionAt,
    },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/agenda')
  revalidatePath('/admin/tramites')
  revalidatePath(`/admin/tramites/${processId}`)
  redirect(`/admin/tramites/${processId}?assignment_updated=1`)
}


export async function updateProcessStatus(formData: FormData) {
  const context = await requireAuthContext()
  const processId = value(formData, 'process_id')
  const nextStatus = value(formData, 'next_status')

  const allowedStatuses = ['Activo', 'En espera', 'Concluido', 'Cancelado']

  if (!processId || !allowedStatuses.includes(nextStatus)) {
    redirect(`/admin/tramites/${processId}?error=Estado%20no%20válido`)
  }

  const { data: currentProcess, error: processLookupError } = await context.supabase
    .from('processes')
    .select('service_name, client_id, current_stage')
    .eq('id', processId)
    .eq('organization_id', context.organizationId)
    .single()

  if (processLookupError || !currentProcess) {
    redirect(`/admin/tramites/${processId}?error=No%20se%20encontró%20el%20trámite`)
  }

  const { data: steps } = await context.supabase
    .from('process_steps')
    .select('step_order, step_name, status')
    .eq('process_id', processId)
    .order('step_order')

  const nextPendingStep = steps?.find((step) => step.status !== 'Completado')
  const isClosed = nextStatus === 'Concluido' || nextStatus === 'Cancelado'

  const currentStage =
    nextStatus === 'Concluido'
      ? 'Concluido'
      : nextStatus === 'Cancelado'
        ? 'Cancelado'
        : nextPendingStep?.step_name || currentProcess.current_stage || 'Inicio'

  const { error } = await context.supabase
    .from('processes')
    .update({
      status: nextStatus,
      current_stage: currentStage,
      closed_at: isClosed ? new Date().toISOString() : null,
      last_movement_at: new Date().toISOString(),
      operational_status: isClosed ? 'En orden' : 'Automático',
    })
    .eq('id', processId)
    .eq('organization_id', context.organizationId)

  if (error) {
    redirect(`/admin/tramites/${processId}?error=${encodeURIComponent(error.message)}`)
  }

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: processId,
    action: 'status_changed',
    description: `${currentProcess.service_name}: estado cambiado a ${nextStatus}`,
    metadata: { status: nextStatus },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/tramites')
  revalidatePath(`/admin/tramites/${processId}`)
  revalidatePath(`/admin/clientes/${currentProcess.client_id}`)
  revalidatePath('/admin/cobranza')

  redirect(`/admin/tramites/${processId}?status_updated=1`)
}


export async function quickUpdateProcess(formData: FormData) {
  const context = await requireAuthContext()
  const processId = value(formData, 'process_id')
  const returnTo = value(formData, 'return_to') || '/admin'
  const assignedTo = value(formData, 'assigned_to') || null
  const priority = value(formData, 'priority') || 'Media'
  const operationalStatus = value(formData, 'operational_status') || 'Automático'
  const allowedOperational = [
    'Automático', 'Atender hoy', 'Esperando al cliente', 'Esperando cita',
    'Esperando pago', 'Seguimiento pendiente', 'En orden',
  ]
  if (!processId || !allowedOperational.includes(operationalStatus)) {
    redirect(`${returnTo}?error=Actualización%20no%20válida`)
  }

  const { error } = await context.supabase
    .from('processes')
    .update({
      assigned_to: assignedTo,
      priority,
      operational_status: operationalStatus,
      last_movement_at: new Date().toISOString(),
    })
    .eq('id', processId)
    .eq('organization_id', context.organizationId)

  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`)

  await context.supabase.from('activity_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    entity_type: 'process',
    entity_id: processId,
    action: 'quick_operational_update',
    description: `Control rápido: ${operationalStatus} · prioridad ${priority}`,
    metadata: { assigned_to: assignedTo, priority, operational_status: operationalStatus },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/tramites')
  revalidatePath(`/admin/tramites/${processId}`)
  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}quick_updated=1`)
}

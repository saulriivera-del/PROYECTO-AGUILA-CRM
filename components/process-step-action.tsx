'use client'

import { useMemo, useState } from 'react'
import SubmitButton from '@/components/submit-button'
import { updateProcessStep } from '@/app/admin/tramites/actions'

function normalized(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function ProcessStepAction({
  processId,
  serviceName,
  step,
}: {
  processId: string
  serviceName: string
  step: {
    id: string
    step_name: string
    status: string
  }
}) {
  const completed = step.status === 'Completado'
  const [open, setOpen] = useState(false)
  const key = normalized(step.step_name)

  const mode = useMemo(() => {
    if (key.includes('cita encontrada') || key === 'cita agendada') return 'two-appointments'
    if (key.includes('cita ante el cas') || key.includes('programacion de cita')) return 'cas-only'
    if (key.includes('preparacion entrevista')) return 'interview'
    if (key.includes('aprobada o rechazada')) return 'result'
    return 'simple'
  }, [key])

  if (completed) {
    return (
      <form action={updateProcessStep}>
        <input type="hidden" name="process_id" value={processId} />
        <input type="hidden" name="step_id" value={step.id} />
        <input type="hidden" name="next_status" value="Pendiente" />
        <SubmitButton className="step-button completed" pendingText="Reabriendo…">
          ✓ Completado
        </SubmitButton>
      </form>
    )
  }

  if (mode === 'simple') {
    return (
      <form action={updateProcessStep}>
        <input type="hidden" name="process_id" value={processId} />
        <input type="hidden" name="step_id" value={step.id} />
        <input type="hidden" name="next_status" value="Completado" />
        <SubmitButton className="step-button" pendingText="Actualizando…">
          Marcar completo
        </SubmitButton>
      </form>
    )
  }

  if (!open) {
    return (
      <button className="step-button" type="button" onClick={() => setOpen(true)}>
        Capturar datos
      </button>
    )
  }

  return (
    <form action={updateProcessStep} className="step-data-form">
      <input type="hidden" name="process_id" value={processId} />
      <input type="hidden" name="step_id" value={step.id} />
      <input type="hidden" name="next_status" value="Completado" />

      {mode === 'two-appointments' ? (
        <>
          <label>
            Cita CAS
            <input name="cas_appointment_at" type="datetime-local" required />
          </label>
          <label>
            Cita Consulado
            <input name="consulate_appointment_at" type="datetime-local" required />
          </label>
        </>
      ) : null}

      {mode === 'cas-only' ? (
        <label>
          Fecha de la cita
          <input name="cas_appointment_at" type="datetime-local" required />
        </label>
      ) : null}

      {mode === 'interview' ? (
        <label>
          Revisión de documentación
          <input name="interview_preparation_at" type="datetime-local" required />
        </label>
      ) : null}

      {mode === 'result' ? (
        <label>
          Resultado
          <select name="result_status" defaultValue="" required>
            <option value="" disabled>Selecciona</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
          </select>
        </label>
      ) : null}

      <div className="step-data-actions">
        <SubmitButton className="primary-button" pendingText="Guardando…">
          Guardar y completar
        </SubmitButton>
        <button className="secondary-button" type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

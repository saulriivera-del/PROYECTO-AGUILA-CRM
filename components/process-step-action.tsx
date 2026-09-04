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
  const [renewalResolution, setRenewalResolution] = useState('')
  const key = normalized(step.step_name)

  const mode = useMemo(() => {
    if (key.includes('cita encontrada') || key === 'cita agendada') return 'two-appointments'
    if (key.includes('cita ante el cas') || key.includes('programacion de cita')) return 'cas-only'
    if (key.includes('preparacion entrevista')) return 'interview'
    if (key.includes('verificar estatus de renovacion')) return 'renewal-status'
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
            Fecha de cita CAS
            <input name="cas_appointment_at" type="date" required />
          </label>
          <label>
            Fecha de cita Consulado
            <input name="consulate_appointment_at" type="date" required />
          </label>
        </>
      ) : null}

      {mode === 'cas-only' ? (
        <label>
          {serviceName === 'Pasaporte mexicano' ? 'Fecha de cita en Relaciones Exteriores' : 'Fecha de la cita'}
          <input name="cas_appointment_at" type="date" required />
        </label>
      ) : null}

      {mode === 'interview' ? (
        <label>
          Revisión de documentación
          <input name="interview_preparation_at" type="date" required />
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

      {mode === 'renewal-status' ? (
        <>
          <label>
            Resultado de la renovación
            <select name="renewal_resolution" value={renewalResolution} onChange={(event) => setRenewalResolution(event.target.value)} required>
              <option value="" disabled>Selecciona</option>
              <option value="Aprobada">Aprobada</option>
              <option value="Cita consular">Llamada a cita consular</option>
            </select>
          </label>
          {renewalResolution === 'Aprobada' ? (
            <label>
              Fecha de aprobación
              <input name="renewal_approval_at" type="date" required />
            </label>
          ) : null}
          {renewalResolution === 'Cita consular' ? (
            <label>
              Fecha de cita consular
              <input name="consulate_appointment_at" type="date" required />
            </label>
          ) : null}
        </>
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

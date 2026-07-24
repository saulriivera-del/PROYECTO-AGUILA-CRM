'use client'

import SubmitButton from '@/components/submit-button'
import { updateProcessStep } from '@/app/admin/tramites/actions'

export default function ProgressStepButton({
  processId,
  stepId,
  status,
}: {
  processId: string
  stepId: string
  status: string
}) {
  const completed = status === 'Completado'

  return (
    <form action={updateProcessStep}>
      <input type="hidden" name="process_id" value={processId} />
      <input type="hidden" name="step_id" value={stepId} />
      <input type="hidden" name="next_status" value={completed ? 'Pendiente' : 'Completado'} />
      <SubmitButton
        className={completed ? 'step-button completed' : 'step-button'}
        pendingText="Actualizando…"
      >
        {completed ? '✓ Completado' : 'Marcar completo'}
      </SubmitButton>
    </form>
  )
}

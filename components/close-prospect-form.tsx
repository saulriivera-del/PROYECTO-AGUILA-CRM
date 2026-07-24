'use client'

import { useState } from 'react'
import SubmitButton from '@/components/submit-button'
import { closeProspect } from '@/app/admin/prospectos/actions'

export default function CloseProspectForm({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button className="danger-outline-button" type="button" onClick={() => setOpen(true)}>
        Cerrar
      </button>
    )
  }

  return (
    <form action={closeProspect} className="inline-close-form">
      <input type="hidden" name="prospect_id" value={prospectId} />
      <select name="loss_reason" required defaultValue="">
        <option value="" disabled>Motivo</option>
        <option>Muy caro</option>
        <option>No respondió</option>
        <option>Eligió otra agencia</option>
        <option>Ya no necesita el trámite</option>
        <option>No calificó</option>
        <option>Otro</option>
      </select>
      <SubmitButton className="danger-button" pendingText="Cerrando…">
        Confirmar
      </SubmitButton>
      <button className="secondary-button" type="button" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  )
}

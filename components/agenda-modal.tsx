'use client'

import { useState } from 'react'
import ModalShell from '@/components/modal-shell'
import AgendaForm from '@/components/agenda-form'

type Profile = {
  id: string
  full_name: string | null
  role: string
}

export default function AgendaModal({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="primary-button" type="button" onClick={() => setOpen(true)}>
        + Nueva actividad
      </button>
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva actividad"
        subtitle="Programa una tarea general o asígnala a un integrante del equipo."
        size="large"
      >
        <AgendaForm profiles={profiles} modal />
      </ModalShell>
    </>
  )
}

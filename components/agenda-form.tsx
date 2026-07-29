'use client'

import { useState } from 'react'
import { createAgendaEvent } from '@/app/admin/agenda/actions'
import SubmitButton from '@/components/submit-button'

type Profile = {
  id: string
  full_name: string | null
  role: string
}

export default function AgendaForm({
  profiles,
  modal = false,
}: {
  profiles: Profile[]
  modal?: boolean
}) {
  const [scope, setScope] = useState('General')

  return (
    <form
      action={createAgendaEvent}
      className={modal ? 'modal-form' : 'form-card'}
    >
      <div className="modal-form-section">
        <div className="form-section-heading">
          <span>Información principal</span>
          <small>Define qué debe hacerse y cuándo.</small>
        </div>

        <div className="form-grid">
          <label className="span-2">
            Título
            <input name="title" placeholder="Ej. Llamar para confirmar documentos" required />
          </label>

          <label>
            Tipo
            <select name="event_type" defaultValue="Tarea">
              <option>Tarea</option>
              <option>Cita con cliente</option>
              <option>Seguimiento</option>
              <option>Llamada</option>
              <option>Pago</option>
              <option>Cita gubernamental</option>
              <option>Otro</option>
            </select>
          </label>

          <label>
            Asignación
            <select
              name="assignment_scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option>General</option>
              <option value="Específico">Específico</option>
            </select>
          </label>

          {scope === 'Específico' ? (
            <label className="span-2">
              Responsable
              <select name="assigned_to" required defaultValue="">
                <option value="" disabled>Selecciona un usuario</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name || 'Usuario'} · {profile.role}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            Inicia
            <input name="starts_at" type="datetime-local" required />
          </label>
          <label>
            Termina
            <input name="ends_at" type="datetime-local" />
          </label>
        </div>
      </div>

      <div className="modal-form-section">
        <div className="form-section-heading">
          <span>Indicaciones</span>
          <small>Agrega el contexto necesario para completar la actividad.</small>
        </div>
        <label>
          Descripción
          <textarea
            name="description"
            rows={4}
            placeholder="Escribe instrucciones, acuerdos o información relevante."
          />
        </label>
      </div>

      <div className="modal-form-actions">
        <SubmitButton pendingText="Guardando actividad…">
          Guardar actividad
        </SubmitButton>
      </div>
    </form>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createProspect } from '@/app/admin/prospectos/actions'
import SubmitButton from '@/components/submit-button'
import MexicoStates from '@/components/mexico-states'
import NumberInput from '@/components/number-input'

export default function ProspectFormDrawer() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <button className="primary-button" onClick={() => setOpen(true)}>
        + Nuevo prospecto
      </button>

      {open ? (
        <div className="drawer-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <aside
            className="form-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prospect-drawer-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="drawer-header">
              <div>
                <span className="eyebrow">Nuevo registro</span>
                <h2 id="prospect-drawer-title">Agregar prospecto</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            <form action={createProspect} className="drawer-form">
              <div className="form-grid">
                <label className="span-2">
                  Nombre completo
                  <input name="full_name" autoFocus required />
                </label>

                <label>
                  Teléfono / WhatsApp
                  <input name="phone" inputMode="tel" required />
                </label>

                <label>
                  Correo
                  <input name="email" type="email" />
                </label>

                <label>
                  Servicio
                  <select name="service_interest" required defaultValue="">
                    <option value="" disabled>Selecciona</option>
                    <option>Visa americana</option>
                    <option>Pasaporte mexicano</option>
                    <option>Visa + Pasaporte</option>
                    <option>Adelanto de cita</option>
                    <option>Visa TN</option>
                    <option>Visa TD</option>
                    <option>Visa tipo H</option>
                    <option>eTA Canadá</option>
                    <option>I-94</option>
                    <option>Reporte de extravío</option>
                  </select>
                </label>

                <label>
                  Origen
                  <select name="origin" defaultValue="WhatsApp">
                    <option>WhatsApp</option>
                    <option>Oficina</option>
                    <option>Teléfono</option>
                    <option>Facebook</option>
                    <option>Instagram</option>
                    <option>Google</option>
                    <option>Recomendación</option>
                    <option>Formulario web</option>
                  </select>
                </label>

                <label>
                  Temperatura
                  <select name="temperature" defaultValue="Seguimiento">
                    <option>Caliente</option>
                    <option>Seguimiento</option>
                    <option>Frío</option>
                  </select>
                </label>

                <label>
                  Monto cotizado
                  <NumberInput name="quoted_amount" min="0" step="0.01" inputMode="decimal" />
                </label>

                <label>
                  Cita para llenar formato
                  <input name="internal_appointment_at" type="datetime-local" />
                </label>

                <label>
                  Próximo seguimiento
                  <input name="next_followup_at" type="datetime-local" />
                </label>

                <label>
                  Modalidad del seguimiento
                  <select name="next_followup_mode" defaultValue="Llamada">
                    <option>En oficina</option>
                    <option>Llamada</option>
                    <option>WhatsApp</option>
                    <option>Videollamada</option>
                    <option>Otro</option>
                  </select>
                </label>

                <label>
                  Ciudad
                  <input name="city" defaultValue="Hermosillo" />
                </label>

                <label>
                  Estado
                  <MexicoStates />
                </label>
              </div>

              <label>
                Observaciones
                <textarea name="notes" rows={4} />
              </label>

              <div className="drawer-actions">
                <button className="secondary-button" type="button" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <SubmitButton pendingText="Guardando prospecto…">
                  Guardar prospecto
                </SubmitButton>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  )
}

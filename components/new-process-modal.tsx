'use client'

import { useState } from 'react'
import ModalShell from '@/components/modal-shell'
import ClientSearchSelect from '@/components/client-search-select'
import PaymentNowFields from '@/components/payment-now-fields'
import NumberInput from '@/components/number-input'
import SubmitButton from '@/components/submit-button'
import { createProcess } from '@/app/admin/tramites/actions'

type Client = {
  id: string
  full_name: string
  phone: string
  city: string | null
  state: string | null
  process_count: number
}

type Flow = {
  id: string
  service_name: string
}

type Profile = {
  id: string
  full_name: string | null
  role: string
}

export default function NewProcessModal({
  clients,
  flows,
  profiles,
  defaultClientId = '',
}: {
  clients: Client[]
  flows: Flow[]
  profiles: Profile[]
  defaultClientId?: string
}) {
  const defaultClient = clients.find((client) => client.id === defaultClientId)
  const [open, setOpen] = useState(Boolean(defaultClientId))
  const [contactPhone, setContactPhone] = useState(defaultClient?.phone ?? '')

  return (
    <>
      <button
        className="primary-button"
        type="button"
        onClick={() => setOpen(true)}
        disabled={!clients.length}
      >
        + Nuevo trámite
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Crear nuevo trámite"
        subtitle="Registra el servicio, responsable, prioridad y acuerdo económico."
        size="wide"
      >
        <form action={createProcess} className="modal-form process-modal-form">
          {!clients.length ? (
            <div className="notice error">
              Primero registra o convierte al menos un cliente.
            </div>
          ) : null}

          <section className="modal-form-section">
            <div className="form-section-heading">
              <span>1. Cliente y servicio</span>
              <small>Selecciona el expediente y el flujo que se generará.</small>
            </div>
            <div className="form-grid">
              <label className="span-2">
                Cliente
                <ClientSearchSelect
                  defaultClientId={defaultClientId}
                  clients={clients}
                  onClientChange={(client) => setContactPhone(client?.phone ?? '')}
                />
              </label>
              <label>
                Teléfono de contacto para este trámite
                <input
                  name="contact_phone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  inputMode="tel"
                  required
                />
                <small>Se carga el número del cliente, pero puedes cambiarlo solo para este trámite.</small>
              </label>
              <label>
                Tipo de trámite
                <select name="service_flow_id" required defaultValue="">
                  <option value="" disabled>Selecciona</option>
                  {flows.map((flow) => (
                    <option value={flow.id} key={flow.id}>
                      {flow.service_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="modal-form-section">
            <div className="form-section-heading">
              <span>2. Operación</span>
              <small>Define quién lo atenderá y cuándo debe priorizarse.</small>
            </div>
            <div className="form-grid">
              <label>
                Responsable
                <select name="assigned_to" defaultValue="">
                  <option value="">General · visible para todos</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || 'Usuario'} · {profile.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prioridad
                <select name="priority" defaultValue="Media">
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </label>
              <label>
                Fecha prioritaria de atención
                <input name="priority_attention_at" type="datetime-local" />
              </label>
              <label>
                Cita gubernamental inicial
                <input name="government_appointment_at" type="date" />
              </label>
            </div>
          </section>

          <section className="modal-form-section">
            <div className="form-section-heading">
              <span>3. Acuerdo económico</span>
              <small>El pago inicial es opcional y se registrará en Cobranza.</small>
            </div>
            <div className="form-grid">
              <label>
                Total acordado
                <NumberInput
                  name="agreed_amount"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                />
              </label>
              <label>
                Compromiso de pago
                <input name="payment_commitment_date" type="date" />
              </label>
            </div>
            <PaymentNowFields />
          </section>

          <section className="modal-form-section">
            <div className="form-section-heading">
              <span>4. Observaciones</span>
              <small>Información interna para el equipo.</small>
            </div>
            <label>
              Observaciones
              <textarea name="notes" rows={4} />
            </label>
          </section>

          <div className="modal-form-actions">
            <SubmitButton
              pendingText="Creando trámite…"
              disabled={!clients.length}
            >
              Crear trámite
            </SubmitButton>
          </div>
        </form>
      </ModalShell>
    </>
  )
}

'use client'

import { useMemo, useState } from 'react'
import ModalShell from '@/components/modal-shell'
import PaymentNowFields from '@/components/payment-now-fields'
import NumberInput from '@/components/number-input'
import SubmitButton from '@/components/submit-button'
import { createProcess } from '@/app/admin/tramites/actions'

type Client = {
  id: string
  full_name: string
  phone: string
  email?: string | null
  city: string | null
  state: string | null
  process_count: number
}

type Flow = { id: string; service_name: string }
type Profile = { id: string; full_name: string | null; role: string }

const digits = (value: string) => value.replace(/\D/g, '')

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
  const [clientId, setClientId] = useState(defaultClient?.id ?? '')
  const [fullName, setFullName] = useState(defaultClient?.full_name ?? '')
  const [phone, setPhone] = useState(defaultClient?.phone ?? '')
  const [email, setEmail] = useState(defaultClient?.email ?? '')
  const [contactPhone, setContactPhone] = useState(defaultClient?.phone ?? '')

  const detected = useMemo(() => {
    const normalized = digits(phone)
    if (!normalized) return null
    return clients.find((client) => digits(client.phone) === normalized) ?? null
  }, [clients, phone])

  function handlePhone(value: string) {
    setPhone(value)
    const normalized = digits(value)
    const match = clients.find((client) => digits(client.phone) === normalized)
    if (match) {
      setClientId(match.id)
      setFullName(match.full_name)
      setEmail(match.email ?? '')
      setContactPhone(match.phone)
    } else {
      setClientId('')
      setContactPhone(value)
    }
  }

  return (
    <>
      <button className="primary-button" type="button" onClick={() => setOpen(true)}>
        + Nuevo trámite
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Crear nuevo trámite"
        subtitle="Captura al tramitante y abre su expediente en un solo paso."
        size="wide"
      >
        <form action={createProcess} className="modal-form process-modal-form">
          <input type="hidden" name="client_id" value={clientId} />

          <section className="modal-form-section">
            <div className="form-section-heading">
              <span>1. Tramitante y servicio</span>
              <small>Águila reutiliza automáticamente el cliente si reconoce el teléfono.</small>
            </div>
            <div className="form-grid">
              <label>
                Nombre del tramitante
                <input name="client_full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </label>
              <label>
                Teléfono / WhatsApp
                <input name="client_phone" value={phone} onChange={(e) => handlePhone(e.target.value)} inputMode="tel" required />
              </label>
              <label>
                Correo del cliente
                <input name="client_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" />
              </label>
              <label>
                Teléfono de contacto para este trámite
                <input name="contact_phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" required />
                <small>Puede ser distinto al teléfono principal sin modificar el expediente general.</small>
              </label>
              <label className="span-2">
                Tipo de trámite
                <select name="service_flow_id" required defaultValue="">
                  <option value="" disabled>Selecciona</option>
                  {flows.map((flow) => <option value={flow.id} key={flow.id}>{flow.service_name}</option>)}
                </select>
              </label>
            </div>
            {detected ? (
              <div className="notice success compact-notice">
                Cliente existente detectado: <strong>{detected.full_name}</strong> · {detected.process_count} trámite(s). Se conservará su historial.
              </div>
            ) : phone ? (
              <div className="notice info compact-notice">Cliente nuevo: Águila creará su expediente al guardar el trámite.</div>
            ) : null}
          </section>

          <section className="modal-form-section">
            <div className="form-section-heading"><span>2. Operación</span><small>Define responsable y prioridad.</small></div>
            <div className="form-grid">
              <label>Responsable<select name="assigned_to" defaultValue=""><option value="">General · visible para todos</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name || 'Usuario'} · {profile.role}</option>)}</select></label>
              <label>Prioridad<select name="priority" defaultValue="Media"><option>Alta</option><option>Media</option><option>Baja</option></select></label>
              <label>Fecha prioritaria de atención<input name="priority_attention_at" type="datetime-local" /></label>
              <label>Cita gubernamental inicial<input name="government_appointment_at" type="date" /></label>
            </div>
          </section>

          <section className="modal-form-section">
            <div className="form-section-heading"><span>3. Acuerdo económico</span><small>El pago inicial es opcional y se registra en Cobranza.</small></div>
            <div className="form-grid">
              <label>Total acordado<NumberInput name="agreed_amount" min="0" step="0.01" inputMode="decimal" /></label>
              <label>Compromiso de pago<input name="payment_commitment_date" type="date" /></label>
            </div>
            <PaymentNowFields />
          </section>

          <section className="modal-form-section">
            <div className="form-section-heading"><span>4. Observaciones</span><small>Información interna para el equipo.</small></div>
            <label>Observaciones<textarea name="notes" rows={4} /></label>
          </section>

          <div className="modal-form-actions"><SubmitButton pendingText="Creando trámite…">Crear y abrir trámite</SubmitButton></div>
        </form>
      </ModalShell>
    </>
  )
}

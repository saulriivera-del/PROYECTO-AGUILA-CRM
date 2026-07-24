'use client'

import { useState } from 'react'
import NumberInput from '@/components/number-input'

export default function PaymentNowFields() {
  const [enabled, setEnabled] = useState(false)

  return (
    <fieldset className="payment-box">
      <label className="checkbox-row">
        <input
          type="checkbox"
          name="paid_now"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          <strong>Pagó en este momento</strong>
          <small>Registra el primer pago al crear el trámite.</small>
        </span>
      </label>

      {enabled ? (
        <div className="form-grid payment-fields">
          <label>Monto recibido
            <NumberInput name="paid_amount" min="0.01" step="0.01" inputMode="decimal" required />
          </label>
          <label>Método
            <select name="payment_method" defaultValue="Efectivo">
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              <option>Otro</option>
            </select>
          </label>
          <label className="span-2">Referencia (opcional)
            <input name="payment_reference" />
          </label>
        </div>
      ) : null}
    </fieldset>
  )
}

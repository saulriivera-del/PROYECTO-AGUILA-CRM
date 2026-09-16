'use client'

import { useState } from 'react'
import styles from './motor-citas.module.css'

type Props = {
  initialAnyTime: boolean
  initialFrom?: string | null
  initialTo?: string | null
}

function shortTime(value?: string | null) {
  return value ? String(value).slice(0, 5) : ''
}

export default function TimeWindowField({
  initialAnyTime,
  initialFrom,
  initialTo,
}: Props) {
  const [anyTime, setAnyTime] = useState(Boolean(initialAnyTime))

  return (
    <div className={styles.timeWindow}>
      <label className={styles.checkLabel}>
        <input
          type="checkbox"
          name="allow_any_time"
          checked={anyTime}
          onChange={(event) => setAnyTime(event.target.checked)}
        />
        <span>Aceptar cualquier horario</span>
      </label>

      <label className={anyTime ? styles.disabledField : ''}>
        <span>Hora mínima</span>
        <input
          type="time"
          name="allowed_time_from"
          defaultValue={shortTime(initialFrom)}
          disabled={anyTime}
        />
      </label>

      <label className={anyTime ? styles.disabledField : ''}>
        <span>Hora máxima</span>
        <input
          type="time"
          name="allowed_time_to"
          defaultValue={shortTime(initialTo)}
          disabled={anyTime}
        />
      </label>
    </div>
  )
}

'use client'

import { useState } from 'react'
import styles from './motor-citas.module.css'

type Props = {
  initialMode: string
  initialIntensiveInterval?: number | null
  isAdmin?: boolean
}

export default function SearchModeField({
  initialMode,
  initialIntensiveInterval,
  isAdmin = false,
}: Props) {
  const [mode, setMode] = useState(initialMode || 'INTELLIGENT')

  // Si un administrador dejó una configuración en Intensive,
  // el operador puede verla pero no modificar ese modo.
  if (!isAdmin && initialMode === 'INTENSIVE') {
    return (
      <>
        <div className={styles.statusReadOnly}>
          <span>Modo de búsqueda</span>
          <strong>Búsqueda intensiva</strong>
          <small>Configuración reservada para administración.</small>
          <input type="hidden" name="search_mode" value="INTENSIVE" />
          <input
            type="hidden"
            name="intensive_interval_seconds"
            value={String(initialIntensiveInterval || 30)}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <label>
        <span>Modo de búsqueda</span>
        <select
          name="search_mode"
          value={mode}
          onChange={(event) => setMode(event.target.value)}
        >
          <option value="ALERT_ONLY">Master Notificador</option>
          <option value="STANDARD">Búsqueda estándar</option>
          {isAdmin ? (
            <option value="INTENSIVE">Búsqueda intensiva · administración</option>
          ) : null}
          <option value="INTELLIGENT">Modo inteligente · recomendado</option>
        </select>

        {!isAdmin ? (
          <small>
            Los modos disponibles para operación están autorizados por Visa Master.
          </small>
        ) : null}
      </label>

      {mode === 'INTENSIVE' && isAdmin ? (
        <label>
          <span>Frecuencia de revisión intensiva</span>
          <select
            name="intensive_interval_seconds"
            defaultValue={String(initialIntensiveInterval || 30)}
          >
            <option value="15">Cada 15 segundos</option>
            <option value="30">Cada 30 segundos</option>
            <option value="60">Cada 60 segundos</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="intensive_interval_seconds" value="" />
      )}
    </>
  )
}

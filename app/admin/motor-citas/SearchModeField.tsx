'use client'

import { useState } from 'react'
import styles from './motor-citas.module.css'

type Props = {
  initialMode: string
  initialIntensiveInterval?: number | null
}

export default function SearchModeField({
  initialMode,
  initialIntensiveInterval,
}: Props) {
  const [mode, setMode] = useState(initialMode || 'INTELLIGENT')

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
          <option value="INTENSIVE">Búsqueda intensiva</option>
          <option value="INTELLIGENT">Modo inteligente · recomendado</option>
        </select>
      </label>

      {mode === 'INTENSIVE' ? (
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

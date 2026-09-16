'use client'

import { useMemo, useState } from 'react'
import styles from './motor-citas.module.css'

type Option = {
  value: string
  label: string
}

type Props = {
  name: string
  title: string
  help?: string
  options: Option[]
  initialValues?: string[]
}

export default function OrderedMultiSelect({
  name,
  title,
  help,
  options,
  initialValues = [],
}: Props) {
  const allowed = useMemo(() => new Set(options.map((o) => o.value)), [options])

  const normalizedInitial = initialValues
    .map((v) => String(v || '').trim().toUpperCase())
    .filter((v, index, arr) => v && allowed.has(v) && arr.indexOf(v) === index)

  const [selected, setSelected] = useState<string[]>(normalizedInitial)

  function toggle(value: string) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    )
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current

      const copy = [...current]
      ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
      return copy
    })
  }

  const labelFor = (value: string) =>
    options.find((option) => option.value === value)?.label || value

  return (
    <div className={styles.selectorCard}>
      <input type="hidden" name={name} value={selected.join(',')} />

      <div className={styles.selectorHeader}>
        <div>
          <strong>{title}</strong>
          {help ? <small>{help}</small> : null}
        </div>
        <span>{selected.length} seleccionado(s)</span>
      </div>

      <div className={styles.selectorLayout}>
        <div className={styles.optionList}>
          {options.map((option) => {
            const checked = selected.includes(option.value)

            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.optionButton} ${checked ? styles.optionSelected : ''}`}
                onClick={() => toggle(option.value)}
                aria-pressed={checked}
              >
                <span className={styles.fakeCheck}>{checked ? '✓' : ''}</span>
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.preferenceList}>
          <div className={styles.preferenceTitle}>Orden de preferencia</div>

          {selected.map((value, index) => (
            <div className={styles.preferenceItem} key={value}>
              <span className={styles.preferenceNumber}>{index + 1}</span>
              <strong>{labelFor(value)}</strong>

              <div className={styles.preferenceActions}>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  title="Subir prioridad"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === selected.length - 1}
                  title="Bajar prioridad"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggle(value)}
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {!selected.length ? (
            <div className={styles.preferenceEmpty}>
              Selecciona al menos una opción de la lista.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

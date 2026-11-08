'use client'

import { useMemo, useState, type ChangeEvent } from 'react'
import {
  type DraftField,
  type VisaMode,
  sectionsForMode,
} from '@/lib/ds160-demo/questions'
import styles from './demo.module.css'

export type CandidateForDemo = {
  processId: string
  clientId: string
  serviceName: string
  fullName: string
  birthDate: string | null
  phone: string | null
  email: string | null
}

const EXAMPLE_KEY = 'example'
const EMPTY: Record<string, string> = {}

function prefills(candidate: CandidateForDemo | undefined): Record<string, string> {
  if (!candidate) return EMPTY
  return {
    full_name: candidate.fullName ?? '',
    birth_date: candidate.birthDate ?? '',
    phone: candidate.phone ?? '',
    email: candidate.email ?? '',
  }
}

function visibleField(field: DraftField, answers: Record<string, string>) {
  return !field.when || answers[field.when.key] === field.when.equals
}

export default function DemoWizard({ candidates }: { candidates: CandidateForDemo[] }) {
  const [chosen, setChosen] = useState(EXAMPLE_KEY)
  const [mode, setMode] = useState<VisaMode>('TN')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(EMPTY)

  const sections = useMemo(() => sectionsForMode(mode), [mode])
  const current = sections[step] ?? sections[0]
  const fields = current.fields.filter((field) => visibleField(field, answers))
  const allRequired = sections.flatMap((section) =>
    section.fields.filter((field) => field.required && visibleField(field, answers)),
  )
  const completed = allRequired.filter((field) => String(answers[field.key] ?? '').trim()).length
  const percent = allRequired.length ? Math.round((completed / allRequired.length) * 100) : 0
  const first = step === 0
  const last = step === sections.length - 1
  const candidate = candidates.find((c) => c.processId === chosen)
  const prefilledCount = candidate ? Object.values(prefills(candidate)).filter(Boolean).length : 0
  const reviewItems = sections.flatMap((section) =>
    section.fields.filter((field) =>
      field.reviewFlag && visibleField(field, answers) &&
      (answers[field.key] === 'Sí' || (field.when && Boolean(answers[field.key]))),
    ),
  )

  function chooseCandidate(id: string) {
    const selected = candidates.find((c) => c.processId === id)
    setChosen(id)
    setAnswers({ ...prefills(selected) })
    setMode(selected?.serviceName === 'Visa TN' ? 'TN' : 'B1B2')
    if (!selected) setMode('TN')
    setStep(0)
  }

  function chooseMode(next: VisaMode) {
    setMode(next)
    setStep(0)
  }

  function change(key: string, value: string) {
    setAnswers((previous) => ({ ...previous, [key]: value }))
  }

  function renderInput(field: DraftField) {
    const common = {
      id: field.key,
      name: field.key,
      value: answers[field.key] ?? '',
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        change(field.key, event.target.value),
      className: styles.input,
      'aria-required': field.required || undefined,
    }
    if (field.type === 'textarea') {
      return <textarea {...common} rows={3} placeholder={field.placeholder ?? ''} />
    }
    if (field.type === 'select') {
      return (
        <select {...common}>
          <option value="">Selecciona una respuesta</option>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )
    }
    return <input {...common} type={field.type} placeholder={field.placeholder ?? ''} />
  }

  return (
    <div className={styles.shell}>
      <div className={styles.notice}>
        <strong>Demostración interna, sin envío de información.</strong>
        <span>Se consultan datos básicos del CRM únicamente para mostrar la precarga.
          Las respuestas que escribas aquí no se guardan, ni se envían a Supabase,
          Google Forms o al Departamento de Estado. Usa datos ficticios para probar.</span>
      </div>

      <section className={styles.controls} aria-label="Configuración de la demostración">
        <label>
          <span>Expediente de referencia</span>
          <select value={chosen} onChange={(e) => chooseCandidate(e.target.value)}>
            <option value={EXAMPLE_KEY}>Caso ficticio (sin datos personales)</option>
            {candidates.map((item) => (
              <option key={item.processId} value={item.processId}>
                {item.fullName} · {item.serviceName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Modalidad</span>
          <select value={mode} onChange={(e) => chooseMode(e.target.value as VisaMode)}>
            <option value="B1B2">Visa de visitante B1/B2</option>
            <option value="TN">Visa de trabajo TN</option>
          </select>
        </label>
        <p>
          {candidate
            ? `Expediente localizado. ${prefilledCount} datos precargados desde CRM Águila.`
            : 'Usa este ejemplo para recorrer el formulario sin información de clientes.'}
        </p>
      </section>

      <section className={styles.wizard} aria-label="Borrador de solicitud">
        <div className={styles.topline}>
          <div>
            <span className={styles.eyebrow}>Visa Master · Borrador de información</span>
            <h2>{mode === 'TN' ? 'Formulario para visa TN' : 'Formulario para visa B1/B2'}</h2>
          </div>
          <div className={styles.progressNumber}>{percent}% de campos esenciales</div>
        </div>
        <div className={styles.progressTrack}><div style={{ width: `${percent}%` }} /></div>
        <div className={styles.steps} aria-label="Secciones">
          {sections.map((section, index) => (
            <button
              type="button"
              className={index === step ? styles.stepActive : styles.step}
              key={section.id}
              onClick={() => setStep(index)}
              aria-current={index === step ? 'step' : undefined}
            >{index + 1}. {section.title}</button>
          ))}
        </div>
        <div className={styles.sectionHeading}>
          <span>Sección {step + 1} de {sections.length}</span>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
        </div>
        <div className={styles.fields}>
          {fields.map((field) => (
            <label key={field.key} htmlFor={field.key} className={styles.field}>
              <span>{field.label}{field.required ? <b> *</b> : null}</span>
              {field.help ? <small>{field.help}</small> : null}
              {renderInput(field)}
            </label>
          ))}
        </div>
        <div className={styles.footer}>
          <button className={styles.secondary} type="button" disabled={first} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Anterior
          </button>
          <span>Los campos con * son esenciales para esta demostración.</span>
          {last
            ? <button className={styles.primary} type="button" onClick={() => setStep(0)}>Volver al inicio</button>
            : <button className={styles.primary} type="button" onClick={() => setStep((s) => Math.min(sections.length - 1, s + 1))}>Siguiente sección</button>}
        </div>
      </section>

      <section className={styles.review}>
        <div>
          <h3>Resumen de la demostración</h3>
          <p>{completed} de {allRequired.length} campos esenciales completos.
            {reviewItems.length > 0 ? ` Hay ${reviewItems.length} respuestas que requieren revisión del equipo.` : ''}</p>
        </div>
        <button type="button" className={styles.secondary} onClick={() => {
          setAnswers({ ...prefills(candidate) })
          setStep(0)
        }}>Reiniciar respuestas</button>
      </section>
      <p className={styles.disclaimer}>
        Este borrador no sustituye el DS-160 oficial, ni determina elegibilidad TN. Antes de
        enviar cualquier solicitud consular se deben verificar todas las preguntas aplicables,
        los antecedentes y la información declarada por el solicitante. La capacidad de guardar
        borradores de manera segura en CRM Águila se implementará en una fase posterior.
      </p>
    </div>
  )
}

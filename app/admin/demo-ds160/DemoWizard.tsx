'use client'

import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  type DraftField,
  type VisaMode,
  companionRelationships,
  familyPayerRelationships,
  otherPayerRelationships,
  relativeRelationships,
  immigrationStatuses,
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

function conditionMatches(
  condition: NonNullable<DraftField['when']>,
  answers: Record<string, string>,
) {
  const expected = condition.equals
  return Array.isArray(expected)
    ? expected.includes(answers[condition.key])
    : answers[condition.key] === expected
}

function visibleField(field: DraftField, answers: Record<string, string>) {
  return !field.when || conditionMatches(field.when, answers)
}

function requiredField(field: DraftField, answers: Record<string, string>) {
  return Boolean(field.required) ||
    Boolean(field.requiredWhen && conditionMatches(field.requiredWhen, answers))
}

type PersonEntry = { id: number; fullName: string; relationship: string; immigrationStatus: string }

function PeopleEditor({
  title, kind, people, onAdd, onRemove, onChange,
}: {
  title: string
  kind: 'companion' | 'relative'
  people: PersonEntry[]
  onAdd: () => void
  onRemove: (id: number) => void
  onChange: (id: number, key: keyof Omit<PersonEntry, 'id'>, value: string) => void
}) {
  const relationships = kind === 'companion' ? companionRelationships : relativeRelationships
  return (
    <section className={styles.peopleBlock} aria-label={title}>
      <h4>{title}</h4>
      <p>Captura a cada persona por separado; no juntes nombres ni parentescos en un solo campo.</p>
      {people.map((person, index) => (
        <div className={styles.personCard} key={person.id}>
          <div className={styles.personHeading}>
            <strong>Persona {index + 1}</strong>
            <button type="button" className={styles.removeButton} onClick={() => onRemove(person.id)}>
              Quitar
            </button>
          </div>
          <div className={styles.personFields}>
            <label className={styles.field}>
              <span>Nombre completo <b>*</b></span>
              <input
                className={styles.input} type="text" value={person.fullName}
                onChange={(e) => onChange(person.id, 'fullName', e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Parentesco o relación <b>*</b></span>
              <select
                className={styles.input} value={person.relationship}
                onChange={(e) => onChange(person.id, 'relationship', e.target.value)}
              >
                <option value="">Selecciona una respuesta</option>
                {relationships.map((label) => <option key={label} value={label}>{label}</option>)}
              </select>
            </label>
            {kind === 'relative' && (
              <label className={styles.field}>
                <span>Situación migratoria en EE. UU. <b>*</b></span>
                <select
                  className={styles.input} value={person.immigrationStatus}
                  onChange={(e) => onChange(person.id, 'immigrationStatus', e.target.value)}
                >
                  <option value="">Selecciona una respuesta</option>
                  {immigrationStatuses.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      ))}
      <button className={styles.secondary} type="button" onClick={onAdd}>
        + Agregar {kind === 'companion' ? 'acompañante' : 'familiar'}
      </button>
      {people.length === 0 && <p className={styles.missing}>Agrega al menos una persona para completar esta respuesta.</p>}
    </section>
  )
}

export default function DemoWizard({ candidates }: { candidates: CandidateForDemo[] }) {
  const [chosen, setChosen] = useState(EXAMPLE_KEY)
  const [mode, setMode] = useState<VisaMode>('TN')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(EMPTY)
  const [companions, setCompanions] = useState<PersonEntry[]>([])
  const [relatives, setRelatives] = useState<PersonEntry[]>([])
  const personId = useRef(0)
  const newPerson = (): PersonEntry => ({
    id: ++personId.current, fullName: '', relationship: '', immigrationStatus: '',
  })
  const updatePerson = (
    setter: (value: PersonEntry[] | ((previous: PersonEntry[]) => PersonEntry[])) => void,
    id: number, key: keyof Omit<PersonEntry, 'id'>, value: string,
  ) => setter((previous) => previous.map((item) => item.id === id ? { ...item, [key]: value } : item))

  const sections = useMemo(() => sectionsForMode(mode), [mode])
  const current = sections[step] ?? sections[0]
  const fields = current.fields.filter((field) => visibleField(field, answers))
  const allRequired = sections.flatMap((section) =>
    section.fields.filter((field) => requiredField(field, answers) && visibleField(field, answers)),
  )
  const baseCompleted = allRequired.filter((field) => String(answers[field.key] ?? '').trim()).length
  const companionRequired = answers.travel_with_someone === 'Sí' ? 2 * Math.max(1, companions.length) : 0
  const relativeRequired = answers.family_us === 'Sí' ? 3 * Math.max(1, relatives.length) : 0
  const companionCompleted = answers.travel_with_someone === 'Sí'
    ? companions.reduce((count, p) => count + Number(Boolean(p.fullName.trim())) + Number(Boolean(p.relationship)), 0)
    : 0
  const relativeCompleted = answers.family_us === 'Sí'
    ? relatives.reduce((count, p) => count + Number(Boolean(p.fullName.trim())) +
        Number(Boolean(p.relationship)) + Number(Boolean(p.immigrationStatus)), 0)
    : 0
  const completed = baseCompleted + companionCompleted + relativeCompleted
  const totalRequired = allRequired.length + companionRequired + relativeRequired
  const percent = totalRequired ? Math.round((completed / totalRequired) * 100) : 0
  const dateIssues = [
    answers.passport_issued && answers.passport_expires && answers.passport_expires <= answers.passport_issued
      ? 'La fecha de vencimiento del pasaporte debe ser posterior a su expedición.' : '',
    answers.prior_visa_issue_date && answers.prior_visa_expiration_date && answers.prior_visa_expiration_date <= answers.prior_visa_issue_date
      ? 'La fecha de vencimiento de la visa debe ser posterior a su expedición.' : '',
    answers.previous_job_start && answers.previous_job_end && answers.previous_job_end < answers.previous_job_start
      ? 'La fecha de término del empleo anterior no puede ser anterior al inicio.' : '',
    answers.school_start && answers.school_end && answers.school_end < answers.school_start
      ? 'La fecha de término de estudios no puede ser anterior al inicio.' : '',
  ].filter(Boolean)
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
    setCompanions([])
    setRelatives([])
    setMode(selected?.serviceName === 'Visa TN' ? 'TN' : 'B1B2')
    if (!selected) setMode('TN')
    setStep(0)
  }

  function chooseMode(next: VisaMode) {
    setMode(next)
    setStep(0)
  }

  function change(key: string, value: string) {
    setAnswers((previous) => {
      const next = { ...previous, [key]: value }
      if (key === 'travel_payer' && previous.travel_payer !== value) {
        delete next.travel_payer_relationship
        delete next.travel_payer_person_name
        delete next.travel_payer_organization
      }
      // Purge values of follow-up questions that stop applying to this person.
      // This prevents stale answers from entering a future DS-160 mapping.
      for (let pass = 0; pass < 3; pass++) {
        for (const section of sections) {
          for (const field of section.fields) {
            if (!visibleField(field, next)) delete next[field.key]
          }
        }
      }
      return next
    })
    if (key === 'travel_with_someone' && value !== 'Sí') setCompanions([])
    if (key === 'family_us' && value !== 'Sí') setRelatives([])
  }

  function renderInput(field: DraftField) {
    const placeholder = field.placeholder ?? (field.inlinePrompt ? field.label : '')
    const displayPrompt = placeholder + (field.inlinePrompt && requiredField(field, answers) ? ' *' : '')
    const common = {
      id: field.key,
      name: field.key,
      value: answers[field.key] ?? '',
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        change(field.key, event.target.value),
      className: styles.input,
      'aria-required': requiredField(field, answers) || undefined,
    }
    if (field.type === 'textarea') {
      return <textarea {...common} rows={3} placeholder={displayPrompt} />
    }
    if (field.type === 'select') {
      const options = field.key === 'travel_payer_relationship'
        ? answers.travel_payer === 'Un familiar' ? familyPayerRelationships : otherPayerRelationships
        : field.options ?? []
      return (
        <select {...common}>
          <option value="">{field.inlinePrompt ? displayPrompt : 'Selecciona una respuesta'}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )
    }
    return (
      <input
        {...common} type={field.type} placeholder={displayPrompt}
        min={field.type === 'number' ? (field.key.includes('duration') ? 1 : 0) : undefined}
        step={field.type === 'number' ? 'any' : undefined}
        inputMode={field.type === 'number' ? 'decimal' : undefined}
      />
    )
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
              <span className={field.inlinePrompt ? styles.srOnly : undefined}>{field.label}{requiredField(field, answers) ? <b> *</b> : null}</span>
              {field.help ? <small>{field.help}</small> : null}
              {renderInput(field)}
            </label>
          ))}
          {current.id === 'travel' && answers.travel_with_someone === 'Sí' && (
            <PeopleEditor title="Personas que viajarán contigo" kind="companion" people={companions}
              onAdd={() => { const person = newPerson(); setCompanions((previous) => [...previous, person]) }}
              onRemove={(id) => setCompanions((previous) => previous.filter((p) => p.id !== id))}
              onChange={(id, key, value) => updatePerson(setCompanions, id, key, value)}
            />
          )}
          {current.id === 'family' && answers.family_us === 'Sí' && (
            <PeopleEditor title="Familiares que viven en Estados Unidos" kind="relative" people={relatives}
              onAdd={() => { const person = newPerson(); setRelatives((previous) => [...previous, person]) }}
              onRemove={(id) => setRelatives((previous) => previous.filter((p) => p.id !== id))}
              onChange={(id, key, value) => updatePerson(setRelatives, id, key, value)}
            />
          )}
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
          <p>{completed} de {totalRequired} datos esenciales completos.
            {reviewItems.length > 0 ? ` Hay ${reviewItems.length} respuestas que requieren revisión del equipo.` : ''}</p>
          {dateIssues.map((issue) => <p className={styles.validation} role="alert" key={issue}>{issue}</p>)}
        </div>
        <button type="button" className={styles.secondary} onClick={() => {
          setAnswers({ ...prefills(candidate) })
          setCompanions([])
          setRelatives([])
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

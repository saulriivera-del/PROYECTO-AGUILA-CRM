'use client'

import { useEffect, useRef, useState } from 'react'
import config from '@/lib/trade-in-motion-config.json'
import { sections, cleanAnswers, cleanPeople, countProgress, isRequired, isVisible, validateSubmission,
  type AnswerMap, type GroupedPeople, type Question, type Person } from '@/lib/trade-in-motion'

type SaveResult = { saved?: boolean; submitted?: boolean; error?: string; fields?: string[] }
const addressTitles: Record<string, string> = {
  home_street: 'Domicilio particular',
  employer_street: 'Trabajo actual',
  previous_employer_street: 'Trabajo anterior',
  school_street: 'Institución educativa',
  tn_employer_street: 'Empresa en Estados Unidos',
}

export default function CandidateForm() {
  const [identity, setIdentity] = useState('')
  const [folioInput, setFolioInput] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [authentication, setAuthentication] = useState<'checking' | 'guest' | 'verified'>('checking')
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [people, setPeople] = useState<GroupedPeople>({ companions: [], relatives: [] })
  const [sectionIndex, setSectionIndex] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Sin cambios pendientes')
  const [submitted, setSubmitted] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const revision = useRef(0)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    fetch('/api/formularios/trade-in-motion/folio',{cache:'no-store'})
      .then(r => { if (active) setAuthentication(r.ok ? 'verified' : 'guest') })
      .catch(() => { if (active) setAuthentication('guest') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (authentication !== 'verified') return
    let active = true
    fetch('/api/formularios/trade-in-motion/folio', { cache: 'no-store' })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Error al recuperar borrador')
        if (!active) return
        const stored = cleanAnswers(data.draft?.answers)
        setIdentity(data.name || 'Candidato')
        setAnswers(stored)
        setPeople(cleanPeople(data.draft?.people))
        setSubmitted(data.draft?.status === 'Enviado')
        setConsent(Boolean(data.draft?.consent_at))
        setSaveStatus(data.draft ? 'Último guardado: ' + new Date(data.draft.updated_at).toLocaleString('es-MX') : 'Sin cambios pendientes')
        setHydrated(true)
      }).catch((e: Error) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [authentication])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/formularios/trade-in-motion/folio',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({folio:folioInput,key:keyInput}),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'No se pudo iniciar sesión.')
      setIdentity(data.name || 'Candidato')
      setKeyInput('')
      setHydrated(false)
      setAuthentication('verified')
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de acceso.') }
    finally { setLoading(false) }
  }

  async function logout() {
    await fetch('/api/formularios/trade-in-motion/folio',{method:'DELETE'})
    setAuthentication('guest')
    setHydrated(false)
    setIdentity('')
    setAnswers({})
    setPeople({ companions: [], relatives: [] })
    setSubmitted(false)
    setDirty(false)
    setError('')
  }

  async function store(action: 'save' | 'submit'): Promise<SaveResult> {
    // Guardados secuenciales: una respuesta vieja nunca puede llegar después de una nueva.
    const snapshot = JSON.stringify({ action, answers, people, consent })
    const atRevision = revision.current
    setSaveStatus(action === 'save' ? 'Guardando…' : 'Enviando…')
    const previous = saveQueue.current
    let release: () => void = () => {}
    saveQueue.current = new Promise<void>(resolve => { release = resolve })
    await previous
    try {
      const response = await fetch('/api/formularios/trade-in-motion/folio/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: snapshot,
      })
      const data: SaveResult = await response.json()
      if (!response.ok) {
        setSaveStatus('Guardado no confirmado')
        setError(data.error ?? 'No se pudo guardar.')
        setMissing(data.fields ?? [])
        return data
      }
      if (revision.current === atRevision) setDirty(false)
      setSaveStatus(data.submitted ? 'Formulario enviado' : 'Guardado en línea correctamente')
      if (data.submitted) setSubmitted(true)
      return data
    } catch {
      setSaveStatus('Sin conexión: vuelve a intentar guardar')
      setError('No hay conexión con el servidor. Tus respuestas todavía no se confirmaron como guardadas.')
      return { error: 'Sin conexión' }
    } finally {
      release()
    }
  }

  useEffect(() => {
    if (!hydrated || !dirty || submitted) return
    const t = setTimeout(() => { void store('save') }, 2400)
    return () => clearTimeout(t)
  }, [answers, people, dirty, hydrated, submitted])

  function update(key: string, value: string) {
    revision.current += 1
    setAnswers(previous => {
      const next = { ...previous, [key]: value }
      for (let pass = 0; pass < 4; pass++)
        for (const section of sections)
          for (const field of section.fields)
            if (!isVisible(field, next)) delete next[field.key]
      return next
    })
    setDirty(true)
    setSaveStatus('Cambios pendientes…')
    setError('')
    setMissing([])
  }
  function updatePeople(kind: keyof GroupedPeople, index: number, key: keyof Person, value: string) {
    revision.current += 1
    setPeople(prev => ({ ...prev,
      [kind]: prev[kind].map((p, i) => i === index ? { ...p, [key]: value } : p),
    }))
    setDirty(true)
    setSaveStatus('Cambios pendientes…')
  }
  function addPerson(kind: keyof GroupedPeople) {
    revision.current += 1
    setPeople(prev => ({ ...prev,
      [kind]: [...prev[kind], { id: Date.now(), fullName: '', relationship: '', immigrationStatus: '' }],
    }))
    setDirty(true)
  }
  function removePerson(kind: keyof GroupedPeople, id: number) {
    revision.current += 1
    setPeople(prev => ({ ...prev, [kind]: prev[kind].filter(p => p.id !== id) }))
    setDirty(true)
  }
  function selectOptions(field: Question) {
    if (field.key === 'travel_payer_relationship') {
      return answers.travel_payer === 'Un familiar'
        ? config.familyPayerRelationships : config.otherPayerRelationships
    }
    return field.options ?? []
  }
  async function submit() {
    setError('')
    const checked = cleanAnswers(answers)
    const errors = validateSubmission(checked, people)
    if (errors.length) {
      setError('Faltan algunas respuestas para concluir el formulario.')
      setMissing(errors.slice(0, 18))
      return
    }
    if (!consent) {
      setError('Debes aceptar el aviso de privacidad antes de enviar.')
      return
    }
    setLoading(true)
    setDirty(false)
    const result = await store('submit')
    setLoading(false)
    if (result.error) setDirty(true)
  }
  const progress = countProgress(answers, people)
  const current = sections[sectionIndex]

  function peopleEditor(kind: keyof GroupedPeople) {
    const isCompanion = kind === 'companions'
    const title = isCompanion ? 'Acompañantes de viaje' : 'Familiares en Estados Unidos'
    const relations = isCompanion ? config.companionRelationships : config.relativeRelationships
    return <div className="tn-label wide" key={kind}>
      <strong>{title}</strong>
      {people[kind].map((person, index) => <div className="tn-person" key={person.id}>
        <div className="tn-person-head">
          <strong>Persona {index + 1}</strong>
          <button className="tn-button ghost" type="button" onClick={() => removePerson(kind, person.id)}>Quitar</button>
        </div>
        <div className="tn-person-fields">
          <label className="tn-label">Nombre completo *
            <input className="tn-input" value={person.fullName} onChange={e => updatePeople(kind, index, 'fullName', e.target.value)} />
          </label>
          <label className="tn-label">Parentesco o relación *
            <select className="tn-input" value={person.relationship} onChange={e => updatePeople(kind, index, 'relationship', e.target.value)}>
              <option value="">Selecciona una respuesta</option>
              {relations.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>
          {!isCompanion ? <label className="tn-label">Situación migratoria en EE. UU. *
            <select className="tn-input" value={person.immigrationStatus ?? ''} onChange={e => updatePeople(kind, index, 'immigrationStatus', e.target.value)}>
              <option value="">Selecciona una respuesta</option>
              {config.immigrationStatuses.map(r => <option key={r}>{r}</option>)}
            </select>
          </label> : null}
        </div>
      </div>)}
      <button className="tn-button secondary" type="button" onClick={() => addPerson(kind)}>+ Agregar {isCompanion ? 'acompañante' : 'familiar'}</button>
    </div>
  }
  function fieldEditor(field: Question) {
    const required = isRequired(field, answers)
    const label = field.label + (required ? ' *' : '')
    const value = answers[field.key] ?? ''
    const fieldProps = {
      className: 'tn-input', value, name: field.key,
      'aria-label': field.label,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(field.key, e.target.value),
    }
    return <div key={field.key} className={field.type === 'textarea' ? 'tn-label wide' : 'tn-label'}>
      <label htmlFor={'tn-' + field.key}>{label}</label>
      {field.help ? <small>{field.help}</small> : null}
      {field.type === 'select'
        ? <select id={'tn-' + field.key} {...fieldProps}>
            <option value="">Selecciona una respuesta</option>
            {selectOptions(field).map(choice => <option key={choice} value={choice}>{choice}</option>)}
          </select>
        : field.type === 'textarea'
          ? <textarea id={'tn-' + field.key} {...fieldProps} rows={3} />
          : <input id={'tn-' + field.key} {...fieldProps}
              type={field.type === 'number' ? 'number' : field.type}
              placeholder={field.placeholder || ''} />}
    </div>
  }

  return <main className="tn-shell">
    <header className="tn-header">
      <div><strong>Visa Master</strong><small>Simplificamos tu trámite de visa</small></div>
      <span className="tn-partner">TRADE IN MOTION · CANDIDATOS</span>
    </header>
    <div className="tn-container">
      <div className="tn-intro">
        <span className="tn-eyebrow">Cuestionario de información para visa TN</span>
        <h1>Prepara tu información para el formulario DS-160</h1>
        <p>Responde con tus datos reales, como aparecen en tus documentos. Tus respuestas se guardan y podrás regresar con tu folio y clave. Visa Master revisará tus respuestas antes de preparar la solicitud oficial.</p>
      </div>
      {authentication === 'checking' ? <section className="tn-card tn-login"><p>Verificando acceso seguro…</p></section> : null}
      {authentication === 'guest' ? <section className="tn-card tn-login">
        <span className="tn-eyebrow">Acceso personal</span>
        <h2>Ingresa tu folio y clave</h2>
        <p className="tn-muted">Visa Master te proporciona estos datos. No necesitas recibir un correo para entrar y podrás continuar desde otro dispositivo.</p>
        {error ? <div className="tn-error" role="alert">{error}</div> : null}
        <form onSubmit={login}>
          <label className="tn-label">Folio del candidato *
            <input className="tn-input" required autoCapitalize="characters" value={folioInput} onChange={e => setFolioInput(e.target.value)} placeholder="VM-XXXXXXXXXXXX"/>
          </label>
          <label className="tn-label">Clave de acceso *
            <input className="tn-input" type="password" required autoComplete="off" value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="Clave entregada por Visa Master"/>
          </label>
          <button className="tn-button" type="submit" disabled={loading}>{loading ? 'Verificando…' : 'Entrar al formulario'}</button>
        </form>
      </section> : null}
      {authentication === 'verified' ? <div>
        <div className="tn-status">Candidato: <strong>{identity}</strong> · <button className="tn-button ghost" type="button" onClick={logout}>Cambiar cuenta</button></div>
        {!hydrated ? <section className="tn-card"><p>{error || 'Cargando tus respuestas guardadas…'}</p></section>
          : submitted ? <section className="tn-card tn-done">
              <span className="tn-eyebrow">Respuestas recibidas</span>
              <h2>¡Tu formulario fue enviado correctamente!</h2>
              <p>Visa Master ya puede revisar tu información en Proyecto Águila. Si necesitas corregir algo después del envío, comunícate con nuestro equipo.</p>
              <p><a href="https://wa.me/526623499696" target="_blank" rel="noreferrer">Contactar a Visa Master</a></p>
            </section>
          : !consent ? <section className="tn-card tn-login">
              <span className="tn-eyebrow">Protección de tu información</span>
              <h2>Antes de empezar</h2>
              <p className="tn-muted">Tu información se guardará de forma privada en Visa Master y será utilizada para preparar y revisar tu trámite. Puedes retomar tus respuestas con el mismo folio y clave.</p>
              <label className="tn-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                <span>He leído el <a href="https://visamaster.com.mx/avisodeprivacidad/" target="_blank" rel="noreferrer">aviso de privacidad</a> y autorizo el tratamiento de mis datos para preparar mi solicitud. Sé que esta captura no equivale al envío del DS-160 oficial ni garantiza una visa.</span>
              </label>
              <p className="tn-muted">Marca la casilla para acceder al cuestionario.</p>
            </section>
          : <div className="tn-split">
              <aside className="tn-card tn-sidebar">
                <strong>Tu progreso</strong>
                <div className="tn-progress-label"><span>Campos obligatorios</span><span>{progress}%</span></div>
                <div className="tn-track"><div style={{ width: progress + '%' }} /></div>
                <nav className="tn-nav" aria-label="Secciones">
                  {sections.map((section, index) => <button type="button" key={section.id}
                    aria-current={index === sectionIndex ? 'step' : undefined}
                    onClick={() => setSectionIndex(index)}>{index + 1}. {section.title}</button>)}
                </nav>
                <p className="tn-muted">Tu información se guarda en línea al completar o cambiar una respuesta.</p>
              </aside>
              <section className="tn-card">
                <div className="tn-section-header">
                  <span className="tn-eyebrow">Sección {sectionIndex + 1} de {sections.length}</span>
                  <h2>{current.title}</h2>
                  <p>{current.description}</p>
                </div>
                <div className="tn-fields">
                  {current.fields.filter(f => isVisible(f, answers)).map(field => <div key={field.key} style={{ display: 'contents' }}>
                    {field.key === 'social_media_used' ? <div className="tn-label wide" role="note" style={{ gridColumn: '1 / -1', borderLeft: '3px solid #bd8a39', paddingLeft: 12, margin: '14px 0' }}>
                      <strong style={{ display: 'block', marginBottom: 5 }}>AVISO IMPORTANTE · REDES SOCIALES (VISAS TN Y TD)</strong>
                      <p style={{ margin: '0 0 7px', lineHeight: 1.5 }}>Desde el 1 de octubre de 2026, el Departamento de Estado de EE. UU. indica que quienes solicitan visas TN o TD deben configurar <strong>todos sus perfiles de redes sociales como públicos o abiertos</strong> para facilitar la revisión consular. Declara las cuentas utilizadas en los últimos cinco años, incluidas las inactivas, e informa todos tus usuarios; <strong>nunca compartas contraseñas</strong>.</p>
                      <a href="https://travel.state.gov/en/newsroom/visas/2026/announcement-of-expanded-screening-and-vetting-for-visa-applicants.html" target="_blank" rel="noopener noreferrer">Consultar aviso oficial del Departamento de Estado</a>
                    </div> : null}
                    {addressTitles[field.key] ? <div className="tn-address">Dirección · {addressTitles[field.key]}</div> : null}
                    {fieldEditor(field)}
                  </div>)}
                  {current.id === 'travel' && answers.travel_with_someone === 'Sí' ? peopleEditor('companions') : null}
                  {current.id === 'family' && answers.family_us === 'Sí' ? peopleEditor('relatives') : null}
                </div>
                {sectionIndex === sections.length - 1 ? <p className="tn-note">Aceptaste el aviso de privacidad al comenzar. Verifica tus respuestas antes de enviarlas.</p> : null}
                {error ? <div className="tn-error" role="alert"><strong>{error}</strong>
                  {missing.length ? <ul>{missing.map(m => <li key={m}>{m}</li>)}</ul> : null}
                </div> : null}
                <div className="tn-actions">
                  <div className="tn-actions-side">
                    <button className="tn-button secondary" type="button" onClick={() => setSectionIndex(s => Math.max(0, s - 1))} disabled={sectionIndex === 0}>Anterior</button>
                    {sectionIndex < sections.length - 1
                      ? <button className="tn-button" type="button" onClick={() => setSectionIndex(s => Math.min(sections.length - 1, s + 1))}>Siguiente sección</button>
                      : <button className="tn-button" type="button" disabled={loading} onClick={submit}>{loading ? 'Enviando…' : 'Enviar formulario a Visa Master'}</button>}
                  </div>
                  <button className="tn-button secondary" type="button" onClick={() => { setError(''); void store('save') }}>Guardar ahora</button>
                </div>
                <p className="tn-note" aria-live="polite">{saveStatus} · Los campos marcados con * son esenciales.</p>
              </section>
            </div>}
      </div> : null}
    </div>
    <footer className="tn-footer">Visa Master · Hermosillo, Sonora · <a href="https://visamaster.com.mx/avisodeprivacidad/" target="_blank" rel="noreferrer">Aviso de privacidad</a></footer>
  </main>
}

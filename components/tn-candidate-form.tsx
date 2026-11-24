'use client'

import { useEffect, useRef, useState } from 'react'
import config from '@/lib/trade-in-motion-config.json'
import { sugerirCurp, formatoCurp, nombresDesdeNombreCompleto, curpConfirmadaParaAvanzar } from '@/lib/curp-sugerida'
import { birthCountryOptions, isValidBirthCountry, birthCountryMatchesState } from '@/lib/birth-countries'
import { sections, cleanAnswers, cleanPeople, countProgress, isRequired, isVisible, validateSubmission,
  getSelectedSocialPlatforms, type AnswerMap, type GroupedPeople, type Question, type Person } from '@/lib/trade-in-motion'

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
        setAnswers({ ...stored, nationality: stored.nationality || 'Mexicana', birth_country: stored.birth_country || 'MX' })
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
      if (['full_name','curp_paterno','curp_materno','curp_sexo','birth_date','birth_state','birth_country'].includes(key)) { delete next.curp_valor; delete next.curp_confirmada }
      if (key === 'curp_valor') delete next.curp_confirmada
      if (key === 'birth_country') delete next.birth_country_nonmexico_confirmed
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
  function confirmarCurp(valor: string, estado: string) {
    const curp = valor.trim().toUpperCase()
    if (!formatoCurp(curp)) {
      setError('Antes de confirmar, revisa que tu CURP tenga 18 caracteres y el formato correcto. Puedes corregirla en el campo de arriba.')
      setMissing([])
      return
    }
    revision.current += 1
    setAnswers(prev => ({...prev, curp_valor: curp, curp_confirmada: estado}))
    setDirty(true); setSaveStatus('Cambios pendientes…'); setError(''); setMissing([])
  }

  function irASeccion(destino: number) {
    const index = Math.max(0, Math.min(sections.length - 1, destino))
    if (index > 0 && !isValidBirthCountry(answers.birth_country || '')) {
      setSectionIndex(0)
      setError('Selecciona el país de nacimiento de la lista antes de continuar.')
      setMissing([])
      return
    }
    if (index > 0 && answers.birth_country !== 'MX' &&
        answers.birth_country_nonmexico_confirmed !== 'Sí, confirmo que nací fuera de México') {
      setSectionIndex(0)
      setError('Elegiste un país de nacimiento distinto de México. Confírmalo para continuar.')
      setMissing([])
      return
    }
    if (index > 0 && !birthCountryMatchesState(answers.birth_country || '', answers.birth_state || '')) {
      setSectionIndex(0)
      setError('Revisa el país y el estado de nacimiento: deben corresponder entre sí.')
      setMissing([])
      return
    }
    if (index > 0 && !curpConfirmadaParaAvanzar(answers)) {
      setSectionIndex(0)
      setError('Para continuar, revisa tu CURP y pulsa «Confirmo que esta CURP coincide con mi documento oficial».')
      setMissing([])
      return
    }
    setError(''); setMissing([])
    setSectionIndex(index)
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
    if (!curpConfirmadaParaAvanzar(answers)) {
      irASeccion(0)
      setError('Confirma tu CURP con tu documento oficial antes de enviar el formulario.')
      return
    }
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
  const curpSugerida = sugerirCurp({nombres:nombresDesdeNombreCompleto(answers.full_name || '', answers.curp_paterno || '', answers.curp_materno || ''),paterno:answers.curp_paterno,materno:answers.curp_materno,fecha:answers.birth_date,sexo:answers.curp_sexo,entidad:answers.birth_state})
  // Mostrar la sugerencia dentro del campo sin guardarla hasta la confirmación.
  // Respetar incluso una edición manual vacía: nunca sobreescribir lo escrito por el usuario.
  const curpValorVisible = answers.curp_valor ?? (curpSugerida || '')
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
    if (field.key === 'curp_valor' || field.key === 'curp_confirmada' || field.key === 'birth_country_nonmexico_confirmed') return null
    const required = isRequired(field, answers)
    const label = field.label + (required ? ' *' : '')
    const value = answers[field.key] ?? ''
    if (field.key === 'birth_country') {
      const isForeign = isValidBirthCountry(value) && value !== 'MX'
      const acknowledgement = 'Sí, confirmo que nací fuera de México'
      return <div className="tn-label wide" key={field.key} style={{gridColumn:'1 / -1'}}>
        <label htmlFor="tn-birth-country">{label}</label>
        <small>Selecciona el país en la lista completa. México aparece al principio para evitar errores de captura.</small>
        <select id="tn-birth-country" className="tn-input" name="birth_country" value={isValidBirthCountry(value) ? value : ''}
          onChange={e => update('birth_country', e.target.value)}>
          <option value="">Selecciona el país donde naciste</option>
          <optgroup label="México">
            <option value="MX">México</option>
          </optgroup>
          <optgroup label="Otros países y territorios">
            {birthCountryOptions.filter(item=>item.code!=='MX').map(item=><option value={item.code} key={item.code}>{item.name}</option>)}
          </optgroup>
        </select>
        {value && !isValidBirthCountry(value) ? <p role="alert" style={{color:'#925217'}}>El valor anterior del país no coincide con la lista. Selecciona de nuevo tu país de nacimiento.</p> : null}
        {isForeign ? <div role="alert" style={{border:'1px solid #e8cda2',borderLeft:'4px solid #bd8428',background:'#fff9eb',borderRadius:8,padding:12,marginTop:10}}>
          <strong>¿Estás seguro de tu selección?</strong>
          <p style={{margin:'6px 0'}}>Elegiste un país de nacimiento distinto de México. Verifica tus documentos; este dato se usará para preparar el DS-160.</p>
          {answers.birth_state !== 'Fuera de México / otro estado o provincia' ?
            <p style={{fontWeight:600}}>Revisa también «Estado / provincia donde naciste» y elige «Fuera de México / otro estado o provincia».</p> : null}
          <label style={{display:'flex',gap:8,alignItems:'flex-start'}}>
            <input type="checkbox"
              checked={answers.birth_country_nonmexico_confirmed===acknowledgement}
              onChange={e=>update('birth_country_nonmexico_confirmed',e.target.checked ? acknowledgement : '')}/>
            <span>Confirmo que mi país de nacimiento no es México y que seleccioné el país correcto.</span>
          </label>
        </div> : null}
      </div>
    }
    if (field.type === 'multiselect') {
      const selected = getSelectedSocialPlatforms(value)
      const options = field.options ?? []
      return <fieldset className="tn-label wide" key={field.key} style={{ border: '1px solid #d6e3ef', padding: 14, borderRadius: 10, minWidth: 0 }}>
        <legend style={{ padding: '0 7px', fontWeight: 700 }}>{label}</legend>
        {field.help ? <small style={{ display: 'block', marginBottom: 10 }}>{field.help}</small> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
          {options.map(option => <label key={option} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: 11, border: '1px solid #dae4ef', borderRadius: 9, cursor: 'pointer', background: selected.includes(option) ? '#eaf3fc' : '#fff', fontWeight: selected.includes(option) ? 700 : 500 }}>
            <input type="checkbox" name={field.key} value={option} checked={selected.includes(option)}
              onChange={e => {
                const next = option === 'Ninguna'
                  ? (e.target.checked ? ['Ninguna'] : [])
                  : (e.target.checked
                      ? [...selected.filter(v => v !== 'Ninguna'), option]
                      : selected.filter(v => v !== option))
                update(field.key, next.join('|'))
              }}
              style={{ width: 17, height: 17, flexShrink: 0, accentColor: '#195b9e' }} />
            {option}
          </label>)}
        </div>
      </fieldset>
    }
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
                    onClick={() => irASeccion(index)}>{index + 1}. {section.title}</button>)}
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
                    {field.key === 'birth_country' ? <div className="tn-label wide" style={{gridColumn:'1 / -1',border:'1px solid #c8d9e8',padding:16,borderRadius:10,background:'#f6faff'}}>
                      <strong>Confirma tu CURP</strong>
                      <p>Visa Master sugiere tu CURP automáticamente con los datos capturados. Verifícala con tu constancia oficial: no es una consulta a RENAPO.</p>
                      <label htmlFor="tn-curp-autocompletada">CURP (puedes corregirla aquí si no coincide)</label>
                      <input id="tn-curp-autocompletada" className="tn-input" maxLength={18} aria-label="CURP sugerida o corregida" value={curpValorVisible} onChange={e=>update('curp_valor',e.target.value.toUpperCase())}/>
                      {!curpSugerida && !answers.curp_valor ? <p role="status">Si no se genera, revisa tus nombres, apellidos, sexo, fecha y estado de nacimiento, o escribe la CURP de tu constancia.</p> : null}
                      <button className="tn-button secondary" style={{marginTop:8}} type="button"
                        onClick={()=>confirmarCurp(curpValorVisible,curpValorVisible===curpSugerida?'Sí, coincide con mi documento':'No, la corregí con mi documento')}>
                        Confirmo que esta CURP coincide con mi documento oficial
                      </button>
                      <p aria-live="polite">{answers.curp_confirmada ? 'CURP confirmada. Si necesitas corregirla, edita el campo y vuelve a confirmar.' : 'Pendiente de confirmación. Águila no usará una CURP sugerida sin verificar.'}</p>
                    </div> : null}
                    {field.key === 'social_media_public' && answers.social_media_public === 'Aún no, tengo perfiles privados' ? <div className="tn-label wide" role="alert" style={{ gridColumn: '1 / -1', border: '1px solid #e6c694', borderLeft: '4px solid #b57920', background: '#fff9ec', padding: 15, borderRadius: 9, lineHeight: 1.55, color: '#67481c' }}>
                      <strong>IMPORTANTE · ANTES DE TU CITA EN EL CAS</strong>
                      <p style={{ margin: '7px 0 0' }}>Para tu trámite de visa TN/TD, configura <strong>todas tus redes sociales como públicas o abiertas antes de tu cita en el CAS</strong> y mantenlas así durante la revisión consular. Visa Master recomienda hacerlo antes del CAS para llegar preparado; el Departamento de Estado pide perfiles públicos o abiertos, sin establecer específicamente el CAS como fecha límite.</p>
                    </div> : null}
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
                    <button className="tn-button secondary" type="button" onClick={() => irASeccion(sectionIndex - 1)} disabled={sectionIndex === 0}>Anterior</button>
                    {sectionIndex < sections.length - 1
                      ? <button className="tn-button" type="button" onClick={() => irASeccion(sectionIndex + 1)}>Siguiente sección</button>
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

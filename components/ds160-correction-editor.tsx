'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  sections, isVisible, isRequired, getSelectedSocialPlatforms, validateSubmission,
  type AnswerMap, type GroupedPeople, type Person, type Question,
} from '@/lib/trade-in-motion'
import { saveDs160Correction } from '@/app/admin/formularios/trade-in-motion/[id]/corrections'

type Group = 'companions' | 'relatives'
const inputStyle = { width: '100%', maxWidth: 620, border: '1px solid #bfd0df', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', color: '#163a62' }
const initialPerson = (): Person => ({ id: 0, fullName: '', relationship: '', immigrationStatus: '' })

export default function Ds160CorrectionEditor({
  draftId, originalAnswers, initialAnswers, initialPeople, initialVersion,
}: {
  draftId: string; originalAnswers: AnswerMap; initialAnswers: AnswerMap;
  initialPeople: GroupedPeople; initialVersion: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [sectionId, setSectionId] = useState(sections[0].id)
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers)
  const [people, setPeople] = useState<GroupedPeople>(initialPeople)
  const [version, setVersion] = useState(initialVersion)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [problem, setProblem] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const section = sections.find(s => s.id === sectionId) ?? sections[0]
  const issues = validateSubmission(answers, people)
  const changed = new Set(Object.keys({ ...originalAnswers, ...answers })
    .filter(key => originalAnswers[key] !== answers[key]))

  const setValue = (key: string, value: string) =>
    setAnswers(prev => ({ ...prev, [key]: value }))
  const setSocial = (value: string, checked: boolean) => {
    const current = getSelectedSocialPlatforms(answers.social_media_used ?? '')
    const next = checked ? [...current.filter(p => p !== 'Ninguna' && value !== 'Ninguna'), value] : current.filter(p => p !== value)
    setValue('social_media_used', value === 'Ninguna' && checked ? 'Ninguna' : [...new Set(next)].join('|'))
  }
  const setPerson = (group: Group, index: number, field: keyof Person, value: string) =>
    setPeople(prev => ({ ...prev, [group]: prev[group].map((p,i) => i===index ? { ...p, [field]: value } : p) }))
  const addPerson = (group: Group) =>
    setPeople(prev => ({ ...prev, [group]: prev[group].length >= 20 ? prev[group] : [...prev[group], { ...initialPerson(), id: prev[group].length+1 }] }))
  const removePerson = (group: Group, index: number) =>
    setPeople(prev => ({ ...prev, [group]: prev[group].filter((_,i) => i!==index).map((p,i)=> ({...p,id:i+1})) }))
  const renderQuestion = (f: Question) => {
    const value = answers[f.key] ?? ''
    if (f.type === 'multiselect' && f.key === 'social_media_used') {
      return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {(f.options ?? []).map(option => <label key={option} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={getSelectedSocialPlatforms(value).includes(option)} onChange={e => setSocial(option,e.target.checked)} />
          {option}
        </label>)}
      </div>
    }
    if (f.type === 'select') return <select style={inputStyle} value={value} onChange={e => setValue(f.key,e.target.value)}>
      <option value="">Seleccionar...</option>
      {(f.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}
    </select>
    if (f.type === 'textarea') return <textarea style={{ ...inputStyle, minHeight: 90 }} value={value} maxLength={4000} onChange={e => setValue(f.key,e.target.value)} />
    return <input style={inputStyle} type={['date','email','number'].includes(f.type) ? f.type : 'text'}
      value={value} maxLength={500} onChange={e => setValue(f.key,e.target.value)} placeholder={f.placeholder ?? ''} />
  }

  const save = async () => {
    setProblem(''); setMessage('')
    if (reason.trim().length < 3) {
      setProblem('Indica brevemente por qué se hizo la corrección.')
      return
    }
    setPending(true)
    try {
      const result = await saveDs160Correction(draftId,version,answers,people,reason)
      if (!result.ok) {
        setProblem(result.error ?? 'No se pudo guardar.')
        return
      }
      setVersion(result.version ?? version)
      setWarnings(result.warnings ?? [])
      setReason('')
      setEditing(false)
      setMessage('Correcciones guardadas. Se conservó la captura original y quedó registrada la edición.')
      router.refresh()
    } catch {
      setProblem('No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setPending(false)
    }
  }

  const peopleEditor = (group: Group, title: string) => <div style={{ border: '1px solid #dbe6f0', padding: 14, borderRadius: 9, marginTop: 14 }}>
    <h3 style={{ marginTop: 0, fontSize: 15 }}>{title}</h3>
    {people[group].map((person,index) => <div key={index} style={{ display: 'grid', gap: 9, borderTop: '1px solid #dbe6f0', paddingTop: 12, marginTop: 12 }}>
      <label>Nombre completo<input style={inputStyle} value={person.fullName} onChange={e=>setPerson(group,index,'fullName',e.target.value)}/></label>
      <label>Parentesco o relación<input style={inputStyle} value={person.relationship} onChange={e=>setPerson(group,index,'relationship',e.target.value)}/></label>
      {group === 'relatives' && <label>Situación migratoria<input style={inputStyle} value={person.immigrationStatus ?? ''} onChange={e=>setPerson(group,index,'immigrationStatus',e.target.value)}/></label>}
      <button type="button" className="secondary-button" style={{justifySelf:'start'}} onClick={()=>removePerson(group,index)}>Quitar persona</button>
    </div>)}
    <button type="button" className="secondary-button" style={{ marginTop: 12 }} onClick={()=>addPerson(group)}>Agregar persona</button>
  </div>

  return <section style={{ background: '#fff', border: '1px solid #d8e4f0', borderRadius: 14, padding: 20, margin: '22px 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <div>
        <h2 style={{ margin: '0 0 6px' }}>Revisar y corregir formulario</h2>
        <p style={{ color: '#597188', fontSize: 13, margin: 0 }}>
          Puedes corregir cualquier sección sin pedir al cliente que vuelva a capturar. La respuesta original queda intacta.
        </p>
      </div>
      <button type="button" className="primary-button" onClick={() => { setEditing(v=>!v); setProblem(''); setMessage('') }}>
        {editing ? 'Cerrar edición' : 'Editar respuestas'}
      </button>
    </div>
    {initialVersion > 0 && <p style={{ fontSize: 13, color: '#235e85' }}>Este expediente tiene correcciones guardadas. Versión {version}.</p>}
    {message && <p role="status" style={{ color: '#21643f', marginTop: 12 }}>{message}</p>}
    {warnings.length > 0 && <p role="status" style={{ color: '#8a551a' }}>Aún hay {warnings.length} observaciones de validación; no está listo para aprobación.</p>}
    {editing && <>
      <p style={{ background: '#f1f7fc', padding: 12, borderRadius: 9, fontSize: 13, marginTop: 18 }}>
        Estás editando la copia operativa que utilizará la futura automatización. No se enviará ninguna solicitud a CEAC.
        {issues.length ? ' Hay ' + issues.length + ' observaciones por revisar.' : ' La validación básica de campos no detecta faltantes.'}
      </p>
      <nav aria-label="Secciones del formulario para corregir" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        {sections.map(s=><button type="button" key={s.id} onClick={()=>setSectionId(s.id)}
          aria-pressed={sectionId===s.id} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #bcd0e2', background: sectionId===s.id ? '#205f95' : '#f7faff', color:sectionId===s.id?'white':'#285b86', cursor:'pointer' }}>{s.title}</button>)}
      </nav>
      <h3 style={{ marginTop: 10 }}>{section.title}</h3>
      <div style={{ display: 'grid', gap: 16 }}>
        {section.fields.filter(f => isVisible(f,answers)).map(f=><label key={f.key} style={{ display: 'grid', gap: 6, borderBottom: '1px solid #edf2f6', paddingBottom: 12 }}>
          <span style={{ fontWeight: 650, color: '#294f73' }}>{f.label}{isRequired(f,answers) ? ' *' : ''}{changed.has(f.key) ? ' · Modificado' : ''}</span>
          {f.help && <small style={{ color: '#667f92' }}>{f.help}</small>}
          {renderQuestion(f)}
        </label>)}
      </div>
      {section.id === 'travel' && answers.travel_with_someone === 'Sí' && peopleEditor('companions','Acompañantes de viaje')}
      {section.id === 'family' && answers.family_us === 'Sí' && peopleEditor('relatives','Familiares en Estados Unidos')}
      <div style={{ marginTop: 20, borderTop: '1px solid #d9e4ee', paddingTop: 16 }}>
        <label style={{ display:'grid', gap:6, fontWeight: 650 }}>Motivo de la corrección
          <textarea value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} style={{...inputStyle,minHeight:70}}
          placeholder="Ejemplo: Se corrigió el apellido según pasaporte." />
        </label>
        <p style={{ fontSize: 12, color: '#678096' }}>Quedará guardado quién corrigió, cuándo y cuáles eran las respuestas anteriores.</p>
        {problem && <p role="alert" style={{ color: '#a52a35' }}>{problem}</p>}
        <div style={{ display:'flex', gap: 10, flexWrap:'wrap' }}>
          <button type="button" className="primary-button" onClick={save} disabled={pending}>{pending ? 'Guardando...' : 'Guardar correcciones'}</button>
          <button type="button" className="secondary-button" onClick={()=>{setEditing(false);setAnswers(initialAnswers);setPeople(initialPeople);setReason('');setProblem('')}} disabled={pending}>Cancelar</button>
        </div>
      </div>
    </>}
  </section>
}

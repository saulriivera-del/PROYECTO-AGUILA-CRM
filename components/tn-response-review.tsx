'use client'
import { useMemo, useState } from 'react'
import { sections, isVisible, type AnswerMap, type GroupedPeople } from '@/lib/trade-in-motion'

export default function TnResponseReview({ answers, people }: { answers: AnswerMap; people: GroupedPeople }) {
  const [active, setActive] = useState(sections[0].id)
  const [query, setQuery] = useState('')
  const [unanswered, setUnanswered] = useState(false)
  const selected = sections.find(s => s.id === active) ?? sections[0]
  const visible = useMemo(() => selected.fields
    .filter(field => isVisible(field, answers))
    .filter(field => unanswered || !!answers[field.key])
    .filter(field => !query.trim() || (field.label + ' ' + (answers[field.key] || '')).toLowerCase().includes(query.toLowerCase().trim())),
  [selected, answers, unanswered, query])
  const counts = (id: string) => {
    const fields = sections.find(s => s.id === id)?.fields.filter(f => isVisible(f, answers)) ?? []
    return fields.filter(f => !!answers[f.key]).length + '/' + fields.length
  }

  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 14 }}>
    <div style={{ background: 'white', border: '1px solid #dce5ee', borderRadius: 14, padding: 16 }}>
      <p style={{ fontSize: 13, color: '#627a91' }}>Secciones del cuestionario · selecciona una para ver las respuestas</p>
      <nav aria-label="Secciones del DS-160" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {sections.map(section => <button type="button" key={section.id}
          aria-pressed={section.id === active}
          onClick={() => setActive(section.id)}
          style={{
            padding: '9px 13px', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, border: '1px solid #c8d7e5',
            background: section.id === active ? '#175894' : '#f7faff',
            color: section.id === active ? 'white' : '#325d87',
            fontWeight: section.id === active ? 800 : 500,
          }}>{section.title} ({counts(section.id)})</button>)}
      </nav>
    </div>
    <div style={{ background: 'white', border: '1px solid #dce5ee', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 20 }}>
        <div><small style={{ color: '#6081a3' }}>RESPUESTAS · {selected.title.toUpperCase()}</small><h2 style={{ margin: '7px 0' }}>{selected.title}</h2></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input aria-label="Buscar entre preguntas" placeholder="Buscar pregunta o respuesta" value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ border: '1px solid #c8d7e5', borderRadius: 8, padding: 9, minWidth: 210 }} />
          <label style={{ fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}>
            <input type="checkbox" checked={unanswered} onChange={e => setUnanswered(e.target.checked)} />
            Mostrar sin responder
          </label>
          <button type="button" className="secondary-button" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {visible.map((field, index) => <div key={field.key} style={{
          border: '1px solid #dbe6f0', padding: '15px 17px', borderRadius: 10,
          background: !answers[field.key] ? '#fafbfc' : '#fff',
        }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#2d4864', margin: 0 }}>{index + 1}. {field.label}</p>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: answers[field.key] ? '#163a62' : '#95a5b3',
            whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{answers[field.key] || 'Sin respuesta'}</p>
        </div>)}
        {selected.id === 'travel' && people.companions.length ? people.companions.map((p,i) => <div key={i} style={{ border: '1px solid #dbe6f0', padding: 15, borderRadius: 10 }}>
          <strong>Acompañante {i + 1}</strong>
          <p>Nombre: {p.fullName || 'Sin respuesta'}</p><p>Relación: {p.relationship || 'Sin respuesta'}</p>
        </div>) : null}
        {selected.id === 'family' && people.relatives.length ? people.relatives.map((p,i) => <div key={i} style={{ border: '1px solid #dbe6f0', padding: 15, borderRadius: 10 }}>
          <strong>Familiar en EE. UU. {i + 1}</strong><p>Nombre: {p.fullName || 'Sin respuesta'}</p>
          <p>Relación: {p.relationship || 'Sin respuesta'}</p>
          <p>Situación migratoria: {p.immigrationStatus || 'Sin respuesta'}</p>
        </div>) : null}
        {!visible.length ? <div style={{ padding: 20, color: '#61778c' }}>No hay respuestas que coincidan con esta búsqueda.</div> : null}
      </div>
    </div>
  </div>
}

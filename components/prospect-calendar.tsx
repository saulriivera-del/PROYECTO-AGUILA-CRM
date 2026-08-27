'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { hermosilloDateKey, hermosilloTodayKey } from '@/lib/hermosillo'

type ProspectItem = {
  id: string
  full_name: string
  phone: string | null
  service_interest: string
  temperature: string
  next_followup_at: string | null
  internal_appointment_at: string | null
  last_followup_at: string | null
}

function localDateKey(value: string | null) { return value ? hermosilloDateKey(value) : null }

export default function ProspectCalendar({ prospects }: { prospects: ProspectItem[] }) {
  const todayKey = hermosilloTodayKey()
  const [yearPart, monthPart] = todayKey.split('-').map(Number)
  const [cursor, setCursor] = useState(new Date(yearPart, monthPart - 1, 1))
  const [selected, setSelected] = useState(todayKey)
  const year = cursor.getFullYear(); const month = cursor.getMonth()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(cursor)

  const grouped = useMemo(() => {
    const map: Record<string, ProspectItem[]> = {}
    prospects.forEach((p) => {
      const key = localDateKey(p.next_followup_at || p.internal_appointment_at)
      if (!key) return
      ;(map[key] ||= []).push(p)
    })
    return map
  }, [prospects])
  const selectedItems = grouped[selected] || []

  return (
    <section className="prospect-calendar-layout">
      <article className="panel-card prospect-calendar-panel">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => setCursor(new Date(year, month-1, 1))}>←</button>
          <h3>{monthLabel}</h3>
          <button type="button" onClick={() => setCursor(new Date(year, month+1, 1))}>→</button>
        </div>
        <div className="calendar-weekdays">{['L','M','M','J','V','S','D'].map((d,i)=><span key={i}>{d}</span>)}</div>
        <div className="calendar-grid prospect-calendar-grid">
          {Array.from({length:firstWeekday}).map((_,i)=><span className="calendar-blank" key={`b${i}`} />)}
          {Array.from({length:days}).map((_,i)=>{
            const day=i+1
            const key=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const count=grouped[key]?.length||0
            return <button type="button" key={key} className={`calendar-day ${selected===key?'selected':''} ${count?'has-events':''}`} onClick={()=>setSelected(key)}><span>{day}</span>{count?<strong>{count}</strong>:null}</button>
          })}
        </div>
      </article>
      <article className="panel-card prospect-day-panel">
        <div className="panel-heading"><div><span className="eyebrow">Agenda comercial</span><h3>{new Intl.DateTimeFormat('es-MX',{dateStyle:'long'}).format(new Date(`${selected}T12:00:00-07:00`))}</h3></div><strong>{selectedItems.length}</strong></div>
        <div className="prospect-day-list">
          {selectedItems.map(p=><Link href={`/admin/prospectos/${p.id}`} key={p.id} className="prospect-day-item"><div><strong>{p.full_name}</strong><small>{p.service_interest} · {p.temperature}</small></div><span>Abrir →</span></Link>)}
          {!selectedItems.length?<div className="empty-state">No hay seguimientos programados.</div>:null}
        </div>
      </article>
    </section>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ProspectFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [service, setService] = useState(searchParams.get('service') ?? '')
  const [temperature, setTemperature] = useState(searchParams.get('temperature') ?? '')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'Activo')

  function applyFilters() {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (service) params.set('service', service)
    if (temperature) params.set('temperature', temperature)
    if (status) params.set('status', status)
    router.push(`/admin/prospectos?${params.toString()}`)
  }

  function clearFilters() {
    setQuery('')
    setService('')
    setTemperature('')
    setStatus('Activo')
    router.push('/admin/prospectos')
  }

  return (
    <section className="filter-bar">
      <label className="search-field">
        <span>Buscar</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o teléfono"
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyFilters()
          }}
        />
      </label>

      <label>
        <span>Servicio</span>
        <select value={service} onChange={(event) => setService(event.target.value)}>
          <option value="">Todos</option>
          <option>Visa americana</option>
          <option>Pasaporte mexicano</option>
          <option>Visa + Pasaporte</option>
          <option>Adelanto de cita</option>
          <option>Visa TN</option>
          <option>Visa TD</option>
          <option>Visa tipo H</option>
          <option>eTA Canadá</option>
          <option>I-94</option>
          <option>Reporte de extravío</option>
        </select>
      </label>

      <label>
        <span>Temperatura</span>
        <select value={temperature} onChange={(event) => setTemperature(event.target.value)}>
          <option value="">Todas</option>
          <option>Caliente</option>
          <option>Seguimiento</option>
          <option>Frío</option>
        </select>
      </label>

      <label>
        <span>Estado</span>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option>
          <option>Activo</option>
          <option>Pausado</option>
          <option>Convertido</option>
          <option>Perdido</option>
        </select>
      </label>

      <div className="filter-actions">
        <button className="secondary-button" onClick={clearFilters}>Limpiar</button>
        <button className="primary-button" onClick={applyFilters}>Aplicar</button>
      </div>
    </section>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'

type ClientOption = {
  id: string
  full_name: string
  phone: string
  city: string | null
  state: string | null
  process_count?: number
}

export default function ClientSearchSelect({
  clients,
  defaultClientId = '',
}: {
  clients: ClientOption[]
  defaultClientId?: string
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(defaultClientId)
  const [open, setOpen] = useState(false)

  const selected = clients.find((client) => client.id === selectedId)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return clients.slice(0, 8)

    return clients
      .filter((client) =>
        `${client.full_name} ${client.phone} ${client.city ?? ''} ${client.state ?? ''}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 10)
  }, [clients, query])

  useEffect(() => {
    if (selected) setQuery(selected.full_name)
  }, [selectedId])

  return (
    <div className="smart-select">
      <input type="hidden" name="client_id" value={selectedId} />

      <input
        value={query}
        placeholder="Nombre, teléfono o ciudad"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setSelectedId('')
          setOpen(true)
        }}
      />

      {open ? (
        <div className="smart-select-menu">
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                setSelectedId(client.id)
                setQuery(client.full_name)
                setOpen(false)
              }}
            >
              <strong>{client.full_name}</strong>
              <small>
                {client.phone} · {client.city ?? 'Sin ciudad'}, {client.state ?? 'Sin estado'}
                {typeof client.process_count === 'number'
                  ? ` · ${client.process_count} trámite(s)`
                  : ''}
              </small>
            </button>
          ))}

          {!filtered.length ? (
            <div className="smart-select-empty">No encontramos clientes.</div>
          ) : null}
        </div>
      ) : null}

      {selected ? (
        <div className="selected-client">
          <strong>{selected.full_name}</strong>
          <span>{selected.phone}</span>
        </div>
      ) : null}
    </div>
  )
}

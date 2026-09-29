'use client'

import { useEffect, useMemo, useState } from 'react'
import PortalShell from '../_components/PortalShell'
import styles from '../portal.module.css'
import { getCorporateDocuments } from '@/lib/corporate-portal/supabase-rest'

function fmt(v?: string) {
  if (!v) return ''
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(v))
}

export default function DocumentosPage() {
  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getCorporateDocuments()
      .then(setItems)
      .catch((e) => setError(e?.message || 'No se pudieron cargar los documentos.'))
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) =>
      [
        item.title,
        item.description,
        item.document_type,
        item.client_name,
        item.service_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [items, query])

  return (
    <PortalShell>
      <div className={styles.content}>
        <div className={styles.pageHeading}>
          <div>
            <span className={styles.sectionEyebrow}>CENTRO DOCUMENTAL</span>
            <h1>Documentos</h1>
            <p>Archivos publicados por Visa Master para los trámites de tu empresa.</p>
          </div>

          <div className={styles.searchBox}>
            <input
              className={styles.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar documento o candidato…"
            />
          </div>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.documentGridV4}>
          {filtered.map((document) => (
            <article className={`${styles.card} ${styles.documentCardV4}`} key={document.id}>
              <div className={styles.documentIconV4}>PDF</div>

              <div className={styles.documentBodyV4}>
                <span className={styles.documentTypeV4}>{document.document_type}</span>
                <h3>{document.title}</h3>
                <p>{document.description || 'Documento publicado por Visa Master.'}</p>

                <div className={styles.documentMetaV4}>
                  <span>{document.client_name}</span>
                  <span>{document.service_name}</span>
                  <span>{fmt(document.created_at)}</span>
                </div>
              </div>

              <a
                className={styles.button}
                href={document.external_url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir documento ↗
              </a>
            </article>
          ))}
        </div>

        {!filtered.length ? (
          <div className={`${styles.card} ${styles.empty}`} style={{ marginTop: 20 }}>
            No hay documentos publicados actualmente.
          </div>
        ) : null}
      </div>
    </PortalShell>
  )
}
